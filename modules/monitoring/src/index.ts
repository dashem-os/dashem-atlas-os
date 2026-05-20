import type { DomainEvent, EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, ISODateTime, OperationalContext, OrganizationId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";
import type { TimelineEntry } from "@atlas/module-timeline";

export type OperationalAlertSeverity = "info" | "warning" | "critical";
export type HealthSubjectType = "asset" | "work_order";

export interface HealthScore {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly subjectType: HealthSubjectType;
  readonly score: number;
  readonly grade: "healthy" | "watch" | "risk" | "critical";
  readonly reasons: readonly string[];
  readonly recalculatedAt: ISODateTime;
}

export interface OperationalAlert {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly eventName: string;
  readonly severity: OperationalAlertSeverity;
  readonly title: string;
  readonly body: string;
  readonly detectedAt: ISODateTime;
  readonly metadata: Record<string, unknown>;
}

export interface MonitoringSnapshot {
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly subjectType?: HealthSubjectType;
  readonly assetId?: EntityId;
  readonly timeline: readonly TimelineEntry[];
}

export interface MonitoringResult {
  readonly healthScores: readonly HealthScore[];
  readonly alerts: readonly OperationalAlert[];
}

const monitoringEvents = new Set([
  "OperationalRiskDetected",
  "SlaViolationPredicted",
  "RecurringFailureDetected",
  "MissingEvidenceDetected",
  "DelayedWorkOrderDetected",
  "HealthScoreRecalculated"
]);

export function shouldMonitorEvent(event: DomainEvent): boolean {
  return Boolean(
    event.metadata.organizationId &&
      event.metadata.subjectId &&
      event.metadata.sourceModule !== "operations" &&
      !monitoringEvents.has(event.name)
  );
}

export async function evaluateOperationalAwareness(
  snapshot: MonitoringSnapshot,
  context: OperationalContext,
  bus: EventBus
): Promise<MonitoringResult> {
  const alerts = detectAlerts(snapshot);
  const subjectType = snapshot.subjectType ?? "work_order";
  const subjectScore = calculateHealthScore(snapshot.organizationId, snapshot.subjectId, subjectType, snapshot.timeline, alerts);
  const scores = snapshot.assetId && subjectType === "work_order"
    ? [
        subjectScore,
        calculateHealthScore(snapshot.organizationId, snapshot.assetId, "asset", snapshot.timeline, alerts)
      ]
    : [subjectScore];

  for (const score of scores) {
    await bus.publish(
      createEvent(
        "HealthScoreRecalculated",
        {
          scoreId: score.id,
          organizationId: score.organizationId,
          subjectId: score.subjectId,
          title: `Health score recalculado: ${score.score}`,
          body: score.reasons.join(" "),
          kind: "system",
          metadata: { subjectType: score.subjectType, score: score.score, grade: score.grade }
        },
        context,
        { organizationId: score.organizationId, subjectId: score.subjectId, sourceModule: "monitoring" }
      )
    );
  }

  for (const alert of alerts) {
    await bus.publish(
      createEvent(
        alert.eventName,
        {
          alertId: alert.id,
          organizationId: alert.organizationId,
          subjectId: alert.subjectId,
          title: alert.title,
          body: alert.body,
          kind: "system",
          metadata: alert.metadata
        },
        context,
        { organizationId: alert.organizationId, subjectId: alert.subjectId, sourceModule: "monitoring" }
      )
    );
  }

  return { healthScores: scores, alerts };
}

function detectAlerts(snapshot: MonitoringSnapshot): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const text = snapshot.timeline.map((entry) => `${entry.eventName} ${entry.title} ${entry.body ?? ""}`).join(" ").toLowerCase();
  const hasEvidence = snapshot.timeline.some((entry) => entry.eventName === "EvidenceUploaded" || entry.eventName === "EvidenceAttached");
  const hasOpened = snapshot.timeline.some((entry) => entry.eventName === "WorkOrderOpened");
  const hasClosed = snapshot.timeline.some((entry) => entry.eventName === "WorkOrderClosed");
  const hasBudget = snapshot.timeline.some((entry) => entry.eventName === "BudgetSubmitted");
  const evidenceMissingSignals = hasOpened && !hasEvidence && (text.includes("diagnostico") || text.includes("risco") || text.includes("orcamento"));
  const failureWords = ["vibracao", "vazamento", "ruido", "aquecimento", "falha"];
  const recurringHits = failureWords.filter((word) => occurrences(text, word) >= 2);
  const delayed = hasOpened && !hasClosed && snapshot.timeline.length >= 6;
  const operationalRisk = text.includes("critical") || text.includes("urgente") || text.includes("critico") || text.includes("risco");

  if (operationalRisk) {
    alerts.push(createAlert(snapshot, "OperationalRiskDetected", "critical", "Risco operacional detectado", "Timeline indica sinais de risco operacional.", { signals: ["risk", "criticality"] }));
  }

  if (hasBudget && !text.includes("budgetapproved") && !text.includes("orcamento aprovado")) {
    alerts.push(createAlert(snapshot, "SlaViolationPredicted", "warning", "Possivel violacao de SLA prevista", "Orcamento submetido ainda sem aprovacao registrada na timeline.", { trigger: "budget_without_approval" }));
  }

  if (recurringHits.length > 0) {
    alerts.push(createAlert(snapshot, "RecurringFailureDetected", "warning", "Falha recorrente detectada", `Sinais repetidos: ${recurringHits.join(", ")}.`, { recurringSignals: recurringHits }));
  }

  if (evidenceMissingSignals) {
    alerts.push(createAlert(snapshot, "MissingEvidenceDetected", "warning", "Evidencia ausente detectada", "A timeline possui decisao/sugestao sem evidencia operacional vinculada.", { trigger: "decision_without_evidence" }));
  }

  if (delayed) {
    alerts.push(createAlert(snapshot, "DelayedWorkOrderDetected", "warning", "OS potencialmente atrasada", "OS acumulou eventos relevantes sem fechamento.", { timelineEvents: snapshot.timeline.length }));
  }

  return dedupeAlerts(alerts);
}

