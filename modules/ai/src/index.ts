import type { EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, OperationalContext, OrganizationId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";

export type AiTaskKind =
  | "summarize"
  | "classify"
  | "recommend"
  | "extract"
  | "diagnose"
  | "checklist"
  | "budget"
  | "report";

export type AiRiskLevel = "low" | "medium" | "high" | "critical";

export interface AiTask {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly kind: AiTaskKind;
  readonly input: string;
  readonly createdAt: string;
}

export interface AiWorkOrderMemory {
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly assetKind: string;
  readonly assetCriticality?: string;
  readonly workOrderTitle: string;
  readonly workOrderDescription?: string;
  readonly priority?: string;
  readonly timeline: readonly {
    readonly title: string;
    readonly body?: string;
    readonly eventName: string;
    readonly occurredAt: string;
  }[];
}

export interface RequestAiTaskCommand {
  readonly organizationId: OrganizationId;
  readonly subjectId?: EntityId;
  readonly kind: AiTaskKind;
  readonly input: string;
}

export interface AiDiagnosis {
  readonly id: string;
  readonly likelyCause: string;
  readonly confidence: number;
  readonly recommendedAction: string;
  readonly safetyNote: string;
}

export interface AiChecklist {
  readonly id: string;
  readonly items: readonly string[];
}

export interface AiRiskClassification {
  readonly id: string;
  readonly level: AiRiskLevel;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface AiBudgetDraft {
  readonly id: string;
  readonly currency: string;
  readonly estimatedMin: number;
  readonly estimatedMax: number;
  readonly suggestedMaterials: readonly {
    readonly name: string;
    readonly quantity: number;
    readonly unitPrice: number;
  }[];
  readonly laborHours: number;
  readonly durationHours: number;
  readonly riskLevel: AiRiskLevel;
  readonly suggestedPrice: number;
  readonly lineItems: readonly {
    readonly label: string;
    readonly amount: number;
  }[];
  readonly assumptions: readonly string[];
}

export interface AiTimelineSummary {
  readonly id: string;
  readonly summary: string;
  readonly nextBestActions: readonly string[];
}

export interface TechnicalReport {
  readonly id: string;
  readonly title: string;
  readonly html: string;
  readonly pdfBase64: string;
  readonly generatedAt: string;
}

export async function requestAiTask(command: RequestAiTaskCommand, context: OperationalContext, bus: EventBus): Promise<AiTask> {
  const task: AiTask = {
    id: createId("ait"),
    organizationId: command.organizationId,
    kind: command.kind,
    input: command.input,
    createdAt: systemClock.now()
  };

  await bus.publish(
    createEvent(
      "AiSuggestionCreated",
      {
        taskId: task.id,
        organizationId: task.organizationId,
        subjectId: command.subjectId,
        suggestion: command.input,
        title: "IA sugeriu intervencao",
        body: command.input,
        kind: "ai_suggestion",
        metadata: { aiTaskKind: command.kind }
      },
      context,
      { organizationId: task.organizationId, sourceModule: "ai", ...(command.subjectId ? { subjectId: command.subjectId } : {}) }
    )
  );
  return task;
}

export async function suggestDiagnosis(memory: AiWorkOrderMemory, context: OperationalContext, bus: EventBus): Promise<AiDiagnosis> {
  const text = memoryText(memory);
  const likelyCause = text.includes("vibracao") || text.includes("ruido")
    ? "Possivel desalinhamento, cavitacao ou desgaste de rolamento."
    : text.includes("pressao") || text.includes("vazamento")
      ? "Possivel vazamento, obstrucao ou falha de vedacao."
      : "Falha operacional ainda inconclusiva; coletar evidencias adicionais.";
  const diagnosis: AiDiagnosis = {
    id: createId("aid"),
    likelyCause,
    confidence: likelyCause.includes("inconclusiva") ? 0.48 : 0.74,
    recommendedAction: "Validar em campo antes de aprovar custo, fechar OS ou executar acao critica.",
    safetyNote: "IA assistiva: nao aprova, nao fecha e nao executa automaticamente."
  };

  await bus.publish(
    createEvent(
      "AiDiagnosisSuggested",
      {
        diagnosisId: diagnosis.id,
        organizationId: memory.organizationId,
        subjectId: memory.subjectId,
        title: "IA sugeriu diagnostico",
        body: diagnosis.likelyCause,
        kind: "ai_suggestion",
        metadata: diagnosis as unknown as Record<string, unknown>
      },
      context,
      { organizationId: memory.organizationId, subjectId: memory.subjectId, sourceModule: "ai" }
    )
  );

  return diagnosis;
}

export async function generateChecklist(memory: AiWorkOrderMemory, context: OperationalContext, bus: EventBus): Promise<AiChecklist> {
  const base = checklistFor(memory.assetKind);
  const items = memory.priority === "urgent" || memory.assetCriticality === "critical"
    ? ["Isolar area e validar risco operacional", ...base, "Registrar evidencia final antes de liberar"]
    : base;
  const checklist: AiChecklist = { id: createId("aic"), items };

  await bus.publish(
    createEvent(
      "AiChecklistGenerated",
      {
        checklistId: checklist.id,
        organizationId: memory.organizationId,
        subjectId: memory.subjectId,
        title: "IA gerou checklist sugerido",
        body: checklist.items.join("; "),
        kind: "ai_suggestion",
        metadata: { items: checklist.items }
      },
      context,
      { organizationId: memory.organizationId, subjectId: memory.subjectId, sourceModule: "ai" }
    )
  );

  return checklist;
}

export async function classifyRisk(memory: AiWorkOrderMemory, context: OperationalContext, bus: EventBus): Promise<AiRiskClassification> {
  const reasons: string[] = [];
  let score = 20;

  if (memory.assetCriticality === "critical") {
    score += 35;
    reasons.push("Ativo critico.");
  }

  if (memory.priority === "urgent") {
    score += 30;
    reasons.push("OS urgente.");
  }

  if (memoryText(memory).includes("vibracao") || memoryText(memory).includes("vazamento")) {
    score += 20;
    reasons.push("Timeline indica sintoma relevante.");
  }

  const level: AiRiskLevel = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 35 ? "medium" : "low";
  const risk: AiRiskClassification = { id: createId("air"), level, score: Math.min(score, 100), reasons };

  await bus.publish(
    createEvent(
      "AiRiskClassified",
      {
        riskId: risk.id,
        organizationId: memory.organizationId,
        subjectId: memory.subjectId,
        title: `IA classificou risco: ${risk.level}`,
        body: risk.reasons.join(" "),
        kind: "ai_suggestion",
        metadata: risk as unknown as Record<string, unknown>
      },
      context,
      { organizationId: memory.organizationId, subjectId: memory.subjectId, sourceModule: "ai" }
    )
  );

  return risk;
}

export async function draftBudget(memory: AiWorkOrderMemory, context: OperationalContext, bus: EventBus): Promise<AiBudgetDraft> {
  const text = memoryText(memory);
  const isBearingPumpWork = text.includes("rolamento") && (text.includes("bomba") || text.includes("centrifuga"));
  const urgencyFactor = memory.priority === "urgent" ? 1.2 : 1;
  const criticalityFactor = memory.assetCriticality === "critical" ? 1.25 : 1;
  const factor = urgencyFactor * criticalityFactor;
  const suggestedMaterials = isBearingPumpWork
    ? [
        { name: "Rolamento compativel com bomba centrifuga", quantity: 1, unitPrice: 420 },
        { name: "Retentor ou selo mecanico", quantity: 1, unitPrice: 260 },
        { name: "Graxa tecnica e consumiveis", quantity: 1, unitPrice: 85 }
      ]
    : [
        { name: "Pecas e consumiveis a confirmar em campo", quantity: 1, unitPrice: memory.assetKind === "equipment" ? 900 : 420 }
      ];
  const materialsTotal = Math.round(suggestedMaterials.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * factor);
  const laborHours = isBearingPumpWork ? 5 : memory.assetKind === "equipment" ? 4 : 2;
  const durationHours = Math.ceil(laborHours * (memory.priority === "urgent" ? 0.9 : 1.15));
  const labor = Math.round(laborHours * 165 * factor);
  const risk = await classifyRisk(memory, context, bus);
  const subtotal = materialsTotal + labor;
  const suggestedPrice = Math.round(subtotal * 1.28);
  const budget: AiBudgetDraft = {
    id: createId("aib"),
    currency: "BRL",
    estimatedMin: Math.round(subtotal * 0.92),
    estimatedMax: Math.round(suggestedPrice * 1.12),
    suggestedMaterials,
    laborHours,
    durationHours,
    riskLevel: risk.level,
    suggestedPrice,
    lineItems: [
      { label: "Mao de obra tecnica", amount: labor },
      { label: "Materiais estimados", amount: materialsTotal },
      { label: "Margem tecnica e risco", amount: suggestedPrice - subtotal }
    ],
    assumptions: [
      "Composicao preliminar baseada na descricao da OS, ativo, prioridade e criticidade.",
      "Exige validacao humana de codigo de material, preco e escopo antes da aprovacao.",
      "Nao representa execucao automatica nem aprovacao de orcamento."
    ]
  };

  await bus.publish(
    createEvent(
      "AiBudgetDrafted",
      {
        budgetDraftId: budget.id,
        organizationId: memory.organizationId,
        subjectId: memory.subjectId,
        title: "IA gerou orcamento preliminar",
        body: `${budget.currency} ${budget.estimatedMin} - ${budget.estimatedMax}`,
        kind: "ai_suggestion",
        metadata: budget as unknown as Record<string, unknown>
      },
      context,
      { organizationId: memory.organizationId, subjectId: memory.subjectId, sourceModule: "ai" }
    )
  );

  return budget;
}

export async function summarizeTimeline(memory: AiWorkOrderMemory, context: OperationalContext, bus: EventBus): Promise<AiTimelineSummary> {
  const latest = memory.timeline.slice(0, 5).map((entry) => entry.title).join(", ");
  const summary: AiTimelineSummary = {
    id: createId("ais"),
    summary: `OS ${memory.workOrderTitle}: ${latest || "sem eventos operacionais suficientes"}.`,
    nextBestActions: ["Validar diagnostico em campo", "Confirmar evidencias", "Submeter aprovacao humana se houver custo"]
  };

  await bus.publish(
    createEvent(
      "AiTimelineSummarized",
      {
        summaryId: summary.id,
        organizationId: memory.organizationId,
        subjectId: memory.subjectId,
        title: "IA resumiu timeline",
        body: summary.summary,
        kind: "ai_suggestion",
        metadata: { nextBestActions: summary.nextBestActions }
      },
      context,
      { organizationId: memory.organizationId, subjectId: memory.subjectId, sourceModule: "ai" }
    )
  );

  return summary;
}

export async function generateTechnicalReport(memory: AiWorkOrderMemory, context: OperationalContext, bus: EventBus): Promise<TechnicalReport> {
  const generatedAt = systemClock.now();
  const title = `Relatorio tecnico - ${memory.workOrderTitle}`;
  const rows = memory.timeline
    .map((entry) => `<li><strong>${escapeHtml(entry.title)}</strong>${entry.body ? ` - ${escapeHtml(entry.body)}` : ""}</li>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><p>Gerado em ${generatedAt}</p><h2>Resumo operacional</h2><p>Relatorio assistivo gerado a partir da timeline. Requer revisao tecnica humana.</p><h2>Timeline</h2><ul>${rows}</ul></body></html>`;
  const pdfText = `%PDF-1.1\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF`;
  const report: TechnicalReport = {
    id: createId("airp"),
    title,
    html,
    pdfBase64: Buffer.from(pdfText, "utf8").toString("base64"),
    generatedAt
  };

  await bus.publish(
    createEvent(
      "TechnicalReportGenerated",
      {
        reportId: report.id,
        organizationId: memory.organizationId,
        subjectId: memory.subjectId,
        title: "Relatorio tecnico gerado",
        body: "Relatorio HTML/PDF assistivo gerado a partir da timeline.",
        kind: "system",
        metadata: { reportTitle: report.title, generatedAt: report.generatedAt }
      },
      context,
      { organizationId: memory.organizationId, subjectId: memory.subjectId, sourceModule: "ai" }
    )
  );

  return report;
}

function checklistFor(assetKind: string): readonly string[] {
  if (assetKind === "equipment") {
    return ["Verificar alimentacao", "Inspecionar ruido/vibracao", "Checar temperatura", "Registrar fotos", "Validar retorno operacional"];
  }

  if (assetKind === "facility") {
    return ["Isolar local", "Avaliar acesso e seguranca", "Registrar condicao inicial", "Executar inspecao visual", "Liberar area"];
  }

  if (assetKind === "vehicle") {
    return ["Checar hodometro", "Verificar fluidos", "Inspecionar pneus/freios", "Registrar evidencia", "Validar teste operacional"];
  }

  return ["Inspecionar ativo", "Registrar evidencia", "Classificar risco", "Recomendar proxima acao"];
}

function memoryText(memory: AiWorkOrderMemory): string {
  return [
    memory.workOrderTitle,
    memory.workOrderDescription,
    ...memory.timeline.flatMap((entry) => [entry.title, entry.body])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
