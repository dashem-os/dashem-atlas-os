import type { DomainEvent, EventBus, EventOriginModule } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, ISODateTime, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type TimelineEntryKind =
  | "status"
  | "comment"
  | "attachment"
  | "ai_suggestion"
  | "approval"
  | "system";

export interface TimelineEntry {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly occurredAt: ISODateTime;
  readonly actorId?: UserId;
  readonly sourceModule: EventOriginModule;
  readonly eventName: string;
  readonly kind: TimelineEntryKind;
  readonly title: string;
  readonly body?: string;
  readonly metadata: Record<string, unknown>;
}

export interface TimelineQuery {
  readonly organizationId: OrganizationId;
  readonly subjectId?: EntityId;
  readonly limit?: number;
}

export interface TimelineRepository {
  append(entry: TimelineEntry): Promise<TimelineEntry>;
  list(query: TimelineQuery): Promise<readonly TimelineEntry[]>;
}

export class InMemoryTimelineRepository implements TimelineRepository {
  private readonly entries: TimelineEntry[] = [];

  async append(entry: TimelineEntry): Promise<TimelineEntry> {
    this.entries.push(entry);
    return entry;
  }

  async list(query: TimelineQuery): Promise<readonly TimelineEntry[]> {
    const limit = query.limit ?? 100;
    return this.entries
      .filter((entry) => entry.organizationId === query.organizationId)
      .filter((entry) => (query.subjectId ? entry.subjectId === query.subjectId : true))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, limit);
  }
}

export interface AddTimelineEntryCommand {
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly actorId?: UserId;
  readonly sourceModule: EventOriginModule;
  readonly kind: TimelineEntryKind;
  readonly title: string;
  readonly body?: string;
  readonly metadata?: Record<string, unknown>;
}

export async function addTimelineEntry(
  command: AddTimelineEntryCommand,
  context: OperationalContext,
  bus: EventBus,
  repository: TimelineRepository
): Promise<TimelineEntry> {
  const entry = toTimelineEntry(
    createEvent(
      "timeline.entry_added",
      {
        title: command.title,
        body: command.body,
        kind: command.kind,
        metadata: command.metadata ?? {}
      },
      context,
      {
        organizationId: command.organizationId,
        subjectId: command.subjectId,
        sourceModule: command.sourceModule,
        ...(command.actorId ? { actorId: command.actorId } : {})
      }
    )
  );

  await repository.append(entry);
  await bus.publish(
    createEvent(
      "timeline.entry_recorded",
      { entryId: entry.id, organizationId: entry.organizationId, subjectId: entry.subjectId },
      context,
      {
        organizationId: entry.organizationId,
        subjectId: entry.subjectId,
        sourceModule: "timeline",
        ...(entry.actorId ? { actorId: entry.actorId } : {})
      }
    )
  );

  return entry;
}

export function attachPhotoTitle(fileName: string): string {
  return `Foto anexada: ${fileName}`;
}

export function toTimelineEntry(event: DomainEvent): TimelineEntry {
  const organizationId = event.metadata.organizationId;
  const subjectId = event.metadata.subjectId;

  if (!organizationId || !subjectId) {
    throw new Error(`Event ${event.name} cannot become a timeline entry without tenant and subject.`);
  }

  const payload = event.payload as {
    title?: string;
    body?: string;
    kind?: TimelineEntryKind;
    metadata?: Record<string, unknown>;
    workOrderId?: EntityId;
    projectId?: EntityId;
    suggestion?: string;
  };
  const body = payload.body ?? inferBody(event, payload);

  return {
    id: createId("tle"),
    organizationId,
    subjectId,
    occurredAt: event.occurredAt,
    sourceModule: event.metadata.sourceModule,
    eventName: event.name,
    kind: payload.kind ?? inferKind(event),
    title: payload.title ?? inferTitle(event),
    metadata: {
      eventId: event.id,
      requestId: event.context.requestId,
      ...(payload.metadata ?? {})
    },
    ...(body ? { body } : {}),
    ...(event.metadata.actorId ? { actorId: event.metadata.actorId } : {})
  };
}

