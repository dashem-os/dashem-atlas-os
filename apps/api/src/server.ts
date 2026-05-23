import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Pool, type QueryResultRow } from "pg";
import { InMemoryTenantRepository } from "@atlas/core-database";
import { createEvent, InMemoryEventBus } from "@atlas/core-events";
import { Telemetry } from "@atlas/core-observability";
import { createId, systemClock, type EntityId, type ISODateTime, type OperationalContext, type OrganizationId, type UserId } from "@atlas/core-shared";
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
import { createOrganization, type Organization } from "@atlas/module-organizations";
import {
  addTimelineEntry,
  attachPhotoTitle,
  bindTimelineProjection,
  createBootstrapTimeline,
  type TimelineEntry,
  type TimelineRepository,
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

const localPostgresUrl = "postgresql://atlas:atlas_dev@localhost:55432/atlas_os";
const configuredDatabaseUrl = process.env.DATABASE_URL ?? process.env.ATLAS_DATABASE_URL;
const databaseUrl = configuredDatabaseUrl?.startsWith("postgres") ? configuredDatabaseUrl : localPostgresUrl;
const pgPool = new Pool({ connectionString: databaseUrl });

function json<T>(value: T): string {
  return JSON.stringify(value);
}

function fromJson<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function migratePostgres(): Promise<void> {
  await pgPool.query(`
    alter table organizations add column if not exists type text;
    alter table organizations add column if not exists monthly_contract_value numeric;
    alter table organizations add column if not exists target_sla numeric;
    alter table organizations add column if not exists data jsonb not null default '{}'::jsonb;

    create table if not exists atlas_tenants (
      id text primary key,
      code text not null unique,
      name text not null,
      product_line text not null,
      plan text not null,
      status text not null,
      owner_name text,
      owner_email text,
      access_scope text not null,
      created_at timestamptz not null,
      updated_at timestamptz not null,
      slug text,
      permissions jsonb not null default '[]'::jsonb,
      allowed_apps jsonb not null default '[]'::jsonb,
      data jsonb not null default '{}'::jsonb
    );

    alter table atlas_tenants add column if not exists slug text;
    alter table atlas_tenants add column if not exists permissions jsonb not null default '[]'::jsonb;
    alter table atlas_tenants add column if not exists allowed_apps jsonb not null default '[]'::jsonb;

    create unique index if not exists atlas_tenants_slug_idx
      on atlas_tenants (slug)
      where slug is not null;

    create table if not exists atlas_access_grants (
      id text primary key,
      tenant_id text not null references atlas_tenants(id),
      tenant_code text not null,
      name text not null,
      email text not null,
      role text not null,
      status text not null,
      permissions jsonb not null default '[]'::jsonb,
      created_at timestamptz not null,
      updated_at timestamptz not null,
      last_login_at timestamptz,
      data jsonb not null default '{}'::jsonb
    );

    create index if not exists atlas_access_grants_tenant_idx
      on atlas_access_grants (tenant_id);

    create unique index if not exists atlas_access_grants_email_tenant_idx
      on atlas_access_grants (tenant_id, email);

    alter table assets add column if not exists data jsonb not null default '{}'::jsonb;

    alter table work_orders add column if not exists technician_name text;
    alter table work_orders add column if not exists diagnosis text;
    alter table work_orders add column if not exists materials jsonb not null default '[]'::jsonb;
    alter table work_orders add column if not exists labor_hours numeric;
    alter table work_orders add column if not exists labor_rate numeric;
    alter table work_orders add column if not exists labor_cost numeric;
    alter table work_orders add column if not exists estimated_duration_hours numeric;
    alter table work_orders add column if not exists checklist jsonb not null default '[]'::jsonb;
    alter table work_orders add column if not exists evidence jsonb not null default '[]'::jsonb;
    alter table work_orders add column if not exists sequence_number text;
    alter table work_orders add column if not exists data jsonb not null default '{}'::jsonb;

    create table if not exists field_appointments (
      id text primary key,
      organization_id text not null references organizations(id),
      title text not null,
      scheduled_at timestamptz not null,
      duration_minutes integer not null,
      status text not null,
      kind text not null,
      technician_name text,
      customer_name text,
      location text,
      work_order_id text,
      notes text,
      reminder_enabled boolean not null default false,
      reminder_minutes_before integer,
      reminder_at timestamptz,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );

    create index if not exists field_appointments_org_date_idx
      on field_appointments (organization_id, scheduled_at);

    drop table if exists field_profile cascade;

    insert into atlas_tenants (id, code, name, product_line, plan, status, owner_name, owner_email, access_scope, created_at, updated_at, data)
    values
      ('tn_field_00', '#00', 'Field #00', 'field', 'field_solo', 'active', 'Marcelo Atlas', 'marcelo@dashem.com', 'tenant', now(), now(), '{"kind":"test_field_tenant","seed_personal_data_removed":true}'::jsonb)
    on conflict (code) do update set
      name = excluded.name,
      owner_name = excluded.owner_name,
      owner_email = excluded.owner_email,
      slug = coalesce(atlas_tenants.slug, 'field-00'),
      permissions = case when atlas_tenants.permissions = '[]'::jsonb then '["field:access","field:work_orders","field:customers","field:assets","field:appointments","ai:invoke"]'::jsonb else atlas_tenants.permissions end,
      allowed_apps = case when atlas_tenants.allowed_apps = '[]'::jsonb then '["field"]'::jsonb else atlas_tenants.allowed_apps end;

    insert into atlas_access_grants (id, tenant_id, tenant_code, name, email, role, status, permissions, created_at, updated_at)
    values (
      'ag_field_00_marcelo',
      'tn_field_00',
      '#00',
      'Marcelo Atlas',
      'marcelo@dashem.com',
      'technician',
      'active',
      '["field:access","field:work_orders","field:customers","field:assets","field:appointments","ai:invoke"]'::jsonb,
      now(),
      now()
    )
    on conflict (id) do update set
      name = excluded.name,
      email = excluded.email,
      role = excluded.role,
      status = excluded.status;

    delete from atlas_access_grants where tenant_id = 'tn_owner_dashem' or tenant_code = 'OWNER';
    delete from atlas_tenants where id = 'tn_owner_dashem' or code = 'OWNER' or product_line = 'owner';
  `);
}

class PostgresTimelineRepository implements TimelineRepository {
  constructor(private readonly pool: Pool) {}

  async append(entry: TimelineEntry): Promise<TimelineEntry> {
    await this.pool.query(
      `insert into timeline_entries (id, organization_id, subject_id, occurred_at, actor_id, source_module, event_name, kind, title, body, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do nothing`,
      [
        entry.id,
        entry.organizationId,
        entry.subjectId,
        entry.occurredAt,
        entry.actorId ?? null,
        entry.sourceModule,
        entry.eventName,
        entry.kind,
        entry.title,
        entry.body ?? null,
        json(entry.metadata)
      ]
    );
    return entry;
  }

  async list(query: { organizationId: OrganizationId; subjectId?: EntityId; limit?: number }): Promise<readonly TimelineEntry[]> {
    const values: unknown[] = [query.organizationId];
    let where = "organization_id = $1";
    if (query.subjectId) {
      values.push(query.subjectId);
      where += ` and subject_id = $${values.length}`;
    }
    values.push(query.limit ?? 100);
    const result = await this.pool.query(
      `select * from timeline_entries where ${where} order by occurred_at desc limit $${values.length}`,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      subjectId: row.subject_id,
      occurredAt: new Date(row.occurred_at).toISOString() as ISODateTime,
      sourceModule: row.source_module,
      eventName: row.event_name,
      kind: row.kind,
      title: row.title,
      metadata: fromJson<Record<string, unknown>>(row.metadata ?? {}),
      ...(row.actor_id ? { actorId: row.actor_id } : {}),
      ...(row.body ? { body: row.body } : {})
    }));
  }
}

