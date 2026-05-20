import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { InMemoryTenantRepository } from "@atlas/core-database";
import { createEvent, InMemoryEventBus } from "@atlas/core-events";
import { Telemetry } from "@atlas/core-observability";
import type { EntityId, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { archiveAsset, assertAssetTenant, registerAsset, updateAsset, type Asset } from "@atlas/module-assets";
import { registerUser } from "@atlas/module-auth";
import {
  assertWorkOrderTenant,
  attachEvidence,
  changeWorkOrderStatus,
  createWorkOrder,
  submitBudget,
  updateChecklistItem,
  uploadEvidence,
  type WorkOrder
} from "@atlas/module-maintenance";
import { createOrganization } from "@atlas/module-organizations";
import {
  addTimelineEntry,
  attachPhotoTitle,
  bindTimelineProjection,
  createBootstrapTimeline,
  InMemoryTimelineRepository,
  type AddTimelineEntryCommand
} from "@atlas/module-timeline";
import {
  classifyRisk,
  draftBudget,
  generateChecklist,
  generateTechnicalReport,
  requestAiTask,
  suggestDiagnosis,
  summarizeTimeline,
  type AiWorkOrderMemory
} from "@atlas/module-ai";
import { decideBudget, requestApproval } from "@atlas/module-workflow";
import {
  createReportVersion,
  decideReportVersion,
  type TechnicalReportVersion
} from "@atlas/module-reports";
import {
  evaluateOperationalAwareness,
  shouldMonitorEvent,
  type HealthScore,
  type OperationalAlert
} from "@atlas/module-monitoring";
import {
  calculateRuntimeDiagnostics,
  executeCognitiveWorkflow,
  generateOperationalForecast,
  generateTemporalAnalytics,
  ingestEventIntoKnowledgeGraph,
  JsonCognitiveWorkflowHistoryRepository,
  JsonDigitalTwinRepository,
  JsonForesightRepository,
  JsonKnowledgeGraphRepository,
  publishCoordinationPerformance,
  replayTimeline,
  simulateOperationalScenarios,
  type ScenarioKind,
  type OperationalDomain,
  type OperationalSpecialist
} from "@atlas/module-operations";

const port = Number(process.env.ATLAS_API_PORT ?? 4000);
const environment = process.env.ATLAS_ENV === "production" ? "production" : "development";

const bus = new InMemoryEventBus();
const telemetry = new Telemetry();
const timeline = new InMemoryTimelineRepository();
const assets = new InMemoryTenantRepository<Asset>();
const workOrders = new InMemoryTenantRepository<WorkOrder>();
const reports = new Map<string, TechnicalReportVersion[]>();
const knowledgeGraph = new JsonKnowledgeGraphRepository();
const digitalTwin = new JsonDigitalTwinRepository();
const cognitiveHistory = new JsonCognitiveWorkflowHistoryRepository();
const foresight = new JsonForesightRepository();
const operationalFeed: unknown[] = [];
const operationalAlerts: OperationalAlert[] = [];
const healthScores = new Map<string, HealthScore>();

bindTimelineProjection(bus, timeline);
bus.subscribeAll((event) => {
  telemetry.increment("events.published");
  telemetry.increment(`events.${event.name}`);
  operationalFeed.unshift(event);
  operationalFeed.splice(200);
});

bus.subscribeAll(async (event) => {
  await ingestEventIntoKnowledgeGraph(event, knowledgeGraph, bus);
});

bus.subscribeAll(async (event) => {
  if (!shouldMonitorEvent(event)) {
    return;
  }

  const organizationId = event.metadata.organizationId;
  const subjectId = event.metadata.subjectId;

  if (!organizationId || !subjectId) {
    return;
  }

  const workOrder = await workOrders.findById(subjectId);
  const subjectType = workOrder ? "work_order" : event.metadata.sourceModule === "assets" ? "asset" : "work_order";
  const entries = await timeline.list({ organizationId, subjectId, limit: 100 });
  const result = await evaluateOperationalAwareness(
    {
      organizationId,
      subjectId,
      subjectType,
      timeline: entries,
      ...(workOrder?.assetId ? { assetId: workOrder.assetId } : {})
    },
    event.context,
    bus
  );

  for (const score of result.healthScores) {
    healthScores.set(`${score.organizationId}:${score.subjectType}:${score.subjectId}`, score);
  }

  for (const alert of result.alerts) {
    const exists = operationalAlerts.some(
      (item) => item.organizationId === alert.organizationId && item.subjectId === alert.subjectId && item.eventName === alert.eventName
    );

    if (!exists) {
      operationalAlerts.unshift(alert);
      operationalAlerts.splice(200);
    }
  }
});

const modules = [
  "auth",
  "organizations",
  "assets",
  "maintenance",
  "construction",
  "workflow",
  "timeline",
  "ai",
  "operations",
  "notifications",
  "monitoring"
] as const;

function context(request: IncomingMessage, organizationId?: OrganizationId): OperationalContext {
  const headerOrganizationId = request.headers["x-organization-id"]?.toString() as OrganizationId | undefined;
  const actorUserId = request.headers["x-user-id"]?.toString() as UserId | undefined;
  const tenant = organizationId ?? headerOrganizationId;

  return {
    requestId: request.headers["x-request-id"]?.toString() ?? crypto.randomUUID(),
    environment,
    ...(tenant ? { organizationId: tenant } : {}),
    ...(tenant && actorUserId
      ? { actor: { userId: actorUserId, organizationId: tenant, roles: ["owner"] } }
      : {})
  };
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
}

function send(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-request-id,x-organization-id,x-user-id"
  });
  response.end(statusCode === 204 ? undefined : JSON.stringify(body, null, 2));
}

