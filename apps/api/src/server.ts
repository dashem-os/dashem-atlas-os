import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { InMemoryTenantRepository } from "@atlas/core-database";
import { InMemoryEventBus } from "@atlas/core-events";
import { Telemetry } from "@atlas/core-observability";
import type { EntityId, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { registerAsset, type Asset } from "@atlas/module-assets";
import { registerUser } from "@atlas/module-auth";
import { createWorkOrder, type WorkOrder } from "@atlas/module-maintenance";
import { createOrganization } from "@atlas/module-organizations";
import {
  addTimelineEntry,
  attachPhotoTitle,
  bindTimelineProjection,
  createBootstrapTimeline,
  InMemoryTimelineRepository,
  type AddTimelineEntryCommand
} from "@atlas/module-timeline";
import { requestAiTask } from "@atlas/module-ai";
import { requestApproval } from "@atlas/module-workflow";

const port = Number(process.env.ATLAS_API_PORT ?? 4000);
const environment = process.env.ATLAS_ENV === "production" ? "production" : "development";

const bus = new InMemoryEventBus();
const telemetry = new Telemetry();
const timeline = new InMemoryTimelineRepository();
const assets = new InMemoryTenantRepository<Asset>();
const workOrders = new InMemoryTenantRepository<WorkOrder>();

bindTimelineProjection(bus, timeline);
bus.subscribeAll((event) => {
  telemetry.increment("events.published");
  telemetry.increment(`events.${event.name}`);
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
  "notifications"
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

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS") {
      send(response, 204, {});
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

    if (request.method === "POST" && url.pathname === "/maintenance/work-orders") {
      const payload = await readJson<Parameters<typeof createWorkOrder>[0]>(request);
      const workOrder = await createWorkOrder(payload, context(request, payload.organizationId), bus);
      await workOrders.save(workOrder);
      send(response, 201, { workOrder, timeline: await timeline.list({ organizationId: workOrder.organizationId, subjectId: workOrder.id }) });
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
      const entry = await addTimelineEntry(
        {
          organizationId: payload.organizationId,
          subjectId,
          sourceModule: "maintenance",
          kind: "attachment",
          title: attachPhotoTitle(payload.fileName),
          metadata: { fileName: payload.fileName, url: payload.url },
          ...(payload.actorId ? { actorId: payload.actorId } : {}),
          ...(payload.url ? { body: payload.url } : {})
        },
        context(request, payload.organizationId),
        bus,
        timeline
      );
      send(response, 201, { entry });
      return;
    }

    if (request.method === "POST" && url.pathname === "/ai/suggestions") {
      const payload = await readJson<{ organizationId: OrganizationId; subjectId: EntityId; suggestion: string }>(request);
      const task = await requestAiTask(
        { organizationId: payload.organizationId, kind: "recommend", input: payload.suggestion },
        context(request, payload.organizationId),
        bus
      );
      const entry = await addTimelineEntry(
        {
          organizationId: payload.organizationId,
          subjectId: payload.subjectId,
          sourceModule: "ai",
          kind: "ai_suggestion",
          title: "IA sugeriu intervencao",
          body: payload.suggestion,
          metadata: { taskId: task.id }
        },
        context(request, payload.organizationId),
        bus,
        timeline
      );
      send(response, 201, { task, entry });
      return;
    }

    if (request.method === "POST" && url.pathname === "/workflow/approvals") {
      const payload = await readJson<{ organizationId: OrganizationId; subjectId: EntityId; requestedBy: UserId; decision?: "approved" | "rejected" }>(request);
      const approval = await requestApproval(
        { organizationId: payload.organizationId, subjectId: payload.subjectId, requestedBy: payload.requestedBy },
        context(request, payload.organizationId),
        bus
      );
      const entry = await addTimelineEntry(
        {
          organizationId: payload.organizationId,
          subjectId: payload.subjectId,
          actorId: payload.requestedBy,
          sourceModule: "workflow",
          kind: "approval",
          title: payload.decision === "rejected" ? "Gestor recusou orcamento" : "Gestor aprovou orcamento",
          metadata: { approvalId: approval.id, decision: payload.decision ?? "approved" }
        },
        context(request, payload.organizationId),
        bus,
        timeline
      );
      send(response, 201, { approval, entry });
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