const port = Number(process.env.ATLAS_API_PORT ?? 4000);
const environment = process.env.ATLAS_ENV === "production" ? "production" : "development";

const bus = new InMemoryEventBus();
const telemetry = new Telemetry();
const timeline = new PostgresTimelineRepository(pgPool);
const assets = new InMemoryTenantRepository<Asset>();
const workOrders = new InMemoryTenantRepository<WorkOrder>();
const organizations = new Map<OrganizationId, Organization>();
const reports = new Map<string, TechnicalReportVersion[]>();
type TenantProductLine = "field" | "enterprise";
interface AtlasTenant {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly productLine: TenantProductLine;
  readonly plan: string;
  readonly status: "active" | "trial" | "suspended" | "archived";
  readonly ownerName?: string;
  readonly ownerEmail?: string;
  readonly accessScope: "global" | "tenant";
  readonly slug?: string;
  readonly permissions: readonly string[];
  readonly allowedApps: readonly string[];
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly data: Record<string, unknown>;
}
interface AtlasAccessGrant {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantCode: string;
  readonly name: string;
  readonly email: string;
  readonly role: "owner" | "admin" | "manager" | "technician" | "viewer";
  readonly status: "invited" | "active" | "suspended";
  readonly permissions: readonly string[];
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly lastLoginAt?: ISODateTime;
  readonly data: Record<string, unknown>;
}
type AppointmentStatus = "scheduled" | "done" | "cancelled";
interface FieldAppointment {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly title: string;
  readonly scheduledAt: ISODateTime;
  readonly durationMinutes: number;
  readonly status: AppointmentStatus;
  readonly kind: "visit" | "call" | "follow_up" | "administrative";
  readonly technicianName?: string;
  readonly customerName?: string;
  readonly location?: string;
  readonly workOrderId?: EntityId;
  readonly notes?: string;
  readonly reminderEnabled: boolean;
  readonly reminderMinutesBefore?: number;
  readonly reminderAt?: ISODateTime;
  readonly pinned?: boolean;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}
const appointments = new Map<EntityId, FieldAppointment>();
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
  await pgPool.query(
    `insert into event_store (id, organization_id, name, occurred_at, payload, context)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (id) do nothing`,
    [
      event.id,
      event.metadata.organizationId ?? null,
      event.name,
      event.occurredAt,
      json(event.payload),
      json({ ...event.context, metadata: event.metadata })
    ]
  );
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
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
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
  return assertAssetTenant(await findAssetRecord(id), organizationId, id);
}

async function findWorkOrderOrThrow(id: EntityId, organizationId: OrganizationId): Promise<WorkOrder> {
  return assertWorkOrderTenant(await findWorkOrderRecord(id), organizationId, id);
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

async function saveOrganizationRecord(organization: Organization): Promise<void> {
  organizations.set(organization.id, organization);
  await pgPool.query(
    `insert into organizations (id, name, slug, status, type, monthly_contract_value, target_sla, created_at, updated_at, data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (id) do update set
       name = excluded.name,
       slug = excluded.slug,
       status = excluded.status,
       type = excluded.type,
       monthly_contract_value = excluded.monthly_contract_value,
       target_sla = excluded.target_sla,
       updated_at = excluded.updated_at,
       data = excluded.data`,
    [
      organization.id,
      organization.name,
      organization.slug,
      organization.status,
      organization.type ?? null,
      organization.monthlyContractValue ?? null,
      organization.targetSla ?? null,
      organization.createdAt,
      organization.updatedAt,
      json(organization)
    ]
  );
}

async function listOrganizationRecords(): Promise<Organization[]> {
  const result = await pgPool.query("select data from organizations order by created_at desc");
  return result.rows.map((row) => fromJson<Organization>(row.data));
}

function tenantFromRow(row: QueryResultRow): AtlasTenant {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    productLine: row.product_line as TenantProductLine,
    plan: row.plan,
    status: row.status as AtlasTenant["status"],
    accessScope: row.access_scope as AtlasTenant["accessScope"],
    slug: row.slug ?? undefined,
    permissions: fromJson<string[]>(row.permissions ?? []),
    allowedApps: fromJson<string[]>(row.allowed_apps ?? []),
    createdAt: new Date(row.created_at).toISOString() as ISODateTime,
    updatedAt: new Date(row.updated_at).toISOString() as ISODateTime,
    data: fromJson<Record<string, unknown>>(row.data ?? {}),
    ...(row.owner_name ? { ownerName: row.owner_name } : {}),
    ...(row.owner_email ? { ownerEmail: row.owner_email } : {})
  };
}

async function listTenantRecords(): Promise<AtlasTenant[]> {
  const result = await pgPool.query("select * from atlas_tenants order by created_at asc");
  return result.rows.map(tenantFromRow);
}

function defaultPermissions(productLine: TenantProductLine): string[] {
  if (productLine === "enterprise") {
    return [
      "enterprise:access",
      "organization:read",
      "organization:write",
      "asset:read",
      "asset:write",
      "maintenance:write",
      "workflow:approve",
      "reports:read",
      "ai:invoke"
    ];
  }
  return ["field:access", "field:work_orders", "field:customers", "field:assets", "field:appointments", "ai:invoke"];
}

function defaultAllowedApps(productLine: TenantProductLine): string[] {
  if (productLine === "enterprise") return ["enterprise"];
  return ["field"];
}