function notFound(response: ServerResponse): void {
  send(response, 404, { error: "not_found", message: "Route not found." });
}

function organizationFrom(url: URL, request: IncomingMessage): OrganizationId | null {
  return (url.searchParams.get("organizationId") ?? request.headers["x-organization-id"]?.toString() ?? null) as OrganizationId | null;
}

async function findAssetOrThrow(id: EntityId, organizationId: OrganizationId): Promise<Asset> {
  return assertAssetTenant(await assets.findById(id), organizationId, id);
}

async function findWorkOrderOrThrow(id: EntityId, organizationId: OrganizationId): Promise<WorkOrder> {
  return assertWorkOrderTenant(await workOrders.findById(id), organizationId, id);
}

async function buildAiMemory(workOrderId: EntityId, organizationId: OrganizationId): Promise<AiWorkOrderMemory> {
  const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
  const asset = await findAssetOrThrow(workOrder.assetId, organizationId);
  const entries = await timeline.list({ organizationId, subjectId: workOrder.id, limit: 100 });

  return {
    organizationId,
    subjectId: workOrder.id,
    assetKind: asset.kind,
    assetCriticality: asset.criticality,
    workOrderTitle: workOrder.title,
    ...(workOrder.description ? { workOrderDescription: workOrder.description } : {}),
    priority: workOrder.priority,
    timeline: entries.map((entry) => ({
      title: entry.title,
      eventName: entry.eventName,
      occurredAt: entry.occurredAt,
      ...(entry.body ? { body: entry.body } : {})
    }))
  };
}

async function buildOperationalSnapshot(
  workOrderId: EntityId,
  organizationId: OrganizationId,
  domain: OperationalDomain,
  availableSpecialists?: readonly OperationalSpecialist[]
) {
  const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
  const asset = await findAssetOrThrow(workOrder.assetId, organizationId);
  const entries = await timeline.list({ organizationId, subjectId: workOrder.id, limit: 200 });
  const score = healthScores.get(`${organizationId}:work_order:${workOrder.id}`);
  const alerts = operationalAlerts.filter((alert) => alert.organizationId === organizationId && alert.subjectId === workOrder.id);
  const openChecklist = workOrder.checklist.filter((item) => item.state !== "done").length;

  return {
    organizationId,
    subjectId: workOrder.id,
    domain,
    timeline: entries,
    asset: {
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      criticality: asset.criticality,
      ...(asset.location ? { location: asset.location } : {})
    },
    workOrder: {
      id: workOrder.id,
      title: workOrder.title,
      ...(workOrder.description ? { description: workOrder.description } : {}),
      priority: workOrder.priority,
      state: workOrder.state,
      ...(workOrder.dueAt ? { dueAt: workOrder.dueAt } : {}),
      evidenceCount: workOrder.evidence.length,
      checklistOpenCount: openChecklist,
      ...(workOrder.budget?.state ? { budgetState: workOrder.budget.state } : {})
    },
    ...(score
      ? {
          healthScore: {
            score: score.score,
            grade: score.grade,
            reasons: score.reasons
          }
        }
      : {}),
    alerts: alerts.map((alert) => ({
      eventName: alert.eventName,
      severity: alert.severity,
      title: alert.title
    })),
    ...(availableSpecialists ? { availableSpecialists } : {})
  };
}

function reportKey(organizationId: OrganizationId, workOrderId: EntityId): string {
  return `${organizationId}:${workOrderId}`;
}