export function bindTimelineProjection(bus: EventBus, repository: TimelineRepository): void {
  bus.subscribeAll(async (event) => {
    if (event.name.startsWith("timeline.")) {
      return;
    }

    if (!event.metadata.organizationId || !event.metadata.subjectId) {
      return;
    }

    await repository.append(toTimelineEntry(event));
  });
}

export function createBootstrapTimeline(
  organizationId: OrganizationId,
  subjectId: EntityId,
  actorId: UserId,
  context: OperationalContext
): readonly TimelineEntry[] {
  const base = {
    organizationId,
    subjectId,
    actorId,
    sourceModule: "maintenance" as const,
    metadata: {}
  };

  return [
    {
      id: createId("tle"),
      occurredAt: systemClock.now(),
      eventName: "maintenance.work_order_created",
      kind: "status",
      title: "Tecnico abriu OS",
      ...base,
      metadata: { requestId: context.requestId }
    },
    {
      id: createId("tle"),
      occurredAt: systemClock.now(),
      eventName: "maintenance.photo_attached",
      kind: "attachment",
      title: "Foto anexada",
      body: "Painel eletrico registrado em campo.",
      ...base
    },
    {
      id: createId("tle"),
      occurredAt: systemClock.now(),
      eventName: "ai.suggestion_created",
      sourceModule: "ai",
      kind: "ai_suggestion",
      title: "IA sugeriu cavitacao",
      body: "Verificar ruido, vibracao e historico do equipamento.",
      organizationId,
      subjectId,
      actorId,
      metadata: {}
    },
    {
      id: createId("tle"),
      occurredAt: systemClock.now(),
      eventName: "workflow.approval_granted",
      sourceModule: "workflow",
      kind: "approval",
      title: "Gestor aprovou orcamento",
      organizationId,
      subjectId,
      actorId,
      metadata: {}
    }
  ];
}

function inferKind(event: DomainEvent): TimelineEntryKind {
  const payload = event.payload as { kind?: TimelineEntryKind };

  if (payload.kind) {
    return payload.kind;
  }

  if (event.name.includes("photo") || event.name.includes("attachment")) {
    return "attachment";
  }

  if (event.name.startsWith("ai.") || event.name.startsWith("Ai")) {
    return "ai_suggestion";
  }

  if (event.name.startsWith("workflow.")) {
    return "approval";
  }

  return "status";
}