async function saveTenantRecord(tenant: AtlasTenant): Promise<AtlasTenant> {
  await pgPool.query(
    `insert into atlas_tenants (id, code, name, product_line, plan, status, owner_name, owner_email, access_scope, created_at, updated_at, slug, permissions, allowed_apps, data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict (code) do update set
       name = excluded.name,
       product_line = excluded.product_line,
       plan = excluded.plan,
       status = excluded.status,
       owner_name = excluded.owner_name,
       owner_email = excluded.owner_email,
       access_scope = excluded.access_scope,
       slug = excluded.slug,
       permissions = excluded.permissions,
       allowed_apps = excluded.allowed_apps,
       updated_at = excluded.updated_at,
       data = excluded.data`,
    [
      tenant.id,
      tenant.code,
      tenant.name,
      tenant.productLine,
      tenant.plan,
      tenant.status,
      tenant.ownerName ?? null,
      tenant.ownerEmail ?? null,
      tenant.accessScope,
      tenant.createdAt,
      tenant.updatedAt,
      tenant.slug ?? null,
      json(tenant.permissions),
      json(tenant.allowedApps),
      json(tenant.data)
    ]
  );
  const [saved] = (await listTenantRecords()).filter((item) => item.code === tenant.code);
  return saved ?? tenant;
}

function accessGrantFromRow(row: QueryResultRow): AtlasAccessGrant {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantCode: row.tenant_code,
    name: row.name,
    email: row.email,
    role: row.role as AtlasAccessGrant["role"],
    status: row.status as AtlasAccessGrant["status"],
    permissions: fromJson<string[]>(row.permissions ?? []),
    createdAt: new Date(row.created_at).toISOString() as ISODateTime,
    updatedAt: new Date(row.updated_at).toISOString() as ISODateTime,
    data: fromJson<Record<string, unknown>>(row.data ?? {}),
    ...(row.last_login_at ? { lastLoginAt: new Date(row.last_login_at).toISOString() as ISODateTime } : {})
  };
}

async function listAccessGrantRecords(tenantId?: string): Promise<AtlasAccessGrant[]> {
  const result = tenantId
    ? await pgPool.query("select * from atlas_access_grants where tenant_id = $1 order by created_at asc", [tenantId])
    : await pgPool.query("select * from atlas_access_grants order by created_at asc");
  return result.rows.map(accessGrantFromRow);
}

async function saveAccessGrantRecord(grant: AtlasAccessGrant): Promise<AtlasAccessGrant> {
  await pgPool.query(
    `insert into atlas_access_grants (id, tenant_id, tenant_code, name, email, role, status, permissions, created_at, updated_at, last_login_at, data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (tenant_id, email) do update set
       name = excluded.name,
       role = excluded.role,
       status = excluded.status,
       permissions = excluded.permissions,
       updated_at = excluded.updated_at,
       data = excluded.data`,
    [
      grant.id,
      grant.tenantId,
      grant.tenantCode,
      grant.name,
      grant.email,
      grant.role,
      grant.status,
      json(grant.permissions),
      grant.createdAt,
      grant.updatedAt,
      grant.lastLoginAt ?? null,
      json(grant.data)
    ]
  );
  const [saved] = (await listAccessGrantRecords(grant.tenantId)).filter((item) => item.email === grant.email);
  return saved ?? grant;
}

async function saveAssetRecord(asset: Asset): Promise<void> {
  await assets.save(asset);
  await pgPool.query(
    `insert into assets (id, organization_id, name, kind, criticality, location, description, status, created_at, updated_at, data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (id) do update set
       name = excluded.name,
       kind = excluded.kind,
       criticality = excluded.criticality,
       location = excluded.location,
       description = excluded.description,
       status = excluded.status,
       updated_at = excluded.updated_at,
       data = excluded.data`,
    [
      asset.id,
      asset.organizationId,
      asset.name,
      asset.kind,
      asset.criticality,
      asset.location ?? null,
      asset.description ?? null,
      asset.status,
      asset.createdAt,
      asset.updatedAt,
      json(asset)
    ]
  );
}

async function findAssetRecord(id: EntityId): Promise<Asset | null> {
  const cached = await assets.findById(id);
  if (cached) return cached;
  const result = await pgPool.query("select data from assets where id = $1", [id]);
  const asset = result.rows[0] ? fromJson<Asset>(result.rows[0].data) : null;
  if (asset) await assets.save(asset);
  return asset;
}

async function listAssetRecords(organizationId?: OrganizationId) {
  const result = organizationId
    ? await pgPool.query("select data from assets where organization_id = $1 order by updated_at desc", [organizationId])
    : await pgPool.query("select data from assets order by updated_at desc");
  return { items: result.rows.map((row) => fromJson<Asset>(row.data)) };
}

async function saveWorkOrderRecord(workOrder: WorkOrder): Promise<void> {
  await workOrders.save(workOrder);
  await pgPool.query(
    `insert into work_orders (
       id, organization_id, asset_id, title, description, priority, state, due_at, budget, status, closed_at,
       technician_name, diagnosis, materials, labor_hours, labor_rate, labor_cost, estimated_duration_hours, checklist, evidence,
       created_at, updated_at, sequence_number, data
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     on conflict (id) do update set
       title = excluded.title,
       description = excluded.description,
       priority = excluded.priority,
       state = excluded.state,
       due_at = excluded.due_at,
       budget = excluded.budget,
       status = excluded.status,
       closed_at = excluded.closed_at,
       technician_name = excluded.technician_name,
       diagnosis = excluded.diagnosis,
       materials = excluded.materials,
       labor_hours = excluded.labor_hours,
       labor_rate = excluded.labor_rate,
       labor_cost = excluded.labor_cost,
       estimated_duration_hours = excluded.estimated_duration_hours,
       checklist = excluded.checklist,
       evidence = excluded.evidence,
       updated_at = excluded.updated_at,
       sequence_number = excluded.sequence_number,
       data = excluded.data`,
    [
      workOrder.id,
      workOrder.organizationId,
      workOrder.assetId,
      workOrder.title,
      workOrder.description ?? null,
      workOrder.priority,
      workOrder.state,
      workOrder.dueAt ?? null,
      workOrder.budget ? json(workOrder.budget) : null,
      workOrder.status,
      workOrder.closedAt ?? null,
      workOrder.technicianName ?? null,
      workOrder.diagnosis ?? null,
      json(workOrder.materials),
      workOrder.laborHours ?? null,
      workOrder.laborRate ?? null,
      workOrder.laborCost ?? null,
      workOrder.estimatedDurationHours ?? null,
      json(workOrder.checklist),
      json(workOrder.evidence),
      workOrder.createdAt,
      workOrder.updatedAt,
      workOrder.sequenceNumber ?? null,
      json(workOrder)
    ]
  );
}