function calculateHealthScore(
  organizationId: OrganizationId,
  subjectId: EntityId,
  subjectType: HealthSubjectType,
  timeline: readonly TimelineEntry[],
  alerts: readonly OperationalAlert[]
): HealthScore {
  const reasons: string[] = [];
  let score = 100;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const warningAlerts = alerts.filter((alert) => alert.severity === "warning").length;

  score -= criticalAlerts * 30;
  score -= warningAlerts * 15;

  if (subjectType === "work_order" && !timeline.some((entry) => entry.eventName === "EvidenceUploaded" || entry.eventName === "EvidenceAttached")) {
    score -= 10;
    reasons.push("Sem evidencia operacional vinculada.");
  }

  if (timeline.some((entry) => entry.eventName === "WorkOrderClosed")) {
    score += 10;
    reasons.push("OS encerrada.");
  }

  if (criticalAlerts > 0) {
    reasons.push(`${criticalAlerts} alerta(s) critico(s).`);
  }

  if (warningAlerts > 0) {
    reasons.push(`${warningAlerts} alerta(s) de atencao.`);
  }

  const bounded = Math.max(0, Math.min(100, score));
  return {
    id: createId("hsc"),
    organizationId,
    subjectId,
    subjectType,
    score: bounded,
    grade: bounded >= 85 ? "healthy" : bounded >= 65 ? "watch" : bounded >= 40 ? "risk" : "critical",
    reasons: reasons.length ? reasons : ["Operacao sem sinais relevantes de risco."],
    recalculatedAt: systemClock.now()
  };
}

function createAlert(
  snapshot: MonitoringSnapshot,
  eventName: string,
  severity: OperationalAlertSeverity,
  title: string,
  body: string,
  metadata: Record<string, unknown>
): OperationalAlert {
  return {
    id: createId("alt"),
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    eventName,
    severity,
    title,
    body,
    detectedAt: systemClock.now(),
    metadata
  };
}

function dedupeAlerts(alerts: OperationalAlert[]): OperationalAlert[] {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    const key = `${alert.eventName}:${alert.subjectId}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function occurrences(text: string, word: string): number {
  return text.split(word).length - 1;
}