function inferTitle(event: DomainEvent): string {
  const payload = event.payload as { title?: string };

  if (payload.title) {
    return payload.title;
  }

  const titles: Record<string, string> = {
    AssetCreated: "Ativo criado",
    AssetUpdated: "Ativo atualizado",
    AssetArchived: "Ativo arquivado",
    WorkOrderOpened: "OS aberta",
    WorkOrderStatusChanged: "Status da OS alterado",
    EvidenceAttached: "Evidencia anexada",
    EvidenceUploaded: "Evidencia enviada",
    EvidenceOcrExtracted: "OCR extraido da evidencia",
    ChecklistItemUpdated: "Checklist atualizado",
    CommentAdded: "Comentario adicionado",
    AiSuggestionCreated: "IA sugeriu intervencao",
    AiDiagnosisSuggested: "IA sugeriu diagnostico",
    AiChecklistGenerated: "IA gerou checklist sugerido",
    AiRiskClassified: "IA classificou risco",
    AiBudgetDrafted: "IA gerou orcamento preliminar",
    AiTimelineSummarized: "IA resumiu timeline",
    TechnicalReportGenerated: "Relatorio tecnico gerado",
    ReportVersionCreated: "Versao de relatorio criada",
    ReportApproved: "Relatorio aprovado",
    ReportRejected: "Relatorio reprovado",
    HealthScoreRecalculated: "Health score recalculado",
    OperationalRiskDetected: "Risco operacional detectado",
    SlaViolationPredicted: "Violacao de SLA prevista",
    RecurringFailureDetected: "Falha recorrente detectada",
    MissingEvidenceDetected: "Evidencia ausente detectada",
    DelayedWorkOrderDetected: "OS atrasada detectada",
    WorkflowCoordinationStarted: "Coordenacao cognitiva iniciada",
    RiskEscalationSuggested: "Escalonamento de risco sugerido",
    SpecialistAssignmentRecommended: "Especialista recomendado",
    MissingContextRequested: "Contexto operacional solicitado",
    OperationalPlanGenerated: "Plano operacional gerado",
    HumanDecisionRequested: "Decisao humana solicitada",
    PredictiveRiskDetected: "Risco preditivo detectado",
    OperationalPatternIdentified: "Padrao operacional identificado",
    KnowledgeGraphRelationCreated: "Relacao operacional criada",
    DigitalTwinStateUpdated: "Digital twin operacional atualizado",
    KnowledgeGraphNodeCreated: "No operacional criado",
    KnowledgeGraphRelationPersisted: "Relacao operacional persistida",
    OperationalCausalityDetected: "Causalidade operacional detectada",
    DigitalTwinSnapshotCreated: "Snapshot do digital twin criado",
    DigitalTwinStatePersisted: "Estado operacional persistido",
    OperationalStateTransitionDetected: "Transicao operacional detectada",
    CognitiveWorkflowPersisted: "Workflow cognitivo persistido",
    OperationalReasoningCaptured: "Raciocinio operacional capturado",
    HumanDecisionContextStored: "Contexto de decisao humana armazenado",
    TimelineReplayStarted: "Replay temporal iniciado",
    OperationalContextReconstructed: "Contexto operacional reconstruido",
    HistoricalOperationalStateLoaded: "Estado historico carregado",
    RuntimeMetricCaptured: "Metrica do runtime capturada",
    OperationalTelemetryUpdated: "Telemetria operacional atualizada",
    CoordinationPerformanceMeasured: "Performance da coordenacao medida",
    OperationalForecastGenerated: "Forecast operacional gerado",
    FutureRiskPredicted: "Risco futuro previsto",
    OperationalImpactEstimated: "Impacto operacional estimado",
    CostEscalationPredicted: "Escalada de custo prevista",
    OperationalBottleneckDetected: "Gargalo operacional detectado",
    OperationalScenarioCreated: "Cenario operacional criado",
    OperationalScenarioSimulated: "Cenario operacional simulado",
    AlternativeOperationalPathGenerated: "Caminho alternativo gerado",
    ScenarioComparisonCompleted: "Comparacao de cenarios concluida",
    PreventiveActionSuggested: "Acao preventiva sugerida",
    ProactiveEscalationRecommended: "Escalonamento proativo recomendado",
    OperationalInterventionSuggested: "Intervencao operacional sugerida",
    PredictiveCoordinationTriggered: "Coordenacao preditiva acionada",
    OperationalPatternCorrelated: "Padrao operacional correlacionado",
    CausalOperationalRelationDetected: "Relacao causal operacional detectada",
    OperationalSimilarityIdentified: "Similaridade operacional identificada",
    TemporalAnalyticsGenerated: "Analytics temporal gerado",
    OperationalTrendDetected: "Tendencia operacional detectada",
    RiskEvolutionTracked: "Evolucao de risco rastreada",
    PredictionConfidenceCalculated: "Confianca de previsao calculada",
    OperationalExplanationGenerated: "Explicacao operacional gerada",
    HumanApprovalGateTriggered: "Gate de aprovacao humana acionado",
    BudgetSubmitted: "Orcamento enviado",
    BudgetApproved: "Orcamento aprovado",
    BudgetRejected: "Orcamento reprovado",
    WorkOrderClosed: "OS encerrada",
    "construction.project_created": "Obra criada",
    "workflow.approval_requested": "Aprovacao solicitada"
  };

  return titles[event.name] ?? event.name;
}

function inferBody(event: DomainEvent, payload: { suggestion?: string; body?: string }): string | undefined {
  if (payload.body) {
    return payload.body;
  }

  if (event.name === "AiSuggestionCreated") {
    return payload.suggestion;
  }

  return undefined;
}