async function findWorkOrderRecord(id: EntityId): Promise<WorkOrder | null> {
  const cached = await workOrders.findById(id);
  if (cached) return cached;
  const result = await pgPool.query("select data from work_orders where id = $1", [id]);
  const workOrder = result.rows[0] ? fromJson<WorkOrder>(result.rows[0].data) : null;
  if (workOrder) await workOrders.save(workOrder);
  return workOrder;
}

async function listWorkOrderRecords(organizationId: OrganizationId) {
  const result = await pgPool.query("select data from work_orders where organization_id = $1 order by updated_at desc", [organizationId]);
  return { items: result.rows.map((row) => fromJson<WorkOrder>(row.data)) };
}

async function saveAppointmentRecord(appointment: FieldAppointment): Promise<void> {
  appointments.set(appointment.id, appointment);
  await pgPool.query(
    `insert into field_appointments (
       id, organization_id, title, scheduled_at, duration_minutes, status, kind, technician_name, customer_name,
       location, work_order_id, notes, reminder_enabled, reminder_minutes_before, reminder_at, data, created_at, updated_at
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     on conflict (id) do update set
       title = excluded.title,
       scheduled_at = excluded.scheduled_at,
       duration_minutes = excluded.duration_minutes,
       status = excluded.status,
       kind = excluded.kind,
       technician_name = excluded.technician_name,
       customer_name = excluded.customer_name,
       location = excluded.location,
       work_order_id = excluded.work_order_id,
       notes = excluded.notes,
       reminder_enabled = excluded.reminder_enabled,
       reminder_minutes_before = excluded.reminder_minutes_before,
       reminder_at = excluded.reminder_at,
       data = excluded.data,
       updated_at = excluded.updated_at`,
    [
      appointment.id,
      appointment.organizationId,
      appointment.title,
      appointment.scheduledAt,
      appointment.durationMinutes,
      appointment.status,
      appointment.kind,
      appointment.technicianName ?? null,
      appointment.customerName ?? null,
      appointment.location ?? null,
      appointment.workOrderId ?? null,
      appointment.notes ?? null,
      appointment.reminderEnabled,
      appointment.reminderMinutesBefore ?? null,
      appointment.reminderAt ?? null,
      json(appointment),
      appointment.createdAt,
      appointment.updatedAt
    ]
  );
}