function reportVersions(organizationId: OrganizationId, workOrderId: EntityId): TechnicalReportVersion[] {
  return reports.get(reportKey(organizationId, workOrderId)) ?? [];
}

function saveReportVersion(report: TechnicalReportVersion): void {
  const key = reportKey(report.organizationId, report.workOrderId);
  const current = reports.get(key) ?? [];
  const next = current.filter((item) => item.id !== report.id).concat(report);
  reports.set(key, next.sort((a, b) => b.version - a.version));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS") {
      send(response, 204, {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/") {
      send(response, 200, {
        service: "atlas-api",
        ok: true,
        web: "http://localhost:5173",
        health: "/health",
        runtime: {
          dashboard: "/operations/runtime-dashboard?organizationId=org_demo",
          knowledgeGraph: "/operations/knowledge-graph?organizationId=org_demo",
          digitalTwin: "/operations/digital-twin?organizationId=org_demo",
          foresight: "/operations/foresight?organizationId=org_demo"
        },
        note: "Atlas API is running. Open the web cockpit at http://localhost:5173."
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      telemetry.gauge("timeline.entries", (await timeline.list({ organizationId: "org_demo" as OrganizationId })).length);
      send(response, 200, { ok: true, service: "atlas-api", modules, events: bus.published.length });
      return;
    }

    if (request.method === "GET" && url.pathname === "/observability") {
      send(response, 200, { metrics: telemetry.snapshot(), recentLogs: telemetry.logs.slice(-25) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/modules") {
      send(response, 200, { modules });
      return;
    }

    if (request.method === "GET" && url.pathname === "/events") {
      send(response, 200, { events: bus.published });
      return;
    }

    if (request.method === "GET" && url.pathname === "/monitoring/feed") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;
      const events = operationalFeed
        .filter((item) => {
          const event = item as { metadata?: { organizationId?: OrganizationId; subjectId?: EntityId } };
          return organizationId ? event.metadata?.organizationId === organizationId : true;
        })
        .filter((item) => {
          const event = item as { metadata?: { subjectId?: EntityId } };
          return subjectId ? event.metadata?.subjectId === subjectId : true;
        })
        .slice(0, Number(url.searchParams.get("limit") ?? 50));
      send(response, 200, { items: events });
      return;
    }

    if (request.method === "GET" && url.pathname === "/monitoring/alerts") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;
      const items = operationalAlerts
        .filter((alert) => (organizationId ? alert.organizationId === organizationId : true))
        .filter((alert) => (subjectId ? alert.subjectId === subjectId : true));
      send(response, 200, { items });
      return;
    }

    if (request.method === "GET" && url.pathname === "/monitoring/health") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;
      const items = [...healthScores.values()]
        .filter((score) => (organizationId ? score.organizationId === organizationId : true))
        .filter((score) => (subjectId ? score.subjectId === subjectId : true));
      send(response, 200, { items });
      return;
    }

    if (request.method === "POST" && url.pathname === "/organizations") {
      const payload = await readJson<{ name: string; slug: string }>(request);
      const organization = await createOrganization(payload, context(request), bus);
      send(response, 201, { organization });
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/users") {
      const payload = await readJson<Parameters<typeof registerUser>[0]>(request);
      const user = await registerUser(payload, context(request, payload.organizationId), bus);
      send(response, 201, { user: { ...user, passwordHash: undefined } });
      return;
    }

    if (request.method === "POST" && url.pathname === "/assets") {
      const payload = await readJson<Parameters<typeof registerAsset>[0]>(request);
      const asset = await registerAsset(payload, context(request, payload.organizationId), bus);
      await assets.save(asset);
      send(response, 201, { asset });
      return;
    }

    if (request.method === "GET" && url.pathname === "/assets") {
      const organizationId = url.searchParams.get("organizationId") as OrganizationId | null;
      const page = organizationId ? await assets.listByOrganization(organizationId) : await assets.list();
      send(response, 200, page);
      return;
    }

    const assetMatch = url.pathname.match(/^\/assets\/([^/]+)$/);
    if (assetMatch) {
      const assetId = assetMatch[1] as EntityId;
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      if (request.method === "GET") {
        send(response, 200, { asset: await findAssetOrThrow(assetId, organizationId) });
        return;
      }

      if (request.method === "PATCH") {
        const payload = await readJson<Parameters<typeof updateAsset>[1]>(request);
        const asset = await findAssetOrThrow(assetId, organizationId);
        const updated = await updateAsset(asset, payload, context(request, organizationId), bus);
        await assets.save(updated);
        send(response, 200, { asset: updated });
        return;
      }

      if (request.method === "DELETE") {
        const asset = await findAssetOrThrow(assetId, organizationId);
        const archived = await archiveAsset(asset, context(request, organizationId), bus);
        await assets.save(archived);
        send(response, 200, { asset: archived });
        return;
      }
    }

    if (request.method === "POST" && url.pathname === "/maintenance/work-orders") {
      const payload = await readJson<Parameters<typeof createWorkOrder>[0]>(request);
      const workOrder = await createWorkOrder(payload, context(request, payload.organizationId), bus);
      await workOrders.save(workOrder);
      send(response, 201, { workOrder, timeline: await timeline.list({ organizationId: workOrder.organizationId, subjectId: workOrder.id }) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/maintenance/work-orders") {
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, await workOrders.listByOrganization(organizationId));
      return;
    }

    const workOrderMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)$/);
    if (workOrderMatch) {
      const workOrderId = workOrderMatch[1] as EntityId;
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      if (request.method === "GET") {
        const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
        send(response, 200, {
          workOrder,
          timeline: await timeline.list({ organizationId, subjectId: workOrder.id })
        });
        return;
      }
    }

    const statusMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/status$/);
    if (request.method === "PATCH" && statusMatch) {
      const payload = await readJson<{ organizationId: OrganizationId; state: WorkOrder["state"]; reason?: string }>(request);
      const workOrderId = statusMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await changeWorkOrderStatus(workOrder, payload, context(request, payload.organizationId), bus);
      await workOrders.save(updated);
      send(response, 200, { workOrder: updated, timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id }) });
      return;
    }

    const evidenceMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/evidence$/);
    if (request.method === "GET" && evidenceMatch) {
      const organizationId = organizationFrom(url, request);
      const workOrderId = evidenceMatch[1] as EntityId;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
      send(response, 200, { items: workOrder.evidence });
      return;
    }

    if (request.method === "POST" && evidenceMatch) {
      const payload = await readJson<Parameters<typeof attachEvidence>[1] & { organizationId: OrganizationId }>(request);
      const workOrderId = evidenceMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await attachEvidence(workOrder, payload, context(request, payload.organizationId), bus);
      await workOrders.save(updated);
      send(response, 201, { workOrder: updated, timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id }) });
      return;
    }

    const evidenceUploadMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/evidence\/upload$/);
    if (request.method === "POST" && evidenceUploadMatch) {
      const payload = await readJson<Parameters<typeof uploadEvidence>[1] & { organizationId: OrganizationId }>(request);
      const workOrderId = evidenceUploadMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await uploadEvidence(workOrder, payload, context(request, payload.organizationId), bus);
      await workOrders.save(updated);
      send(response, 201, {
        evidence: updated.evidence[updated.evidence.length - 1],
        gallery: updated.evidence,
        timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id })
      });
      return;
    }

    const checklistMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/checklist\/([^/]+)$/);
    if (request.method === "PATCH" && checklistMatch) {
      const payload = await readJson<{ organizationId: OrganizationId; state: "open" | "done" | "blocked"; actorId?: UserId }>(request);
      const workOrderId = checklistMatch[1] as EntityId;
      const itemId = checklistMatch[2] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await updateChecklistItem(
        workOrder,
        { itemId, state: payload.state, ...(payload.actorId ? { actorId: payload.actorId } : {}) },
        context(request, payload.organizationId),
        bus
      );
      await workOrders.save(updated);
      send(response, 200, { workOrder: updated, timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id }) });
      return;
    }

    const commentsMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/comments$/);
    if (request.method === "POST" && commentsMatch) {
      const payload = await readJson<{ organizationId: OrganizationId; actorId?: UserId; comment: string }>(request);
      const workOrderId = commentsMatch[1] as EntityId;
      await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      await bus.publish(
        createEvent(
          "CommentAdded",
          {
            workOrderId,
            organizationId: payload.organizationId,
            subjectId: workOrderId,
            title: "Comentario adicionado",
            body: payload.comment,
            kind: "comment"
          },
          context(request, payload.organizationId),
          {
            organizationId: payload.organizationId,
            subjectId: workOrderId,
            sourceModule: "timeline",
            ...(payload.actorId ? { actorId: payload.actorId } : {})
          }
        )
      );
      send(response, 201, { timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
      return;
    }

    const budgetMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/budget$/);
    if (request.method === "POST" && budgetMatch) {
      const payload = await readJson<Parameters<typeof submitBudget>[1] & { organizationId: OrganizationId }>(request);
      const workOrderId = budgetMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await submitBudget(workOrder, payload, context(request, payload.organizationId), bus);
      await workOrders.save(updated);
      send(response, 201, { workOrder: updated, timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id }) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/timeline/entries") {
      const payload = await readJson<AddTimelineEntryCommand>(request);
      const entry = await addTimelineEntry(payload, context(request, payload.organizationId), bus, timeline);
      telemetry.increment("timeline.entries.recorded");
      send(response, 201, { entry });
      return;
    }

    if (request.method === "GET" && url.pathname === "/timeline") {
      const organizationId = url.searchParams.get("organizationId") as OrganizationId | null;
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, {
        items: await timeline.list({
          organizationId,
          ...(subjectId ? { subjectId } : {}),
          limit: Number(url.searchParams.get("limit") ?? 100)
        })
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/timeline/demo") {
      const payload = await readJson<{ organizationId: OrganizationId; subjectId: EntityId; actorId: UserId }>(request);
      for (const entry of createBootstrapTimeline(payload.organizationId, payload.subjectId, payload.actorId, context(request, payload.organizationId))) {
        await timeline.append(entry);
      }
      send(response, 201, { items: await timeline.list({ organizationId: payload.organizationId, subjectId: payload.subjectId }) });
      return;
    }

    const photoMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/photos$/);
    if (request.method === "POST" && photoMatch) {
      const payload = await readJson<{ organizationId: OrganizationId; actorId?: UserId; fileName: string; url?: string }>(request);
      const subjectId = photoMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(subjectId, payload.organizationId);
      const updated = await attachEvidence(
        workOrder,
        {
          title: attachPhotoTitle(payload.fileName),
          kind: "photo",
          ...(payload.actorId ? { actorId: payload.actorId } : {}),
          ...(payload.url ? { url: payload.url } : {})
        },
        context(request, payload.organizationId),
        bus
      );
      await workOrders.save(updated);
      send(response, 201, { workOrder: updated, timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id }) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/ai/suggestions") {
      const payload = await readJson<{ organizationId: OrganizationId; subjectId: EntityId; suggestion: string }>(request);
      await findWorkOrderOrThrow(payload.subjectId, payload.organizationId);
      const task = await requestAiTask(
        { organizationId: payload.organizationId, subjectId: payload.subjectId, kind: "recommend", input: payload.suggestion },
        context(request, payload.organizationId),
        bus
      );
      send(response, 201, { task, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: payload.subjectId }) });
      return;
    }

    const aiWorkOrderMatch = url.pathname.match(/^\/ai\/work-orders\/([^/]+)\/([^/]+)$/);
    if (request.method === "POST" && aiWorkOrderMatch) {
      const workOrderId = aiWorkOrderMatch[1] as EntityId;
      const action = aiWorkOrderMatch[2];
      const payload = await readJson<{ organizationId: OrganizationId }>(request);
      const memory = await buildAiMemory(workOrderId, payload.organizationId);
      const ctx = context(request, payload.organizationId);

      if (action === "diagnosis") {
        const diagnosis = await suggestDiagnosis(memory, ctx, bus);
        send(response, 201, { diagnosis, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
        return;
      }

      if (action === "checklist") {
        const checklist = await generateChecklist(memory, ctx, bus);
        send(response, 201, { checklist, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
        return;
      }

      if (action === "risk") {
        const risk = await classifyRisk(memory, ctx, bus);
        send(response, 201, { risk, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
        return;
      }

      if (action === "budget-draft") {
        const budgetDraft = await draftBudget(memory, ctx, bus);
        send(response, 201, { budgetDraft, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
        return;
      }

      if (action === "summary") {
        const summary = await summarizeTimeline(memory, ctx, bus);
        send(response, 201, { summary, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
        return;
      }

      if (action === "report") {
        const report = await generateTechnicalReport(memory, ctx, bus);
        send(response, 201, { report, timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }) });
        return;
      }
    }

    const reportCollectionMatch = url.pathname.match(/^\/reports\/work-orders\/([^/]+)$/);
    if (reportCollectionMatch) {
      const workOrderId = reportCollectionMatch[1] as EntityId;
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      if (request.method === "GET") {
        await findWorkOrderOrThrow(workOrderId, organizationId);
        send(response, 200, { items: reportVersions(organizationId, workOrderId) });
        return;
      }

      if (request.method === "POST") {
        const payload = await readJson<{ createdBy?: UserId }>(request);
        const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
        const entries = await timeline.list({ organizationId, subjectId: workOrderId, limit: 500 });
        const version = reportVersions(organizationId, workOrderId).length + 1;
        const report = await createReportVersion(
          {
            organizationId,
            workOrderId,
            workOrderTitle: workOrder.title,
            timeline: entries.map((entry) => ({
              occurredAt: entry.occurredAt,
              title: entry.title,
              eventName: entry.eventName,
              sourceModule: entry.sourceModule,
              ...(entry.body ? { body: entry.body } : {})
            })),
            version,
            ...(payload.createdBy ? { createdBy: payload.createdBy } : {})
          },
          context(request, organizationId),
          bus
        );
        saveReportVersion(report);
        send(response, 201, { report, timeline: await timeline.list({ organizationId, subjectId: workOrderId }) });
        return;
      }
    }

    const reportItemMatch = url.pathname.match(/^\/reports\/work-orders\/([^/]+)\/versions\/([^/]+)(?:\/([^/]+))?$/);
    if (reportItemMatch) {
      const workOrderId = reportItemMatch[1] as EntityId;
      const reportId = reportItemMatch[2] as EntityId;
      const action = reportItemMatch[3];
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      const report = reportVersions(organizationId, workOrderId).find((item) => item.id === reportId);

      if (!report) {
        send(response, 404, { error: "report_not_found", message: "Report version not found." });
        return;
      }

      if (request.method === "GET" && action === "html") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(report.html);
        return;
      }

      if (request.method === "GET" && action === "pdf") {
        send(response, 200, { reportId: report.id, pdfBase64: report.pdfBase64 });
        return;
      }

      if (request.method === "POST" && action === "decision") {
        const payload = await readJson<{ decidedBy: UserId; decision: "approved" | "rejected"; notes?: string }>(request);
        const decided = await decideReportVersion(report, payload, context(request, organizationId), bus);
        saveReportVersion(decided);
        send(response, 200, { report: decided, timeline: await timeline.list({ organizationId, subjectId: workOrderId }) });
        return;
      }
    }

    if (request.method === "POST" && url.pathname === "/workflow/approvals") {
      const payload = await readJson<{ organizationId: OrganizationId; subjectId: EntityId; requestedBy: UserId; decision?: "approved" | "rejected" }>(request);
      const workOrder = await findWorkOrderOrThrow(payload.subjectId, payload.organizationId);
      const approval =
        payload.decision
          ? await decideBudget(
              {
                organizationId: payload.organizationId,
                subjectId: payload.subjectId,
                decidedBy: payload.requestedBy,
                decision: payload.decision
              },
              context(request, payload.organizationId),
              bus
            )
          : await requestApproval(
              { organizationId: payload.organizationId, subjectId: payload.subjectId, requestedBy: payload.requestedBy },
              context(request, payload.organizationId),
              bus
            );
      const updated =
        payload.decision === "approved"
          ? await changeWorkOrderStatus(workOrder, { state: "approved" }, context(request, payload.organizationId), bus)
          : payload.decision === "rejected"
            ? await changeWorkOrderStatus(workOrder, { state: "rejected" }, context(request, payload.organizationId), bus)
            : workOrder;

      await workOrders.save(updated);
      send(response, 201, {
        approval,
        workOrder: updated,
        timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: payload.subjectId })
      });
      return;
    }

    const operationalRuntimeMatch = url.pathname.match(/^\/operations\/work-orders\/([^/]+)\/coordinate$/);
    if (request.method === "POST" && operationalRuntimeMatch) {
      const workOrderId = operationalRuntimeMatch[1] as EntityId;
      const payload = await readJson<{
        organizationId: OrganizationId;
        actorId?: UserId;
        domain?: OperationalDomain;
        specialists?: readonly OperationalSpecialist[];
      }>(request);
      const ctx = context(request, payload.organizationId);
      const snapshot = await buildOperationalSnapshot(
        workOrderId,
        payload.organizationId,
        payload.domain ?? "maintenance",
        payload.specialists
      );
      const startedAt = Date.now();
      const run = await executeCognitiveWorkflow(
        snapshot,
        {
          ...(payload.actorId ? { actorId: payload.actorId } : {}),
          roles: ctx.actor?.roles ?? ["operator"],
          canCoordinate: true,
          canRequestHumanDecision: true
        },
        ctx,
        bus,
        knowledgeGraph,
        digitalTwin,
        cognitiveHistory
      );
      telemetry.increment("runtime.coordinations");
      telemetry.increment(`runtime.risk.${run.riskLevel}`);
      if (run.escalationSuggested) {
        telemetry.increment("runtime.escalations");
      }
      if (run.decisionBoundary === "human_required") {
        telemetry.increment("runtime.human_decisions_requested");
      }
      await publishCoordinationPerformance(snapshot, ctx, bus, Date.now() - startedAt, { workflowRunId: run.id });

      send(response, 201, {
        run,
        timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }),
        knowledgeGraph: await knowledgeGraph.list(payload.organizationId, workOrderId),
        digitalTwin: await digitalTwin.list(payload.organizationId, workOrderId)
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/operations/runtime-dashboard") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      const history = await cognitiveHistory.list(organizationId, subjectId ?? undefined);
      const twins = await digitalTwin.list(organizationId, subjectId ?? undefined);
      const relations = await knowledgeGraph.list(organizationId, subjectId ?? undefined);
      const forecasts = await foresight.listForecasts(organizationId, subjectId ?? undefined);
      const scenarios = await foresight.listScenarios(organizationId, subjectId ?? undefined);
      const simulations = await foresight.listSimulations(organizationId, subjectId ?? undefined);
      const comparisons = await foresight.listComparisons(organizationId, subjectId ?? undefined);
      const temporalAnalytics = await foresight.listAnalytics(organizationId, subjectId ?? undefined);
      const diagnostics = calculateRuntimeDiagnostics(organizationId, history, twins);
      telemetry.gauge("runtime.coordinations.total", diagnostics.metrics.totalCoordinations);
      telemetry.gauge("runtime.risk.average", diagnostics.metrics.averageRiskScore);
      telemetry.gauge("runtime.human_decisions.pending", diagnostics.metrics.pendingHumanDecisions);
      send(response, 200, {
        feed: operationalFeed
          .filter((item) => {
            const event = item as { metadata?: { organizationId?: OrganizationId; subjectId?: EntityId } };
            return event.metadata?.organizationId === organizationId && (subjectId ? event.metadata.subjectId === subjectId : true);
          })
          .slice(0, 40),
        activeCoordinations: history.slice(0, 10),
        pendingHumanDecisions: history.filter((record) => record.humanDecisionRequested).slice(0, 10),
        risks: history.flatMap((record) => record.predictiveRisks).slice(0, 20),
        healthScores: [...healthScores.values()].filter((score) => score.organizationId === organizationId && (subjectId ? score.subjectId === subjectId : true)),
        digitalTwin: twins,
        knowledgeGraph: relations,
        forecasts,
        scenarios,
        simulations,
        comparisons,
        temporalAnalytics,
        diagnostics
      });
      return;
    }

    const forecastMatch = url.pathname.match(/^\/operations\/work-orders\/([^/]+)\/forecast$/);
    if (request.method === "POST" && forecastMatch) {
      const workOrderId = forecastMatch[1] as EntityId;
      const payload = await readJson<{ organizationId: OrganizationId; domain?: OperationalDomain }>(request);
      const snapshot = await buildOperationalSnapshot(workOrderId, payload.organizationId, payload.domain ?? "maintenance");
      const forecast = await generateOperationalForecast(
        snapshot,
        await knowledgeGraph.list(payload.organizationId, workOrderId),
        await digitalTwin.list(payload.organizationId, workOrderId),
        await cognitiveHistory.list(payload.organizationId, workOrderId),
        foresight,
        context(request, payload.organizationId),
        bus
      );
      send(response, 201, {
        forecast,
        timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId }),
        approvalGate: forecast.approvalGate
      });
      return;
    }

    const simulationMatch = url.pathname.match(/^\/operations\/work-orders\/([^/]+)\/simulate$/);
    if (request.method === "POST" && simulationMatch) {
      const workOrderId = simulationMatch[1] as EntityId;
      const payload = await readJson<{ organizationId: OrganizationId; domain?: OperationalDomain; scenarios?: readonly ScenarioKind[] }>(request);
      const snapshot = await buildOperationalSnapshot(workOrderId, payload.organizationId, payload.domain ?? "maintenance");
      const latestForecast = (await foresight.listForecasts(payload.organizationId, workOrderId))[0];
      const comparison = await simulateOperationalScenarios(
        snapshot,
        payload.scenarios ?? ["delay", "continue_operating", "sla_missed", "specialist_changed", "missing_evidence"],
        latestForecast,
        foresight,
        context(request, payload.organizationId),
        bus
      );
      send(response, 201, {
        comparison,
        scenarios: await foresight.listScenarios(payload.organizationId, workOrderId),
        simulations: await foresight.listSimulations(payload.organizationId, workOrderId),
        timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId })
      });
      return;
    }

    const analyticsMatch = url.pathname.match(/^\/operations\/work-orders\/([^/]+)\/temporal-analytics$/);
    if (request.method === "POST" && analyticsMatch) {
      const workOrderId = analyticsMatch[1] as EntityId;
      const payload = await readJson<{ organizationId: OrganizationId; domain?: OperationalDomain }>(request);
      const snapshot = await buildOperationalSnapshot(workOrderId, payload.organizationId, payload.domain ?? "maintenance");
      const analytics = await generateTemporalAnalytics(
        snapshot,
        await cognitiveHistory.list(payload.organizationId, workOrderId),
        digitalTwin.snapshots ? await digitalTwin.snapshots(payload.organizationId, workOrderId) : await digitalTwin.list(payload.organizationId, workOrderId),
        foresight,
        context(request, payload.organizationId),
        bus
      );
      send(response, 201, {
        analytics,
        timeline: await timeline.list({ organizationId: payload.organizationId, subjectId: workOrderId })
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/operations/foresight") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, {
        forecasts: await foresight.listForecasts(organizationId, subjectId ?? undefined),
        scenarios: await foresight.listScenarios(organizationId, subjectId ?? undefined),
        simulations: await foresight.listSimulations(organizationId, subjectId ?? undefined),
        comparisons: await foresight.listComparisons(organizationId, subjectId ?? undefined),
        temporalAnalytics: await foresight.listAnalytics(organizationId, subjectId ?? undefined)
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/operations/knowledge-graph") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, {
        nodes: knowledgeGraph.listNodes ? await knowledgeGraph.listNodes(organizationId) : [],
        relations: await knowledgeGraph.list(organizationId, subjectId ?? undefined),
        versions: knowledgeGraph.listVersions ? await knowledgeGraph.listVersions(organizationId) : [],
        causalities: knowledgeGraph.listCausalities ? await knowledgeGraph.listCausalities(organizationId, subjectId ?? undefined) : []
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/operations/digital-twin") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, {
        live: await digitalTwin.list(organizationId, subjectId ?? undefined),
        snapshots: digitalTwin.snapshots ? await digitalTwin.snapshots(organizationId, subjectId ?? undefined) : []
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/operations/coordination-history") {
      const organizationId = organizationFrom(url, request);
      const subjectId = url.searchParams.get("subjectId") as EntityId | null;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, { items: await cognitiveHistory.list(organizationId, subjectId ?? undefined) });
      return;
    }

    const replayMatch = url.pathname.match(/^\/operations\/timeline\/([^/]+)\/replay$/);
    if (request.method === "POST" && replayMatch) {
      const subjectId = replayMatch[1] as EntityId;
      const payload = await readJson<{ organizationId: OrganizationId; limit?: number }>(request);
      const entries = await timeline.list({ organizationId: payload.organizationId, subjectId, limit: payload.limit ?? 500 });
      const reconstructed = await replayTimeline(payload.organizationId, subjectId, entries, context(request, payload.organizationId), bus);
      send(response, 201, {
        reconstructed,
        timeline: await timeline.list({ organizationId: payload.organizationId, subjectId })
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/dashboard") {
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      const organizationAssets = (await assets.listByOrganization(organizationId, { limit: 500 })).items;
      const organizationWorkOrders = (await workOrders.listByOrganization(organizationId, { limit: 500 })).items;
      const timelineItems = await timeline.list({ organizationId, limit: 10 });
      const workOrdersByState = organizationWorkOrders.reduce<Record<string, number>>((acc, item) => {
        acc[item.state] = (acc[item.state] ?? 0) + 1;
        return acc;
      }, {});
      const assetsByCriticality = organizationAssets.reduce<Record<string, number>>((acc, item) => {
        acc[item.criticality] = (acc[item.criticality] ?? 0) + 1;
        return acc;
      }, {});

      send(response, 200, {
        organizationId,
        totals: {
          assets: organizationAssets.length,
          activeAssets: organizationAssets.filter((asset) => asset.status === "active").length,
          workOrders: organizationWorkOrders.length,
          openWorkOrders: organizationWorkOrders.filter((workOrder) => workOrder.status === "active").length
        },
        workOrdersByState,
        assetsByCriticality,
        recentTimeline: timelineItems
      });
      return;
    }

    notFound(response);
  } catch (error) {
    telemetry.log("error", "request_failed", undefined, { error: error instanceof Error ? error.message : error });
    send(response, 500, {
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unexpected error."
    });
  }
});

server.listen(port, () => {
  console.log(`Atlas API listening on http://localhost:${port}`);
});
