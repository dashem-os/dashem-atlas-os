import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, ISODateTime, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type ReportVersionState = "draft" | "approved" | "rejected";

export interface ReportTimelineEntry {
  readonly occurredAt: ISODateTime;
  readonly title: string;
  readonly body?: string;
  readonly eventName: string;
  readonly sourceModule: string;
}

export interface TechnicalReportVersion {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly workOrderId: EntityId;
  readonly version: number;
  readonly state: ReportVersionState;
  readonly title: string;
  readonly html: string;
  readonly pdfBase64: string;
  readonly timelineEventCount: number;
  readonly createdAt: ISODateTime;
  readonly createdBy?: UserId;
  readonly decidedAt?: ISODateTime;
  readonly decidedBy?: UserId;
  readonly decisionNotes?: string;
}

export interface CreateReportVersionCommand {
  readonly organizationId: OrganizationId;
  readonly workOrderId: EntityId;
  readonly workOrderTitle: string;
  readonly timeline: readonly ReportTimelineEntry[];
  readonly version: number;
  readonly createdBy?: UserId;
}

export interface DecideReportCommand {
  readonly decidedBy: UserId;
  readonly decision: "approved" | "rejected";
  readonly notes?: string;
}

export async function createReportVersion(
  command: CreateReportVersionCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<TechnicalReportVersion> {
  const createdAt = systemClock.now();
  const title = `Relatorio tecnico v${command.version} - ${command.workOrderTitle}`;
  const html = renderReportHtml(title, createdAt, command.timeline);
  const report: TechnicalReportVersion = {
    id: createId("rpt"),
    organizationId: command.organizationId,
    workOrderId: command.workOrderId,
    version: command.version,
    state: "draft",
    title,
    html,
    pdfBase64: renderPdfPlaceholder(title, command.timeline),
    timelineEventCount: command.timeline.length,
    createdAt,
    ...(command.createdBy ? { createdBy: command.createdBy } : {})
  };

  await bus.publish(
    createEvent(
      "ReportVersionCreated",
      {
        reportId: report.id,
        organizationId: report.organizationId,
        subjectId: report.workOrderId,
        title: `Versao ${report.version} do relatorio criada`,
        body: "Relatorio tecnico gerado a partir da timeline operacional.",
        kind: "system",
        metadata: { reportVersion: report.version, timelineEventCount: report.timelineEventCount }
      },
      context,
      { organizationId: report.organizationId, subjectId: report.workOrderId, sourceModule: "reports", ...(command.createdBy ? { actorId: command.createdBy } : {}) }
    )
  );

  return report;
}

export async function decideReportVersion(
  report: TechnicalReportVersion,
  command: DecideReportCommand,
  context: OperationalContext,
  bus: EventBus
): Promise<TechnicalReportVersion> {
  if (report.state === "approved") {
    throw new Error(`Approved report version ${report.id} is immutable.`);
  }

  const decided: TechnicalReportVersion = {
    ...report,
    state: command.decision,
    decidedAt: systemClock.now(),
    decidedBy: command.decidedBy,
    ...(command.notes ? { decisionNotes: command.notes } : {})
  };

  await bus.publish(
    createEvent(
      command.decision === "approved" ? "ReportApproved" : "ReportRejected",
      {
        reportId: decided.id,
        organizationId: decided.organizationId,
        subjectId: decided.workOrderId,
        title: command.decision === "approved" ? "Relatorio aprovado" : "Relatorio reprovado",
        body: command.notes,
        kind: "approval",
        metadata: { reportVersion: decided.version, decision: command.decision }
      },
      context,
      { organizationId: decided.organizationId, subjectId: decided.workOrderId, actorId: command.decidedBy, sourceModule: "reports" }
    )
  );

  return decided;
}

function renderReportHtml(title: string, createdAt: ISODateTime, timeline: readonly ReportTimelineEntry[]): string {
  const rows = timeline
    .map(
      (entry) =>
        `<tr><td>${escapeHtml(new Date(entry.occurredAt).toISOString())}</td><td>${escapeHtml(entry.sourceModule)}</td><td>${escapeHtml(entry.title)}</td><td>${escapeHtml(entry.body ?? "")}</td></tr>`
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;color:#202426}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f1f1f1}</style></head><body><h1>${escapeHtml(title)}</h1><p><strong>Gerado em:</strong> ${createdAt}</p><p>Relatorio versionado criado exclusivamente a partir da timeline operacional.</p><table><thead><tr><th>Data</th><th>Fonte</th><th>Evento</th><th>Detalhe</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function renderPdfPlaceholder(title: string, timeline: readonly ReportTimelineEntry[]): string {
  const text = `%PDF-1.1\n% ${title}\n% Timeline events: ${timeline.length}\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF`;
  return Buffer.from(text, "utf8").toString("base64");
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