async function listAppointmentRecords(organizationId: OrganizationId, from?: string | null, to?: string | null): Promise<FieldAppointment[]> {
  const values: unknown[] = [organizationId];
  let where = "organization_id = $1";
  if (from) {
    values.push(from);
    where += ` and scheduled_at >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    where += ` and scheduled_at <= $${values.length}`;
  }
  const result = await pgPool.query(`select data from field_appointments where ${where} order by scheduled_at asc`, values);
  return result.rows.map((row) => fromJson<FieldAppointment>(row.data));
}

async function findAppointmentRecord(id: EntityId): Promise<FieldAppointment | null> {
  const cached = appointments.get(id);
  if (cached) return cached;
  const result = await pgPool.query("select data from field_appointments where id = $1", [id]);
  const appointment = result.rows[0] ? fromJson<FieldAppointment>(result.rows[0].data) : null;
  if (appointment) appointments.set(appointment.id, appointment);
  return appointment;
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
          dashboard: "/operations/runtime-dashboard?organizationId=<organizationId>",
          knowledgeGraph: "/operations/knowledge-graph?organizationId=<organizationId>",
          digitalTwin: "/operations/digital-twin?organizationId=<organizationId>",
          foresight: "/operations/foresight?organizationId=<organizationId>"
        },
        note: "Atlas API is running. Open the web cockpit at http://localhost:5173."
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
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

    if (url.pathname === "/field/profile") {
      const tenantCode = url.searchParams.get("tenant") || "#00";
      const email = url.searchParams.get("email") || "";

      if (request.method === "GET") {
        let result = await pgPool.query(
          `select name, role, tenant_code as "tenantCode", email
           from atlas_access_grants
           where tenant_code = $1 and email = $2 and status = 'active'
           limit 1`,
          [tenantCode, email]
        );

        if (!result.rows[0]) {
          result = await pgPool.query(
            `select name, role, tenant_code as "tenantCode", email
             from atlas_access_grants
             where tenant_code = $1 and status = 'active'
             order by (case when id = 'ag_field_00_marcelo' then 0 else 1 end) asc, created_at asc
             limit 1`,
            [tenantCode]
          );
        }

        let profileData: any;
        let resolvedTenantCode = tenantCode;
        if (result.rows[0]) {
          const row = result.rows[0];
          const pwaRole = row.role === "technician" ? "Técnico" : row.role === "admin" ? "Supervisor" : row.role === "manager" ? "Financeiro" : "Técnico";
          profileData = {
            name: row.name,
            role: pwaRole,
            tenantCode: row.tenantCode,
            accessLevel: row.role === "technician" ? "field_operator" : "field_manager",
            email: row.email,
            configured: true
          };
          resolvedTenantCode = row.tenantCode || tenantCode;
        } else {
          profileData = { configured: false, tenantCode, accessLevel: "field_operator" };
        }
        const tenantResult = await pgPool.query("select name, product_line as \"productLine\", plan, status from atlas_tenants where code = $1", [resolvedTenantCode]);
        profileData.tenant = tenantResult.rows[0] || null;
        send(response, 200, profileData);
        return;
      }

      if (request.method === "POST" || request.method === "PATCH") {
        const payload = await readJson<{ name?: string; role?: string }>(request);
        const name = payload.name?.trim();
        const role = payload.role?.trim();
        if (!name || !role) {
          send(response, 400, { error: "profile_required", message: "Informe nome e perfil para configurar o Field." });
          return;
        }

        const saasRole = role === "Técnico" ? "technician" : role === "Financeiro" ? "manager" : role === "Supervisor" ? "admin" : "technician";

        // Find the grant to update
        let grantResult = await pgPool.query(
          `select id from atlas_access_grants
           where tenant_code = $1 and email = $2 and status = 'active'
           limit 1`,
          [tenantCode, email]
        );

        if (!grantResult.rows[0]) {
          grantResult = await pgPool.query(
            `select id from atlas_access_grants
             where tenant_code = $1 and status = 'active'
             order by (case when id = 'ag_field_00_marcelo' then 0 else 1 end) asc, created_at asc
             limit 1`,
            [tenantCode]
          );
        }

        if (grantResult.rows[0]) {
          const grantId = grantResult.rows[0].id;
          await pgPool.query(
            `update atlas_access_grants
             set name = $1, role = $2, updated_at = now()
             where id = $3`,
            [name, saasRole, grantId]
          );
        } else {
          send(response, 404, { error: "grant_not_found", message: "Acesso não encontrado para atualização." });
          return;
        }

        send(response, 200, { configured: true, name, role, tenantCode, accessLevel: saasRole === "technician" ? "field_operator" : "field_manager" });
        return;
      }
    }

    if (url.pathname === "/field/appointments") {
      const organizationId = organizationFrom(url, request);

      if (request.method === "GET") {
        if (!organizationId) {
          send(response, 400, { error: "organization_required", message: "organizationId is required." });
          return;
        }
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const items = await listAppointmentRecords(organizationId, from, to);
        send(response, 200, { items });
        return;
      }

      if (request.method === "POST") {
                const payload = await readJson<{
          title: string;
          scheduledAt: ISODateTime;
          durationMinutes?: number;
          kind?: FieldAppointment["kind"];
          technicianName?: string;
          customerName?: string;
          location?: string;
          workOrderId?: EntityId;
          notes?: string;
          reminderEnabled?: boolean;
          reminderMinutesBefore?: number;
          pinned?: boolean;
          organizationId?: OrganizationId;
        }>(request);
        const payloadOrganizationId = organizationId ?? payload.organizationId;
        if (!payloadOrganizationId) {
          send(response, 400, { error: "organization_required", message: "organizationId is required." });
          return;
        }
        const now = systemClock.now();
        const reminderEnabled = Boolean(payload.reminderEnabled);
        const reminderMinutesBefore = payload.reminderMinutesBefore ?? 30;
        const reminderAt = reminderEnabled
          ? (new Date(new Date(payload.scheduledAt).getTime() - reminderMinutesBefore * 60_000).toISOString() as ISODateTime)
          : undefined;
        const appointment: FieldAppointment = {
          id: createId("apt"),
          organizationId: payloadOrganizationId,
          title: payload.title.trim(),
          scheduledAt: payload.scheduledAt,
          durationMinutes: payload.durationMinutes ?? 60,
          kind: payload.kind ?? "visit",
          status: "scheduled",
          reminderEnabled,
          pinned: payload.pinned ?? false,
          createdAt: now,
          updatedAt: now,
          ...(payload.technicianName?.trim() ? { technicianName: payload.technicianName.trim() } : {}),
          ...(payload.customerName?.trim() ? { customerName: payload.customerName.trim() } : {}),
          ...(payload.location?.trim() ? { location: payload.location.trim() } : {}),
          ...(payload.workOrderId ? { workOrderId: payload.workOrderId } : {}),
          ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
          ...(reminderEnabled && reminderAt ? { reminderMinutesBefore, reminderAt } : {})
        };
        await saveAppointmentRecord(appointment);

        const wo = appointment.workOrderId ? await findWorkOrderRecord(appointment.workOrderId) : null;
        const hasBudget = Boolean(wo && wo.budget);
        const budgetAmount = wo?.budget?.amount;
        const budgetState = wo?.budget?.state;
        const priority = wo?.priority ?? "normal";
        const state = wo?.state ?? "opened";
        const dueAt = wo?.dueAt;
        const isDeadlineExpiring = dueAt
          ? (new Date(dueAt).getTime() - new Date().getTime() < 86400000 * 2)
          : false;

        await bus.publish(
          createEvent(
            "AgendaAppointmentScheduled",
            {
              title: "Agendamento criado",
              body: `${appointment.title} em ${appointment.scheduledAt}`,
              kind: "system",
              appointmentId: appointment.id,
              organizationId: payloadOrganizationId,
              subjectId: appointment.workOrderId ?? appointment.id,
              metadata: {
                scheduledAt: appointment.scheduledAt,
                durationMinutes: appointment.durationMinutes,
                appointmentKind: appointment.kind,
                reminderEnabled: appointment.reminderEnabled,
                reminderAt: appointment.reminderAt,
                workOrderId: appointment.workOrderId,
                pinned: appointment.pinned,
                hasBudget,
                budgetAmount,
                budgetState,
                priority,
                workOrderState: state,
                dueAt,
                isDeadlineExpiring
              }
            },
            context(request, payloadOrganizationId),
            { organizationId: payloadOrganizationId, subjectId: appointment.workOrderId ?? appointment.id, sourceModule: "operations" }
          )
        );
        send(response, 201, { appointment, timeline: await timeline.list({ organizationId: payloadOrganizationId, subjectId: appointment.workOrderId ?? appointment.id }) });
        return;
      }
    }

    const appointmentMatch = url.pathname.match(/^\/field\/appointments\/([^/]+)$/);
    if (appointmentMatch) {
      const organizationId = organizationFrom(url, request);
      const appointmentId = appointmentMatch[1] as EntityId;

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      const appointment = await findAppointmentRecord(appointmentId);
      if (!appointment || appointment.organizationId !== organizationId) {
        send(response, 404, { error: "appointment_not_found", message: "Appointment not found." });
        return;
      }

      if (request.method === "PATCH") {
        const payload = await readJson<{
          title?: string;
          scheduledAt?: ISODateTime;
          durationMinutes?: number;
          status?: AppointmentStatus;
          kind?: FieldAppointment["kind"];
          technicianName?: string | null;
          customerName?: string | null;
          location?: string | null;
          workOrderId?: EntityId | null;
          notes?: string | null;
          reminderEnabled?: boolean;
          reminderMinutesBefore?: number | null;
          pinned?: boolean;
        }>(request);

        const now = systemClock.now();
        const reminderEnabled = payload.reminderEnabled !== undefined ? Boolean(payload.reminderEnabled) : appointment.reminderEnabled;
        const reminderMinutesBefore = payload.reminderMinutesBefore !== undefined ? (payload.reminderMinutesBefore ?? 30) : appointment.reminderMinutesBefore;
        const scheduledAt = payload.scheduledAt ?? appointment.scheduledAt;
        const reminderAt = reminderEnabled && reminderMinutesBefore
          ? (new Date(new Date(scheduledAt).getTime() - reminderMinutesBefore * 60_000).toISOString() as ISODateTime)
          : undefined;

        const updated: any = {
          ...appointment,
          title: payload.title !== undefined ? payload.title.trim() : appointment.title,
          scheduledAt,
          durationMinutes: payload.durationMinutes !== undefined ? (payload.durationMinutes ?? 60) : appointment.durationMinutes,
          status: payload.status ?? appointment.status,
          kind: payload.kind ?? appointment.kind,
          reminderEnabled,
          pinned: payload.pinned !== undefined ? payload.pinned : appointment.pinned,
          updatedAt: now
        };

        const technicianName = payload.technicianName !== undefined ? (payload.technicianName?.trim() || undefined) : appointment.technicianName;
        const customerName = payload.customerName !== undefined ? (payload.customerName?.trim() || undefined) : appointment.customerName;
        const location = payload.location !== undefined ? (payload.location?.trim() || undefined) : appointment.location;
        const workOrderId = payload.workOrderId !== undefined ? (payload.workOrderId || undefined) : appointment.workOrderId;
        const notes = payload.notes !== undefined ? (payload.notes?.trim() || undefined) : appointment.notes;
        const finalReminderMinutesBefore = reminderEnabled ? reminderMinutesBefore : undefined;

        if (technicianName !== undefined) updated.technicianName = technicianName; else delete updated.technicianName;
        if (customerName !== undefined) updated.customerName = customerName; else delete updated.customerName;
        if (location !== undefined) updated.location = location; else delete updated.location;
        if (workOrderId !== undefined) updated.workOrderId = workOrderId; else delete updated.workOrderId;
        if (notes !== undefined) updated.notes = notes; else delete updated.notes;
        if (finalReminderMinutesBefore !== undefined) updated.reminderMinutesBefore = finalReminderMinutesBefore; else delete updated.reminderMinutesBefore;
        if (reminderAt !== undefined) updated.reminderAt = reminderAt; else delete updated.reminderAt;

        await saveAppointmentRecord(updated);

        const wo = updated.workOrderId ? await findWorkOrderRecord(updated.workOrderId) : null;
        const hasBudget = Boolean(wo && wo.budget);
        const budgetAmount = wo?.budget?.amount;
        const budgetState = wo?.budget?.state;
        const priority = wo?.priority ?? "normal";
        const state = wo?.state ?? "opened";
        const dueAt = wo?.dueAt;
        const isDeadlineExpiring = dueAt
          ? (new Date(dueAt).getTime() - new Date().getTime() < 86400000 * 2)
          : false;

        await bus.publish(
          createEvent(
            "AgendaAppointmentUpdated",
            {
              title: "Agendamento atualizado",
              body: `${updated.title} - ${updated.status}`,
              kind: "system",
              appointmentId: updated.id,
              organizationId,
              subjectId: updated.workOrderId ?? updated.id,
              metadata: {
                status: updated.status,
                scheduledAt: updated.scheduledAt,
                workOrderId: updated.workOrderId,
                pinned: updated.pinned ?? false,
                hasBudget,
                budgetAmount,
                budgetState,
                priority,
                workOrderState: state,
                dueAt,
                isDeadlineExpiring
              }
            },
            context(request, organizationId),
            { organizationId, subjectId: updated.workOrderId ?? updated.id, sourceModule: "operations" }
          )
        );
        send(response, 200, { appointment: updated, timeline: await timeline.list({ organizationId, subjectId: updated.workOrderId ?? updated.id }) });
        return;
      }

      if (request.method === "DELETE") {
        appointments.delete(appointmentId);
        await pgPool.query("delete from field_appointments where id = $1 and organization_id = $2", [appointmentId, organizationId]);

        const wo = appointment.workOrderId ? await findWorkOrderRecord(appointment.workOrderId) : null;
        const hasBudget = Boolean(wo && wo.budget);
        const budgetAmount = wo?.budget?.amount;
        const budgetState = wo?.budget?.state;
        const priority = wo?.priority ?? "normal";
        const state = wo?.state ?? "opened";
        const dueAt = wo?.dueAt;
        const isDeadlineExpiring = dueAt
          ? (new Date(dueAt).getTime() - new Date().getTime() < 86400000 * 2)
          : false;

        await bus.publish(
          createEvent(
            "AgendaAppointmentDeleted",
            {
              title: "Agendamento deletado",
              body: `${appointment.title} removido`,
              kind: "system",
              appointmentId: appointment.id,
              organizationId,
              subjectId: appointment.workOrderId ?? appointment.id,
              metadata: {
                title: appointment.title,
                scheduledAt: appointment.scheduledAt,
                workOrderId: appointment.workOrderId,
                pinned: appointment.pinned ?? false,
                hasBudget,
                budgetAmount,
                budgetState,
                priority,
                workOrderState: state,
                dueAt,
                isDeadlineExpiring
              }
            },
            context(request, organizationId),
            { organizationId, subjectId: appointment.workOrderId ?? appointment.id, sourceModule: "operations" }
          )
        );
        send(response, 200, { ok: true, appointmentId });
        return;
      }
    }

    if (request.method === "GET" && url.pathname === "/organizations") {
      send(response, 200, { items: await listOrganizationRecords() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/owner/tenants") {
      send(response, 200, { items: await listTenantRecords() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/owner/access-grants") {
      send(response, 200, { items: await listAccessGrantRecords(url.searchParams.get("tenantId") ?? undefined) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/owner/tenants") {
      const payload = await readJson<{
        code?: string;
        slug?: string;
        name: string;
        productLine?: TenantProductLine;
        plan?: string;
        ownerName?: string;
        ownerEmail?: string;
        permissions?: string[];
        allowedApps?: string[];
      }>(request);
      const now = systemClock.now();
      const requestedProductLine = payload.productLine ?? "field";
      const productLine: TenantProductLine =
        requestedProductLine === "enterprise" || requestedProductLine === "field" ? requestedProductLine : "field";
      const code = payload.code?.trim() || "#" + Math.random().toString(36).slice(2, 6).toUpperCase();
      const slug = slugify(payload.slug?.trim() || payload.name || code) || slugify(code) || createId("tenant");
      const tenant: AtlasTenant = {
        id: createId("tn"),
        code,
        name: payload.name.trim(),
        productLine,
        plan: payload.plan ?? (productLine === "enterprise" ? "enterprise" : "field_solo"),
        status: "active",
        accessScope: "tenant",
        slug,
        permissions: payload.permissions?.filter(Boolean) ?? defaultPermissions(productLine),
        allowedApps: payload.allowedApps?.filter(Boolean) ?? defaultAllowedApps(productLine),
        createdAt: now,
        updatedAt: now,
        data: { createdBy: "owner", source: "owner_dashboard", version: 1 },
        ...(payload.ownerName?.trim() ? { ownerName: payload.ownerName.trim() } : {}),
        ...(payload.ownerEmail?.trim() ? { ownerEmail: payload.ownerEmail.trim() } : {})
      };
      const existingSlug = (await listTenantRecords()).find((item) => item.slug === slug && item.code !== code);
      if (existingSlug) {
        send(response, 409, { error: "slug_conflict", message: "Slug ja cadastrado para outro acesso." });
        return;
      }
      const savedTenant = await saveTenantRecord(tenant);
      if (payload.ownerEmail?.trim()) {
        const ownerName = payload.ownerName?.trim() || "Responsável";
        const ownerEmail = payload.ownerEmail.trim().toLowerCase();
        const firstGrant: AtlasAccessGrant = {
          id: createId("ag"),
          tenantId: savedTenant.id,
          tenantCode: savedTenant.code,
          name: ownerName,
          email: ownerEmail,
          role: productLine === "field" ? "technician" : "admin",
          status: "active",
          permissions: savedTenant.permissions,
          createdAt: now,
          updatedAt: now,
          data: { createdBy: "owner", source: "auto_tenant_creation" }
        };
        await saveAccessGrantRecord(firstGrant);
      }
      send(response, 201, { tenant: savedTenant });
      return;
    }

    const ownerTenantMatch = url.pathname.match(/^\/owner\/tenants\/([^/]+)$/);
    if (ownerTenantMatch && request.method === "PATCH") {
      const tenantId = decodeURIComponent(ownerTenantMatch[1] ?? "");
      const payload = await readJson<{
        name?: string;
        slug?: string;
        ownerName?: string;
        ownerEmail?: string;
        productLine?: TenantProductLine;
        plan?: string;
        status?: AtlasTenant["status"];
        allowedApps?: string[];
        permissions?: string[];
      }>(request);
      const tenant = (await listTenantRecords()).find((item) => item.id === tenantId);
      if (!tenant) {
        send(response, 404, { error: "tenant_not_found", message: "Tenant não encontrado." });
        return;
      }

      let slug = tenant.slug;
      if (payload.slug !== undefined) {
        const proposedSlug = slugify(payload.slug.trim()) || tenant.slug;
        const conflict = (await listTenantRecords()).find((item) => item.slug === proposedSlug && item.id !== tenantId);
        if (conflict) {
          send(response, 409, { error: "slug_conflict", message: "Slug já cadastrado para outro acesso." });
          return;
        }
        slug = proposedSlug;
      }

      const updatedTenant: AtlasTenant = {
        ...tenant,
        name: payload.name !== undefined ? payload.name.trim() : tenant.name,
        productLine: payload.productLine !== undefined ? payload.productLine : tenant.productLine,
        plan: payload.plan !== undefined ? payload.plan : tenant.plan,
        status: payload.status !== undefined && ["active", "trial", "suspended", "archived"].includes(payload.status) ? payload.status : tenant.status,
        allowedApps: payload.allowedApps !== undefined ? payload.allowedApps.filter(Boolean) : tenant.allowedApps,
        permissions: payload.permissions !== undefined ? payload.permissions.filter(Boolean) : tenant.permissions,
        updatedAt: systemClock.now(),
        ...(slug ? { slug } : {}),
        ...(payload.ownerName !== undefined ? (payload.ownerName.trim() ? { ownerName: payload.ownerName.trim() } : {}) : (tenant.ownerName ? { ownerName: tenant.ownerName } : {})),
        ...(payload.ownerEmail !== undefined ? (payload.ownerEmail.trim() ? { ownerEmail: payload.ownerEmail.trim() } : {}) : (tenant.ownerEmail ? { ownerEmail: tenant.ownerEmail } : {}))
      };

      send(response, 200, { tenant: await saveTenantRecord(updatedTenant) });
      return;
    }

    if (ownerTenantMatch && request.method === "DELETE") {
      const tenantId = decodeURIComponent(ownerTenantMatch[1] ?? "");
      await pgPool.query("delete from atlas_access_grants where tenant_id = $1", [tenantId]);
      await pgPool.query("delete from atlas_tenants where id = $1", [tenantId]);
      send(response, 200, { ok: true, tenantId, mode: "hard_delete_test" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/owner/access-grants") {
      const payload = await readJson<{
        tenantId: string;
        name: string;
        email: string;
        role?: AtlasAccessGrant["role"];
        permissions?: string[];
      }>(request);
      const tenant = (await listTenantRecords()).find((item) => item.id === payload.tenantId);
      if (!tenant) {
        send(response, 404, { error: "tenant_not_found", message: "Tenant nao encontrado." });
        return;
      }
      const now = systemClock.now();
      const grant: AtlasAccessGrant = {
        id: createId("ag"),
        tenantId: tenant.id,
        tenantCode: tenant.code,
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        role: payload.role ?? "admin",
        status: "invited",
        permissions: payload.permissions?.filter(Boolean) ?? tenant.permissions,
        createdAt: now,
        updatedAt: now,
        data: { createdBy: "owner", source: "owner_dashboard" }
      };
      send(response, 201, { grant: await saveAccessGrantRecord(grant) });
      return;
    }

    const ownerAccessGrantMatch = url.pathname.match(/^\/owner\/access-grants\/([^/]+)$/);
    if (ownerAccessGrantMatch && request.method === "PATCH") {
      const grantId = decodeURIComponent(ownerAccessGrantMatch[1] ?? "");
      const payload = await readJson<{
        name?: string;
        email?: string;
        role?: AtlasAccessGrant["role"];
        status?: AtlasAccessGrant["status"];
        permissions?: string[];
      }>(request);
      const allGrants = await listAccessGrantRecords();
      const grant = allGrants.find((item) => item.id === grantId);
      if (!grant) {
        send(response, 404, { error: "grant_not_found", message: "Acesso não encontrado." });
        return;
      }

      let email = grant.email;
      if (payload.email !== undefined) {
        const proposedEmail = payload.email.trim().toLowerCase();
        const conflict = allGrants.find(
          (item) => item.tenantId === grant.tenantId && item.email === proposedEmail && item.id !== grantId
        );
        if (conflict) {
          send(response, 409, { error: "email_conflict", message: "Este e-mail já está cadastrado para este tenant." });
          return;
        }
        email = proposedEmail;
      }

      const updatedGrant: AtlasAccessGrant = {
        ...grant,
        name: payload.name !== undefined ? payload.name.trim() : grant.name,
        email,
        role: payload.role !== undefined ? payload.role : grant.role,
        status: payload.status !== undefined ? payload.status : grant.status,
        permissions: payload.permissions !== undefined ? payload.permissions.filter(Boolean) : grant.permissions,
        updatedAt: systemClock.now()
      };

      await pgPool.query(
        `update atlas_access_grants set
           name = $1,
           email = $2,
           role = $3,
           status = $4,
           permissions = $5,
           updated_at = $6
         where id = $7`,
        [
          updatedGrant.name,
          updatedGrant.email,
          updatedGrant.role,
          updatedGrant.status,
          json(updatedGrant.permissions),
          updatedGrant.updatedAt,
          updatedGrant.id
        ]
      );

      const [saved] = (await listAccessGrantRecords(updatedGrant.tenantId)).filter((item) => item.id === updatedGrant.id);
      send(response, 200, { grant: saved ?? updatedGrant });
      return;
    }

    if (ownerAccessGrantMatch && request.method === "DELETE") {
      const grantId = decodeURIComponent(ownerAccessGrantMatch[1] ?? "");
      const allGrants = await listAccessGrantRecords();
      const grant = allGrants.find((item) => item.id === grantId);
      if (!grant) {
        send(response, 404, { error: "grant_not_found", message: "Acesso não encontrado." });
        return;
      }
      await pgPool.query("delete from atlas_access_grants where id = $1", [grantId]);
      send(response, 200, { ok: true, grantId });
      return;
    }

    if (request.method === "GET" && url.pathname === "/owner/summary") {
      const tenants = await listTenantRecords();
      const grants = await listAccessGrantRecords();
      const [organizationsCount, assetsCount, workOrdersCount, openWorkOrdersCount] = await Promise.all([
        pgPool.query("select count(*)::int as count from organizations"),
        pgPool.query("select count(*)::int as count from assets"),
        pgPool.query("select count(*)::int as count from work_orders"),
        pgPool.query("select count(*)::int as count from work_orders where coalesce(data->>'state', 'opened') not in ('closed','cancelled')")
      ]);
      send(response, 200, {
        owner: {
          name: "DASHEM",
          accessScope: "global",
          role: "Super Admin"
        },
        totals: {
          tenants: tenants.length,
          activeTenants: tenants.filter((item) => item.status === "active").length,
          fieldTenants: tenants.filter((item) => item.productLine === "field").length,
          enterpriseTenants: tenants.filter((item) => item.productLine === "enterprise").length,
          customers: organizationsCount.rows[0]?.count ?? 0,
          assets: assetsCount.rows[0]?.count ?? 0,
          workOrders: workOrdersCount.rows[0]?.count ?? 0,
          openWorkOrders: openWorkOrdersCount.rows[0]?.count ?? 0,
          accessGrants: grants.length,
          invitedAccess: grants.filter((item) => item.status === "invited").length,
          activeAccess: grants.filter((item) => item.status === "active").length
        },
        tenants: tenants.slice(0, 50),
        accessGrants: grants.slice(0, 100)
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/organizations") {
      const payload = await readJson<{ name: string; slug: string; type?: "corporate" | "private"; monthlyContractValue?: number; targetSla?: number; address?: string; phone?: string; document?: string }>(request);
      const organization = await createOrganization(payload, context(request), bus);
      await saveOrganizationRecord(organization);
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
      await saveAssetRecord(asset);
      send(response, 201, { asset });
      return;
    }

    if (request.method === "GET" && url.pathname === "/assets") {
      const organizationId = url.searchParams.get("organizationId") as OrganizationId | null;
      const page = await listAssetRecords(organizationId ?? undefined);
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
        await saveAssetRecord(updated);
        send(response, 200, { asset: updated });
        return;
      }

      if (request.method === "DELETE") {
        const asset = await findAssetOrThrow(assetId, organizationId);
        const archived = await archiveAsset(asset, context(request, organizationId), bus);
        await saveAssetRecord(archived);
        send(response, 200, { asset: archived });
        return;
      }
    }

    if (request.method === "POST" && url.pathname === "/maintenance/work-orders") {
      const payload = await readJson<Parameters<typeof createWorkOrder>[0]>(request);
      const workOrder = await createWorkOrder(payload, context(request, payload.organizationId), bus);
      await saveWorkOrderRecord(workOrder);
      send(response, 201, { workOrder, timeline: await timeline.list({ organizationId: workOrder.organizationId, subjectId: workOrder.id }) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/maintenance/work-orders") {
      const organizationId = organizationFrom(url, request);

      if (!organizationId) {
        send(response, 400, { error: "organization_required", message: "organizationId is required." });
        return;
      }

      send(response, 200, await listWorkOrderRecords(organizationId));
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

      if (request.method === "PATCH") {
        const payload = await readJson<Partial<WorkOrder>>(request);
        const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
        const updated: WorkOrder = {
          ...workOrder,
          ...payload,
          updatedAt: systemClock.now()
        };
        await saveWorkOrderRecord(updated);
        send(response, 200, {
          workOrder: updated,
          timeline: await timeline.list({ organizationId, subjectId: workOrder.id })
        });
        return;
      }

      if (request.method === "DELETE") {
        const workOrder = await findWorkOrderOrThrow(workOrderId, organizationId);
        
        // 1. Delete dependent rows in other tables first
        await pgPool.query("delete from work_order_evidence where work_order_id = $1 and organization_id = $2", [workOrderId, organizationId]);
        await pgPool.query("delete from work_order_checklist where work_order_id = $1 and organization_id = $2", [workOrderId, organizationId]);
        await pgPool.query("delete from ai_artifacts where work_order_id = $1 and organization_id = $2", [workOrderId, organizationId]);
        await pgPool.query("delete from technical_report_versions where work_order_id = $1 and organization_id = $2", [workOrderId, organizationId]);
        
        // 2. Unlink from appointments
        await pgPool.query("update field_appointments set work_order_id = null where work_order_id = $1 and organization_id = $2", [workOrderId, organizationId]);
        
        // 3. Delete from in-memory cache and DB
        await workOrders.delete(workOrderId);
        await pgPool.query("delete from work_orders where id = $1 and organization_id = $2", [workOrderId, organizationId]);
        
        send(response, 200, { success: true });
        return;
      }
    }

    const statusMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/status$/);
    if (request.method === "PATCH" && statusMatch) {
      const payload = await readJson<{ organizationId: OrganizationId; state: WorkOrder["state"]; reason?: string }>(request);
      const workOrderId = statusMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await changeWorkOrderStatus(workOrder, payload, context(request, payload.organizationId), bus);
      await saveWorkOrderRecord(updated);
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
      await saveWorkOrderRecord(updated);
      send(response, 201, { workOrder: updated, timeline: await timeline.list({ organizationId: updated.organizationId, subjectId: updated.id }) });
      return;
    }

    const evidenceUploadMatch = url.pathname.match(/^\/maintenance\/work-orders\/([^/]+)\/evidence\/upload$/);
    if (request.method === "POST" && evidenceUploadMatch) {
      const payload = await readJson<Parameters<typeof uploadEvidence>[1] & { organizationId: OrganizationId }>(request);
      const workOrderId = evidenceUploadMatch[1] as EntityId;
      const workOrder = await findWorkOrderOrThrow(workOrderId, payload.organizationId);
      const updated = await uploadEvidence(workOrder, payload, context(request, payload.organizationId), bus);
      await saveWorkOrderRecord(updated);
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
      await saveWorkOrderRecord(updated);
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
      await saveWorkOrderRecord(updated);
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
      await saveWorkOrderRecord(updated);
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

      await saveWorkOrderRecord(updated);
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

await migratePostgres();

server.listen(port, () => {
  console.log(`Atlas API listening on http://localhost:${port}`);
  console.log(`Atlas API persistence connected to ${databaseUrl}`);
});
