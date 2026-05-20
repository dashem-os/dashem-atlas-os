import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { DomainEvent, EventBus } from "@atlas/core-events";
import { createEvent } from "@atlas/core-events";
import type { EntityId, ISODateTime, OperationalContext, OrganizationId, UserId } from "@atlas/core-shared";
import { createId, systemClock } from "@atlas/core-shared";
import type { TimelineEntry } from "@atlas/module-timeline";

export type OperationalDomain = "maintenance" | "construction" | "facilities" | "logistics" | "compliance";
export type OperationalRiskLevel = "low" | "medium" | "high" | "critical";
export type OperationalDecisionBoundary = "recommendation_only" | "human_required";
export type KnowledgeNodeType =
  | "asset"
  | "work_order"
  | "technician"
  | "supplier"
  | "part"
  | "failure"
  | "sla"
  | "unit"
  | "evidence"
  | "workflow";

export type KnowledgeRelationType =
  | "opened_for_asset"
  | "assigned_to"
  | "supplied_by"
  | "requires_part"
  | "has_failure_signal"
  | "governed_by_sla"
  | "located_at"
  | "has_recurrence"
  | "has_evidence"
  | "requires_human_decision"
  | "coordinated_by_workflow";

export interface OperationalSubjectSnapshot {
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly domain: OperationalDomain;
  readonly timeline: readonly TimelineEntry[];
  readonly asset?: {
    readonly id: EntityId;
    readonly name: string;
    readonly kind: string;
    readonly criticality?: string;
    readonly location?: string;
  };
  readonly workOrder?: {
    readonly id: EntityId;
    readonly title: string;
    readonly description?: string;
    readonly priority?: string;
    readonly state?: string;
    readonly dueAt?: ISODateTime;
    readonly evidenceCount?: number;
    readonly checklistOpenCount?: number;
    readonly budgetState?: string;
  };
  readonly healthScore?: {
    readonly score: number;
    readonly grade: string;
    readonly reasons: readonly string[];
  };
  readonly alerts?: readonly {
    readonly eventName: string;
    readonly severity: string;
    readonly title: string;
  }[];
  readonly availableSpecialists?: readonly OperationalSpecialist[];
}

export interface OperationalSpecialist {
  readonly id: UserId;
  readonly name: string;
  readonly domains: readonly OperationalDomain[];
  readonly skills: readonly string[];
  readonly units?: readonly string[];
  readonly activeWorkOrders?: number;
}

export interface RuntimePermissions {
  readonly actorId?: UserId;
  readonly roles: readonly string[];
  readonly canCoordinate: boolean;
  readonly canRequestHumanDecision: boolean;
}

export interface OperationalReasoningStep {
  readonly id: EntityId;
  readonly agent: string;
  readonly inputRefs: readonly string[];
  readonly conclusion: string;
  readonly confidence: number;
}

export interface OperationalPlanAction {
  readonly id: EntityId;
  readonly type:
    | "prioritize"
    | "request_evidence"
    | "recommend_specialist"
    | "suggest_escalation"
    | "monitor_sla"
    | "request_human_decision";
  readonly title: string;
  readonly rationale: string;
  readonly decisionBoundary: OperationalDecisionBoundary;
}

export interface CognitiveWorkflowRun {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly domain: OperationalDomain;
  readonly startedAt: ISODateTime;
  readonly completedAt: ISODateTime;
  readonly riskLevel: OperationalRiskLevel;
  readonly priorityRecommendation: string;
  readonly escalationSuggested: boolean;
  readonly specialistRecommendation?: OperationalSpecialistRecommendation;
  readonly missingContextRequests: readonly MissingContextRequest[];
  readonly predictiveRisks: readonly PredictiveRisk[];
  readonly patternSignals: readonly OperationalPatternSignal[];
  readonly plan: readonly OperationalPlanAction[];
  readonly reasoningTrace: readonly OperationalReasoningStep[];
  readonly permissions: RuntimePermissions;
  readonly decisionBoundary: OperationalDecisionBoundary;
}

export interface OperationalSpecialistRecommendation {
  readonly specialistId?: UserId;
  readonly name?: string;
  readonly reason: string;
  readonly requiredSkills: readonly string[];
}

export interface MissingContextRequest {
  readonly evidenceKind: string;
  readonly reason: string;
  readonly requiredBefore: string;
}

export interface PredictiveRisk {
  readonly type: "failure" | "degradation" | "unavailability" | "delay" | "excessive_cost";
  readonly level: OperationalRiskLevel;
  readonly probability: number;
  readonly reasons: readonly string[];
}

export interface OperationalPatternSignal {
  readonly pattern: string;
  readonly confidence: number;
  readonly evidenceRefs: readonly string[];
}

export interface KnowledgeGraphRelation {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly from: EntityId;
  readonly fromType: KnowledgeNodeType;
  readonly to: EntityId;
  readonly toType: KnowledgeNodeType;
  readonly type: KnowledgeRelationType;
  readonly weight: number;
  readonly evidenceEventIds: readonly string[];
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly metadata: Record<string, unknown>;
}

export interface KnowledgeGraphNode {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly type: KnowledgeNodeType;
  readonly label: string;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
  readonly metadata: Record<string, unknown>;
}

export interface KnowledgeGraphRelationVersion {
  readonly id: EntityId;
  readonly relationId: EntityId;
  readonly organizationId: OrganizationId;
  readonly version: number;
  readonly validFrom: ISODateTime;
  readonly weight: number;
  readonly evidenceEventIds: readonly string[];
  readonly metadata: Record<string, unknown>;
}

export interface OperationalCausality {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly cause: string;
  readonly effect: string;
  readonly confidence: number;
  readonly evidenceRelationIds: readonly EntityId[];
  readonly detectedAt: ISODateTime;
}

export interface KnowledgeGraphRepository {
  upsert(relation: Omit<KnowledgeGraphRelation, "id" | "createdAt" | "updatedAt">): Promise<KnowledgeGraphRelation>;
  list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly KnowledgeGraphRelation[]>;
  listNodes?(organizationId: OrganizationId): Promise<readonly KnowledgeGraphNode[]>;
  listVersions?(organizationId: OrganizationId, relationId?: EntityId): Promise<readonly KnowledgeGraphRelationVersion[]>;
  listCausalities?(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalCausality[]>;
}

export interface OperationalDigitalTwinState {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly domain: OperationalDomain;
  readonly updatedAt: ISODateTime;
  readonly assets: readonly EntityId[];
  readonly riskLevel: OperationalRiskLevel;
  readonly slaState: "unknown" | "on_track" | "at_risk" | "violated";
  readonly activeWorkflows: readonly EntityId[];
  readonly evidenceState: "missing" | "partial" | "sufficient";
  readonly healthScore: number;
  readonly responsibleIds: readonly UserId[];
  readonly alertEventNames: readonly string[];
  readonly historyEventNames: readonly string[];
  readonly pendingHumanDecision: boolean;
}

export interface DigitalTwinRepository {
  save(state: OperationalDigitalTwinState): Promise<OperationalDigitalTwinState>;
  list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalDigitalTwinState[]>;
  snapshots?(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalDigitalTwinState[]>;
}

export interface CognitiveCoordinationRecord {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly workflowRunId: EntityId;
  readonly domain: OperationalDomain;
  readonly capturedAt: ISODateTime;
  readonly contextEventIds: readonly string[];
  readonly riskLevel: OperationalRiskLevel;
  readonly priorityRecommendation: string;
  readonly escalationSuggested: boolean;
  readonly humanDecisionRequested: boolean;
  readonly specialistRecommendation?: OperationalSpecialistRecommendation;
  readonly missingContextRequests: readonly MissingContextRequest[];
  readonly predictiveRisks: readonly PredictiveRisk[];
  readonly plan: readonly OperationalPlanAction[];
  readonly reasoningTrace: readonly OperationalReasoningStep[];
  readonly explanation: string;
}

export interface CognitiveWorkflowHistoryRepository {
  save(record: CognitiveCoordinationRecord): Promise<CognitiveCoordinationRecord>;
  list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly CognitiveCoordinationRecord[]>;
}

export interface RuntimeDiagnostic {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly capturedAt: ISODateTime;
  readonly metrics: {
    readonly totalCoordinations: number;
    readonly escalatedWorkflows: number;
    readonly pendingHumanDecisions: number;
    readonly averageRiskScore: number;
    readonly averageDecisionTimeMs: number;
    readonly missingEvidenceRequests: number;
  };
}

export type ScenarioKind = "delay" | "continue_operating" | "sla_missed" | "specialist_changed" | "missing_evidence";

export interface PredictionExplanation {
  readonly origin: readonly string[];
  readonly context: string;
  readonly causality: string;
  readonly expectedImpact: string;
}

export interface ForecastSignal {
  readonly id: EntityId;
  readonly type:
    | "operational_delay"
    | "asset_degradation"
    | "sla_impact"
    | "future_risk"
    | "unavailability"
    | "cost_escalation"
    | "probable_recurrence"
    | "operational_bottleneck";
  readonly horizonHours: number;
  readonly riskLevel: OperationalRiskLevel;
  readonly probability: number;
  readonly impactScore: number;
  readonly confidence: number;
  readonly explanation: PredictionExplanation;
}

export interface OperationalForecast {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly domain: OperationalDomain;
  readonly generatedAt: ISODateTime;
  readonly sourceEventIds: readonly string[];
  readonly signals: readonly ForecastSignal[];
  readonly recommendedCoordination: readonly OperationalPlanAction[];
  readonly approvalGate: {
    readonly required: boolean;
    readonly reason: string;
    readonly minimumConfidence: number;
  };
}

export interface OperationalScenario {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly domain: OperationalDomain;
  readonly kind: ScenarioKind;
  readonly title: string;
  readonly assumption: string;
  readonly createdAt: ISODateTime;
  readonly isolatedFromState: true;
}

export interface SimulatedScenarioResult {
  readonly id: EntityId;
  readonly scenarioId: EntityId;
  readonly simulatedAt: ISODateTime;
  readonly projectedRisk: OperationalRiskLevel;
  readonly projectedHealthScore: number;
  readonly projectedSlaState: OperationalDigitalTwinState["slaState"];
  readonly projectedCostMultiplier: number;
  readonly projectedImpact: string;
  readonly explanation: PredictionExplanation;
}

export interface ScenarioComparison {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly comparedAt: ISODateTime;
  readonly scenarioResults: readonly SimulatedScenarioResult[];
  readonly preferredScenarioId?: EntityId;
  readonly rationale: string;
}

export interface TemporalAnalytics {
  readonly id: EntityId;
  readonly organizationId: OrganizationId;
  readonly subjectId: EntityId;
  readonly generatedAt: ISODateTime;
  readonly riskEvolution: readonly { readonly occurredAt: ISODateTime; readonly riskScore: number; readonly eventName: string }[];
  readonly healthEvolution: readonly { readonly occurredAt: ISODateTime; readonly healthScore: number; readonly eventName: string }[];
  readonly averageResolutionHours: number;
  readonly recurrenceCount: number;
  readonly coordinationEfficiency: number;
  readonly pendingHumanDecisions: number;
  readonly degradationCurve: readonly number[];
  readonly trends: readonly string[];
}

export interface ForesightStore {
  readonly forecasts: OperationalForecast[];
  readonly scenarios: OperationalScenario[];
  readonly simulations: SimulatedScenarioResult[];
  readonly comparisons: ScenarioComparison[];
  readonly analytics: TemporalAnalytics[];
}

export interface ForesightRepository {
  saveForecast(forecast: OperationalForecast): Promise<OperationalForecast>;
  saveScenario(scenario: OperationalScenario): Promise<OperationalScenario>;
  saveSimulation(result: SimulatedScenarioResult): Promise<SimulatedScenarioResult>;
  saveComparison(comparison: ScenarioComparison): Promise<ScenarioComparison>;
  saveAnalytics(analytics: TemporalAnalytics): Promise<TemporalAnalytics>;
  listForecasts(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalForecast[]>;
  listScenarios(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalScenario[]>;
  listSimulations(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly SimulatedScenarioResult[]>;
  listComparisons(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly ScenarioComparison[]>;
  listAnalytics(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly TemporalAnalytics[]>;
}

interface KnowledgeGraphStore {
  readonly nodes: KnowledgeGraphNode[];
  readonly relations: KnowledgeGraphRelation[];
  readonly versions: KnowledgeGraphRelationVersion[];
  readonly causalities: OperationalCausality[];
}

interface DigitalTwinStore {
  readonly live: OperationalDigitalTwinState[];
  readonly snapshots: OperationalDigitalTwinState[];
}

export class InMemoryKnowledgeGraphRepository implements KnowledgeGraphRepository {
  private readonly relations = new Map<string, KnowledgeGraphRelation>();

  async upsert(relation: Omit<KnowledgeGraphRelation, "id" | "createdAt" | "updatedAt">): Promise<KnowledgeGraphRelation> {
    const key = `${relation.organizationId}:${relation.from}:${relation.type}:${relation.to}`;
    const current = this.relations.get(key);
    const now = systemClock.now();
    const next: KnowledgeGraphRelation = {
      ...relation,
      id: current?.id ?? createId("kgr"),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      evidenceEventIds: [...new Set([...(current?.evidenceEventIds ?? []), ...relation.evidenceEventIds])],
      weight: Math.max(current?.weight ?? 0, relation.weight),
      metadata: { ...(current?.metadata ?? {}), ...relation.metadata }
    };
    this.relations.set(key, next);
    return next;
  }

  async list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly KnowledgeGraphRelation[]> {
    return [...this.relations.values()]
      .filter((relation) => relation.organizationId === organizationId)
      .filter((relation) => (subjectId ? relation.from === subjectId || relation.to === subjectId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export class InMemoryDigitalTwinRepository implements DigitalTwinRepository {
  private readonly states = new Map<string, OperationalDigitalTwinState>();

  async save(state: OperationalDigitalTwinState): Promise<OperationalDigitalTwinState> {
    this.states.set(`${state.organizationId}:${state.subjectId}`, state);
    return state;
  }

  async list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalDigitalTwinState[]> {
    return [...this.states.values()]
      .filter((state) => state.organizationId === organizationId)
      .filter((state) => (subjectId ? state.subjectId === subjectId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export class JsonKnowledgeGraphRepository implements KnowledgeGraphRepository {
  constructor(private readonly filePath = join(process.cwd(), ".atlas-data", "knowledge-graph.json")) {}

  async upsert(relation: Omit<KnowledgeGraphRelation, "id" | "createdAt" | "updatedAt">): Promise<KnowledgeGraphRelation> {
    const store = await this.read();
    const now = systemClock.now();
    const current = store.relations.find((item) =>
      item.organizationId === relation.organizationId &&
      item.from === relation.from &&
      item.type === relation.type &&
      item.to === relation.to
    );
    const next: KnowledgeGraphRelation = {
      ...relation,
      id: current?.id ?? createId("kgr"),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      evidenceEventIds: [...new Set([...(current?.evidenceEventIds ?? []), ...relation.evidenceEventIds])],
      weight: Math.max(current?.weight ?? 0, relation.weight),
      metadata: { ...(current?.metadata ?? {}), ...relation.metadata }
    };
    const relationIndex = store.relations.findIndex((item) => item.id === next.id);
    const relations = relationIndex >= 0
      ? store.relations.map((item) => (item.id === next.id ? next : item))
      : [...store.relations, next];
    const nodes = upsertGraphNode(
      upsertGraphNode(store.nodes, relation.organizationId, relation.from, relation.fromType, relation.metadata),
      relation.organizationId,
      relation.to,
      relation.toType,
      relation.metadata
    );
    const currentVersions = store.versions.filter((item) => item.relationId === next.id);
    const version: KnowledgeGraphRelationVersion = {
      id: createId("kgv"),
      relationId: next.id,
      organizationId: relation.organizationId,
      version: currentVersions.length + 1,
      validFrom: now,
      weight: next.weight,
      evidenceEventIds: next.evidenceEventIds,
      metadata: next.metadata
    };
    const causalities = inferCausalities(relation.organizationId, relation.from, relations, [...store.causalities]);

    await this.write({ nodes, relations, versions: [...store.versions, version], causalities });
    return next;
  }

  async list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly KnowledgeGraphRelation[]> {
    const store = await this.read();
    return store.relations
      .filter((relation) => relation.organizationId === organizationId)
      .filter((relation) => (subjectId ? relation.from === subjectId || relation.to === subjectId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listNodes(organizationId: OrganizationId): Promise<readonly KnowledgeGraphNode[]> {
    const store = await this.read();
    return store.nodes.filter((node) => node.organizationId === organizationId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listVersions(organizationId: OrganizationId, relationId?: EntityId): Promise<readonly KnowledgeGraphRelationVersion[]> {
    const store = await this.read();
    return store.versions
      .filter((version) => version.organizationId === organizationId)
      .filter((version) => (relationId ? version.relationId === relationId : true))
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  }

  async listCausalities(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalCausality[]> {
    const store = await this.read();
    return store.causalities
      .filter((causality) => causality.organizationId === organizationId)
      .filter((causality) => (subjectId ? causality.subjectId === subjectId : true))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  private async read(): Promise<KnowledgeGraphStore> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as KnowledgeGraphStore;
    } catch {
      return { nodes: [], relations: [], versions: [], causalities: [] };
    }
  }

  private async write(store: KnowledgeGraphStore): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

export class JsonDigitalTwinRepository implements DigitalTwinRepository {
  constructor(private readonly filePath = join(process.cwd(), ".atlas-data", "digital-twin.json")) {}

  async save(state: OperationalDigitalTwinState): Promise<OperationalDigitalTwinState> {
    const store = await this.read();
    const live = store.live.filter((item) => !(item.organizationId === state.organizationId && item.subjectId === state.subjectId));
    await this.write({ live: [state, ...live], snapshots: [state, ...store.snapshots] });
    return state;
  }

  async list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalDigitalTwinState[]> {
    const store = await this.read();
    return store.live
      .filter((state) => state.organizationId === organizationId)
      .filter((state) => (subjectId ? state.subjectId === subjectId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async snapshots(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalDigitalTwinState[]> {
    const store = await this.read();
    return store.snapshots
      .filter((state) => state.organizationId === organizationId)
      .filter((state) => (subjectId ? state.subjectId === subjectId : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private async read(): Promise<DigitalTwinStore> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as DigitalTwinStore;
    } catch {
      return { live: [], snapshots: [] };
    }
  }

  private async write(store: DigitalTwinStore): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

export class JsonCognitiveWorkflowHistoryRepository implements CognitiveWorkflowHistoryRepository {
  constructor(private readonly filePath = join(process.cwd(), ".atlas-data", "cognitive-history.json")) {}

  async save(record: CognitiveCoordinationRecord): Promise<CognitiveCoordinationRecord> {
    const records = await this.read();
    await this.write([record, ...records.filter((item) => item.id !== record.id)]);
    return record;
  }

  async list(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly CognitiveCoordinationRecord[]> {
    const records = await this.read();
    return records
      .filter((record) => record.organizationId === organizationId)
      .filter((record) => (subjectId ? record.subjectId === subjectId : true))
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }

  private async read(): Promise<CognitiveCoordinationRecord[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as CognitiveCoordinationRecord[];
    } catch {
      return [];
    }
  }

  private async write(records: readonly CognitiveCoordinationRecord[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  }
}

export class JsonForesightRepository implements ForesightRepository {
  constructor(private readonly filePath = join(process.cwd(), ".atlas-data", "foresight.json")) {}

  async saveForecast(forecast: OperationalForecast): Promise<OperationalForecast> {
    const store = await this.read();
    await this.write({ ...store, forecasts: [forecast, ...store.forecasts.filter((item) => item.id !== forecast.id)] });
    return forecast;
  }

  async saveScenario(scenario: OperationalScenario): Promise<OperationalScenario> {
    const store = await this.read();
    await this.write({ ...store, scenarios: [scenario, ...store.scenarios.filter((item) => item.id !== scenario.id)] });
    return scenario;
  }

  async saveSimulation(result: SimulatedScenarioResult): Promise<SimulatedScenarioResult> {
    const store = await this.read();
    await this.write({ ...store, simulations: [result, ...store.simulations.filter((item) => item.id !== result.id)] });
    return result;
  }

  async saveComparison(comparison: ScenarioComparison): Promise<ScenarioComparison> {
    const store = await this.read();
    await this.write({ ...store, comparisons: [comparison, ...store.comparisons.filter((item) => item.id !== comparison.id)] });
    return comparison;
  }

  async saveAnalytics(analytics: TemporalAnalytics): Promise<TemporalAnalytics> {
    const store = await this.read();
    await this.write({ ...store, analytics: [analytics, ...store.analytics.filter((item) => item.id !== analytics.id)] });
    return analytics;
  }

  async listForecasts(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalForecast[]> {
    const store = await this.read();
    return store.forecasts
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => (subjectId ? item.subjectId === subjectId : true))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async listScenarios(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly OperationalScenario[]> {
    const store = await this.read();
    return store.scenarios
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => (subjectId ? item.subjectId === subjectId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listSimulations(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly SimulatedScenarioResult[]> {
    const store = await this.read();
    const scenarioIds = store.scenarios
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => (subjectId ? item.subjectId === subjectId : true))
      .map((item) => item.id);
    return store.simulations
      .filter((item) => scenarioIds.includes(item.scenarioId))
      .sort((a, b) => b.simulatedAt.localeCompare(a.simulatedAt));
  }

  async listComparisons(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly ScenarioComparison[]> {
    const store = await this.read();
    return store.comparisons
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => (subjectId ? item.subjectId === subjectId : true))
      .sort((a, b) => b.comparedAt.localeCompare(a.comparedAt));
  }

  async listAnalytics(organizationId: OrganizationId, subjectId?: EntityId): Promise<readonly TemporalAnalytics[]> {
    const store = await this.read();
    return store.analytics
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => (subjectId ? item.subjectId === subjectId : true))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  private async read(): Promise<ForesightStore> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as ForesightStore;
    } catch {
      return { forecasts: [], scenarios: [], simulations: [], comparisons: [], analytics: [] };
    }
  }

  private async write(store: ForesightStore): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

export async function executeCognitiveWorkflow(
  snapshot: OperationalSubjectSnapshot,
  permissions: RuntimePermissions,
  context: OperationalContext,
  bus: EventBus,
  knowledgeGraph: KnowledgeGraphRepository,
  digitalTwin: DigitalTwinRepository,
  history?: CognitiveWorkflowHistoryRepository
): Promise<CognitiveWorkflowRun> {
  if (!permissions.canCoordinate) {
    throw new Error("Cognitive runtime coordination requires explicit permission.");
  }

  if (snapshot.timeline.length === 0) {
    throw new Error("Cognitive runtime requires timeline memory before coordination.");
  }

  const runId = createId("cwf");
  const startedAt = systemClock.now();
  await publishOperationalEvent(
    bus,
    "WorkflowCoordinationStarted",
    snapshot,
    context,
    "Coordenacao cognitiva iniciada",
    "Runtime iniciou workflow a partir da timeline operacional.",
    { workflowRunId: runId, domain: snapshot.domain, timelineEvents: snapshot.timeline.length }
  );

  const text = timelineText(snapshot.timeline);
  const patternSignals = detectOperationalPatterns(snapshot, text);
  const missingContextRequests = detectMissingContext(snapshot, text);
  const predictiveRisks = predictOperationalRisks(snapshot, patternSignals, missingContextRequests);
  const riskLevel = classifyOperationalRisk(snapshot, predictiveRisks);
  const priorityRecommendation = recommendPriority(snapshot, riskLevel);
  const specialistRecommendation = recommendSpecialist(snapshot, patternSignals);
  const escalationSuggested = riskLevel === "critical" || riskLevel === "high" || isSlaAtRisk(snapshot);
  const decisionBoundary: OperationalDecisionBoundary = escalationSuggested || missingContextRequests.length > 0 ? "human_required" : "recommendation_only";
  const reasoningTrace = buildReasoningTrace(snapshot, patternSignals, predictiveRisks, missingContextRequests, riskLevel);
  const plan = buildOperationalPlan(
    priorityRecommendation,
    escalationSuggested,
    specialistRecommendation,
    missingContextRequests,
    predictiveRisks,
    decisionBoundary
  );

  for (const signal of patternSignals) {
    await publishOperationalEvent(
      bus,
      "OperationalPatternIdentified",
      snapshot,
      context,
      "Padrao operacional identificado",
      signal.pattern,
      { workflowRunId: runId, ...signal }
    );
  }

  for (const risk of predictiveRisks) {
    await publishOperationalEvent(
      bus,
      "PredictiveRiskDetected",
      snapshot,
      context,
      "Risco preditivo detectado",
      risk.reasons.join(" "),
      { workflowRunId: runId, ...risk }
    );
  }

  if (escalationSuggested) {
    await publishOperationalEvent(
      bus,
      "RiskEscalationSuggested",
      snapshot,
      context,
      "Escalonamento de risco sugerido",
      `Nivel de risco ${riskLevel}; decisao critica permanece humana.`,
      { workflowRunId: runId, riskLevel, priorityRecommendation }
    );
  }

  if (specialistRecommendation) {
    await publishOperationalEvent(
      bus,
      "SpecialistAssignmentRecommended",
      snapshot,
      context,
      "Especialista recomendado",
      specialistRecommendation.reason,
      { workflowRunId: runId, ...specialistRecommendation }
    );
  }

  for (const request of missingContextRequests) {
    await publishOperationalEvent(
      bus,
      "MissingContextRequested",
      snapshot,
      context,
      "Contexto operacional solicitado",
      request.reason,
      { workflowRunId: runId, ...request }
    );
  }

  await publishOperationalEvent(
    bus,
    "OperationalPlanGenerated",
    snapshot,
    context,
    "Plano operacional gerado",
    plan.map((action) => action.title).join("; "),
    { workflowRunId: runId, decisionBoundary, plan, reasoningTrace }
  );

  if (decisionBoundary === "human_required") {
    await publishOperationalEvent(
      bus,
      "HumanDecisionRequested",
      snapshot,
      context,
      "Decisao humana solicitada",
      "Runtime solicitou validacao humana antes de qualquer decisao critica.",
      { workflowRunId: runId, riskLevel, reasons: plan.map((action) => action.rationale) }
    );
  }

  await createWorkflowRelations(snapshot, runId, patternSignals, missingContextRequests, knowledgeGraph, context, bus);
  const previousTwinState = (await digitalTwin.list(snapshot.organizationId, snapshot.subjectId))[0];
  const twinState = buildDigitalTwinState(snapshot, runId, riskLevel, predictiveRisks, decisionBoundary);
  await digitalTwin.save(twinState);
  await publishOperationalEvent(
    bus,
    "DigitalTwinSnapshotCreated",
    snapshot,
    context,
    "Snapshot do digital twin criado",
    "Estado operacional persistido como ponto temporal reconstruivel.",
    { workflowRunId: runId, twinState }
  );
  await publishOperationalEvent(
    bus,
    "DigitalTwinStatePersisted",
    snapshot,
    context,
    "Estado do digital twin persistido",
    `Estado vivo persistido com risco ${riskLevel}.`,
    { workflowRunId: runId, stateId: twinState.id, riskLevel: twinState.riskLevel, healthScore: twinState.healthScore }
  );
  if (previousTwinState && previousTwinState.riskLevel !== twinState.riskLevel) {
    await publishOperationalEvent(
      bus,
      "OperationalStateTransitionDetected",
      snapshot,
      context,
      "Transicao de estado operacional detectada",
      `Risco mudou de ${previousTwinState.riskLevel} para ${twinState.riskLevel}.`,
      { workflowRunId: runId, from: previousTwinState.riskLevel, to: twinState.riskLevel }
    );
  }
  await publishOperationalEvent(
    bus,
    "DigitalTwinStateUpdated",
    snapshot,
    context,
    "Digital twin operacional atualizado",
    `Estado vivo atualizado com risco ${riskLevel} e health score ${twinState.healthScore}.`,
    { workflowRunId: runId, twinState }
  );

  const run: CognitiveWorkflowRun = {
    id: runId,
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    domain: snapshot.domain,
    startedAt,
    completedAt: systemClock.now(),
    riskLevel,
    priorityRecommendation,
    escalationSuggested,
    ...(specialistRecommendation ? { specialistRecommendation } : {}),
    missingContextRequests,
    predictiveRisks,
    patternSignals,
    plan,
    reasoningTrace,
    permissions,
    decisionBoundary
  };

  if (history) {
    const record = await history.save(toCoordinationRecord(run, snapshot));
    await publishOperationalEvent(
      bus,
      "CognitiveWorkflowPersisted",
      snapshot,
      context,
      "Workflow cognitivo persistido",
      record.explanation,
      { workflowRunId: run.id, recordId: record.id }
    );
    await publishOperationalEvent(
      bus,
      "OperationalReasoningCaptured",
      snapshot,
      context,
      "Raciocinio operacional capturado",
      run.reasoningTrace.map((step) => step.conclusion).join(" "),
      { workflowRunId: run.id, reasoningTrace: run.reasoningTrace }
    );
    if (run.decisionBoundary === "human_required") {
      await publishOperationalEvent(
        bus,
        "HumanDecisionContextStored",
        snapshot,
        context,
        "Contexto de decisao humana armazenado",
        "Contexto operacional persistido para avaliacao humana posterior.",
        { workflowRunId: run.id, recordId: record.id, plan: run.plan }
      );
    }
  }

  await publishRuntimeMetric(snapshot, context, bus, "coordination.completed", 1, { workflowRunId: run.id });
  await publishRuntimeMetric(snapshot, context, bus, "coordination.risk_score", riskScore(riskLevel), { workflowRunId: run.id });

  return run;
}

export async function ingestEventIntoKnowledgeGraph(
  event: DomainEvent,
  repository: KnowledgeGraphRepository,
  bus: EventBus
): Promise<readonly KnowledgeGraphRelation[]> {
  if (
    !event.metadata.organizationId ||
    !event.metadata.subjectId ||
    event.metadata.sourceModule === "operations" ||
    event.metadata.sourceModule === "monitoring" ||
    event.metadata.sourceModule === "timeline"
  ) {
    return [];
  }

  const payload = event.payload as Record<string, unknown>;
  const relations: Omit<KnowledgeGraphRelation, "id" | "createdAt" | "updatedAt">[] = [];
  const subjectId = event.metadata.subjectId;
  const organizationId = event.metadata.organizationId;

  if (event.name === "WorkOrderOpened" && typeof payload.metadata === "object" && payload.metadata) {
    const metadata = payload.metadata as Record<string, unknown>;
    if (typeof metadata.assetId === "string") {
      relations.push(baseRelation(organizationId, subjectId, "work_order", metadata.assetId as EntityId, "asset", "opened_for_asset", event.id));
    }
  }

  if ((event.name === "EvidenceAttached" || event.name === "EvidenceUploaded") && typeof payload.evidenceId === "string") {
    relations.push(baseRelation(organizationId, subjectId, "work_order", payload.evidenceId as EntityId, "evidence", "has_evidence", event.id));
  }

  if (event.name === "MissingEvidenceDetected" || event.name === "MissingContextRequested") {
    relations.push(baseRelation(organizationId, subjectId, "work_order", createId("evd"), "evidence", "requires_human_decision", event.id));
  }

  const created: KnowledgeGraphRelation[] = [];
  for (const relation of relations) {
    const saved = await repository.upsert(relation);
    created.push(saved);
    await publishNodeCreated(saved.organizationId, saved.from, saved.fromType, event.context, bus, saved.from);
    await publishNodeCreated(saved.organizationId, saved.to, saved.toType, event.context, bus, saved.from);
    await publishRelationCreated(saved, event.context, bus);
    await publishRelationPersisted(saved, event.context, bus);
  }

  if (repository.listCausalities) {
    for (const causality of await repository.listCausalities(organizationId, subjectId)) {
      await publishOperationalEvent(
        bus,
        "OperationalCausalityDetected",
        {
          organizationId,
          subjectId,
          domain: "maintenance",
          timeline: []
        },
        event.context,
        "Causalidade operacional detectada",
        `${causality.cause} -> ${causality.effect}`,
        causality as unknown as Record<string, unknown>
      );
    }
  }

  return created;
}

export async function replayTimeline(
  organizationId: OrganizationId,
  subjectId: EntityId,
  timeline: readonly TimelineEntry[],
  context: OperationalContext,
  bus: EventBus
): Promise<OperationalDigitalTwinState> {
  const snapshot: OperationalSubjectSnapshot = {
    organizationId,
    subjectId,
    domain: "maintenance",
    timeline
  };
  await publishOperationalEvent(
    bus,
    "TimelineReplayStarted",
    snapshot,
    context,
    "Replay temporal iniciado",
    `Replay iniciado com ${timeline.length} eventos da timeline.`,
    { replayEvents: timeline.map((entry) => entry.eventName) }
  );
  const reconstructed = reconstructStateFromTimeline(organizationId, subjectId, timeline);
  await publishOperationalEvent(
    bus,
    "OperationalContextReconstructed",
    snapshot,
    context,
    "Contexto operacional reconstruido",
    `Contexto reconstruido com risco ${reconstructed.riskLevel}.`,
    { reconstructed }
  );
  await publishOperationalEvent(
    bus,
    "HistoricalOperationalStateLoaded",
    snapshot,
    context,
    "Estado historico operacional carregado",
    `Estado historico carregado com health score ${reconstructed.healthScore}.`,
    { reconstructed }
  );
  return reconstructed;
}

export function calculateRuntimeDiagnostics(
  organizationId: OrganizationId,
  history: readonly CognitiveCoordinationRecord[],
  twins: readonly OperationalDigitalTwinState[]
): RuntimeDiagnostic {
  const scopedHistory = history.filter((record) => record.organizationId === organizationId);
  const scopedTwins = twins.filter((state) => state.organizationId === organizationId);
  const riskScores = scopedHistory.map((record) => riskScore(record.riskLevel));
  const decisionTimes = scopedHistory.map((record) => {
    const firstContext = record.contextEventIds.length > 0 ? 1 : 0;
    return firstContext ? 1000 : 0;
  });
  return {
    id: createId("rtd"),
    organizationId,
    capturedAt: systemClock.now(),
    metrics: {
      totalCoordinations: scopedHistory.length,
      escalatedWorkflows: scopedHistory.filter((record) => record.escalationSuggested).length,
      pendingHumanDecisions: scopedTwins.filter((state) => state.pendingHumanDecision).length,
      averageRiskScore: average(riskScores),
      averageDecisionTimeMs: average(decisionTimes),
      missingEvidenceRequests: scopedHistory.reduce((sum, record) => sum + record.missingContextRequests.length, 0)
    }
  };
}

export async function generateOperationalForecast(
  snapshot: OperationalSubjectSnapshot,
  relations: readonly KnowledgeGraphRelation[],
  twinStates: readonly OperationalDigitalTwinState[],
  history: readonly CognitiveCoordinationRecord[],
  repository: ForesightRepository,
  context: OperationalContext,
  bus: EventBus
): Promise<OperationalForecast> {
  if (snapshot.timeline.length === 0) {
    throw new Error("Foresight requires timeline memory before generating predictions.");
  }

  const currentTwin = twinStates[0];
  const sourceEventIds = snapshot.timeline.map((entry) => String(entry.metadata.eventId ?? entry.id));
  const signals = buildForecastSignals(snapshot, relations, currentTwin, history);
  const recommendedCoordination = buildPredictiveCoordinationPlan(signals);
  const averageConfidence = average(signals.map((signal) => Math.round(signal.confidence * 100))) / 100;
  const forecast: OperationalForecast = {
    id: createId("ofc"),
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    domain: snapshot.domain,
    generatedAt: systemClock.now(),
    sourceEventIds,
    signals,
    recommendedCoordination,
    approvalGate: {
      required: signals.some((signal) => signal.riskLevel === "high" || signal.riskLevel === "critical"),
      reason: "Previsoes alteram apenas recomendacoes; qualquer intervencao operacional exige aprovacao humana.",
      minimumConfidence: 0.65
    }
  };

  await repository.saveForecast(forecast);
  await publishOperationalEvent(bus, "OperationalForecastGenerated", snapshot, context, "Forecast operacional gerado", `${signals.length} sinais futuros calculados.`, { forecast });

  for (const signal of signals) {
    if (signal.type === "cost_escalation") {
      await publishOperationalEvent(bus, "CostEscalationPredicted", snapshot, context, "Escalada de custo prevista", signal.explanation.expectedImpact, { forecastId: forecast.id, signal });
    } else if (signal.type === "operational_bottleneck") {
      await publishOperationalEvent(bus, "OperationalBottleneckDetected", snapshot, context, "Gargalo operacional previsto", signal.explanation.expectedImpact, { forecastId: forecast.id, signal });
    } else {
      await publishOperationalEvent(bus, "FutureRiskPredicted", snapshot, context, "Risco futuro previsto", signal.explanation.expectedImpact, { forecastId: forecast.id, signal });
    }

    await publishOperationalEvent(bus, "OperationalImpactEstimated", snapshot, context, "Impacto operacional estimado", signal.explanation.expectedImpact, { forecastId: forecast.id, signal });
    await publishOperationalEvent(bus, "PredictionConfidenceCalculated", snapshot, context, "Confianca de previsao calculada", `Confianca ${Math.round(signal.confidence * 100)}%.`, { forecastId: forecast.id, signalId: signal.id, confidence: signal.confidence });
    await publishOperationalEvent(bus, "OperationalExplanationGenerated", snapshot, context, "Explicacao operacional gerada", signal.explanation.causality, { forecastId: forecast.id, signalId: signal.id, explanation: signal.explanation });
  }

  for (const action of recommendedCoordination) {
    const eventName =
      action.type === "suggest_escalation"
        ? "ProactiveEscalationRecommended"
        : action.type === "recommend_specialist"
          ? "PreventiveActionSuggested"
          : "OperationalInterventionSuggested";
    await publishOperationalEvent(bus, eventName, snapshot, context, action.title, action.rationale, { forecastId: forecast.id, action });
  }

  if (forecast.approvalGate.required) {
    await publishOperationalEvent(bus, "HumanApprovalGateTriggered", snapshot, context, "Gate de aprovacao humana acionado", forecast.approvalGate.reason, { forecastId: forecast.id, approvalGate: forecast.approvalGate });
  }

  await publishOperationalEvent(bus, "PredictiveCoordinationTriggered", snapshot, context, "Coordenacao preditiva acionada", "Runtime gerou recomendacoes preventivas sem alterar estado operacional.", { forecastId: forecast.id, recommendedCoordination });
  await publishKnowledgeInferenceEvents(snapshot, relations, context, bus);

  return forecast;
}

export async function simulateOperationalScenarios(
  snapshot: OperationalSubjectSnapshot,
  scenarioKinds: readonly ScenarioKind[],
  forecast: OperationalForecast | undefined,
  repository: ForesightRepository,
  context: OperationalContext,
  bus: EventBus
): Promise<ScenarioComparison> {
  const scenarios = scenarioKinds.map((kind) => createScenario(snapshot, kind));
  const results: SimulatedScenarioResult[] = [];

  for (const scenario of scenarios) {
    await repository.saveScenario(scenario);
    await publishOperationalEvent(bus, "OperationalScenarioCreated", snapshot, context, "Cenario operacional criado", scenario.assumption, { scenario });

    const result = simulateScenario(snapshot, scenario, forecast);
    await repository.saveSimulation(result);
    results.push(result);
    await publishOperationalEvent(bus, "OperationalScenarioSimulated", snapshot, context, "Cenario operacional simulado", result.projectedImpact, { scenario, result });
    await publishOperationalEvent(bus, "AlternativeOperationalPathGenerated", snapshot, context, "Caminho operacional alternativo gerado", result.explanation.expectedImpact, { scenario, result });
  }

  const preferred = results
    .filter((result) => result.projectedRisk !== "critical")
    .sort((a, b) => b.projectedHealthScore - a.projectedHealthScore)[0] ?? results.sort((a, b) => a.projectedCostMultiplier - b.projectedCostMultiplier)[0];
  const comparison: ScenarioComparison = {
    id: createId("osc"),
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    comparedAt: systemClock.now(),
    scenarioResults: results,
    ...(preferred ? { preferredScenarioId: preferred.scenarioId } : {}),
    rationale: preferred
      ? `Cenario preferido preserva melhor health score (${preferred.projectedHealthScore}) sem executar acao automaticamente.`
      : "Sem cenario preferido; todos exigem avaliacao humana."
  };
  await repository.saveComparison(comparison);
  await publishOperationalEvent(bus, "ScenarioComparisonCompleted", snapshot, context, "Comparacao de cenarios concluida", comparison.rationale, { comparison });
  return comparison;
}

export async function generateTemporalAnalytics(
  snapshot: OperationalSubjectSnapshot,
  history: readonly CognitiveCoordinationRecord[],
  twinSnapshots: readonly OperationalDigitalTwinState[],
  repository: ForesightRepository,
  context: OperationalContext,
  bus: EventBus
): Promise<TemporalAnalytics> {
  const riskEvolution = snapshot.timeline.map((entry) => ({
    occurredAt: entry.occurredAt,
    riskScore: riskScoreFromText(entryText(entry)),
    eventName: entry.eventName
  }));
  const healthEvolution = twinSnapshots.map((state) => ({
    occurredAt: state.updatedAt,
    healthScore: state.healthScore,
    eventName: "DigitalTwinStatePersisted"
  }));
  const recurrenceCount = snapshot.timeline.filter((entry) => entryText(entry).includes("recorr") || entryText(entry).includes("vibracao") || entryText(entry).includes("falha")).length;
  const analytics: TemporalAnalytics = {
    id: createId("ota"),
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    generatedAt: systemClock.now(),
    riskEvolution,
    healthEvolution,
    averageResolutionHours: estimateResolutionHours(snapshot.timeline),
    recurrenceCount,
    coordinationEfficiency: history.length > 0 ? Math.max(0, 100 - history.filter((record) => record.humanDecisionRequested).length * 12) : 0,
    pendingHumanDecisions: history.filter((record) => record.humanDecisionRequested).length,
    degradationCurve: healthEvolution.map((point) => point.healthScore).concat(riskEvolution.map((point) => 100 - point.riskScore)).slice(0, 20),
    trends: detectTemporalTrends(riskEvolution, healthEvolution, recurrenceCount)
  };

  await repository.saveAnalytics(analytics);
  await publishOperationalEvent(bus, "TemporalAnalyticsGenerated", snapshot, context, "Analytics temporal gerado", `${analytics.trends.length} tendencia(s) operacional(is) calculada(s).`, { analytics });
  for (const trend of analytics.trends) {
    await publishOperationalEvent(bus, "OperationalTrendDetected", snapshot, context, "Tendencia operacional detectada", trend, { analyticsId: analytics.id, trend });
  }
  await publishOperationalEvent(bus, "RiskEvolutionTracked", snapshot, context, "Evolucao de risco rastreada", `${riskEvolution.length} pontos temporais analisados.`, { analyticsId: analytics.id, riskEvolution });
  return analytics;
}

function detectOperationalPatterns(snapshot: OperationalSubjectSnapshot, text: string): OperationalPatternSignal[] {
  const signals: OperationalPatternSignal[] = [];
  const failureWords = ["vibracao", "vazamento", "ruido", "aquecimento", "falha", "pressao"];
  const recurring = failureWords.filter((word) => occurrences(text, word) >= 2);

  if (recurring.length > 0) {
    signals.push({
      pattern: `Reincidencia de sinais: ${recurring.join(", ")}`,
      confidence: Math.min(0.9, 0.55 + recurring.length * 0.1),
      evidenceRefs: snapshot.timeline.filter((entry) => recurring.some((word) => entryText(entry).includes(word))).map((entry) => entry.id)
    });
  }

  if (snapshot.workOrder?.budgetState === "submitted" && !text.includes("orcamento aprovado")) {
    signals.push({
      pattern: "Orcamento submetido sem decisao humana registrada",
      confidence: 0.82,
      evidenceRefs: snapshot.timeline.filter((entry) => entry.eventName === "BudgetSubmitted").map((entry) => entry.id)
    });
  }

  if (isSlaAtRisk(snapshot)) {
    signals.push({
      pattern: "SLA operacional em risco",
      confidence: 0.78,
      evidenceRefs: snapshot.timeline.slice(0, 5).map((entry) => entry.id)
    });
  }

  return signals;
}

function detectMissingContext(snapshot: OperationalSubjectSnapshot, text: string): MissingContextRequest[] {
  const requests: MissingContextRequest[] = [];
  const evidenceCount = snapshot.workOrder?.evidenceCount ?? snapshot.timeline.filter((entry) => entry.kind === "attachment").length;
  const risky = text.includes("risco") || text.includes("critical") || text.includes("critico") || snapshot.workOrder?.priority === "urgent";

  if (evidenceCount === 0 && risky) {
    requests.push({
      evidenceKind: "photo_or_measurement",
      reason: "A timeline possui risco ou urgencia sem evidencia operacional anexada.",
      requiredBefore: "escalation_or_budget_decision"
    });
  }

  if ((snapshot.workOrder?.checklistOpenCount ?? 0) > 0 && snapshot.workOrder?.state === "waiting_budget") {
    requests.push({
      evidenceKind: "checklist_completion",
      reason: "Ha checklist aberto antes de decisao financeira ou operacional.",
      requiredBefore: "human_budget_decision"
    });
  }

  return requests;
}

function predictOperationalRisks(
  snapshot: OperationalSubjectSnapshot,
  patterns: readonly OperationalPatternSignal[],
  missingContext: readonly MissingContextRequest[]
): PredictiveRisk[] {
  const risks: PredictiveRisk[] = [];
  const criticality = snapshot.asset?.criticality;
  const healthScore = snapshot.healthScore?.score ?? 100;

  if (patterns.some((pattern) => pattern.pattern.includes("Reincidencia"))) {
    risks.push({
      type: "failure",
      level: criticality === "critical" ? "critical" : "high",
      probability: criticality === "critical" ? 0.84 : 0.68,
      reasons: ["Historico operacional indica reincidencia de sintomas na timeline."]
    });
  }

  if (isSlaAtRisk(snapshot)) {
    risks.push({
      type: "delay",
      level: "high",
      probability: 0.72,
      reasons: ["SLA ou prazo operacional mostra risco de atraso."]
    });
  }

  if (healthScore < 65 || missingContext.length > 0) {
    risks.push({
      type: "degradation",
      level: healthScore < 40 ? "critical" : "medium",
      probability: healthScore < 40 ? 0.8 : 0.58,
      reasons: ["Health score e contexto faltante indicam degradacao operacional possivel."]
    });
  }

  return risks.length ? risks : [{ type: "degradation", level: "low", probability: 0.22, reasons: ["Sem padrao historico forte; manter observacao pela timeline."] }];
}

function classifyOperationalRisk(snapshot: OperationalSubjectSnapshot, risks: readonly PredictiveRisk[]): OperationalRiskLevel {
  if (risks.some((risk) => risk.level === "critical") || snapshot.alerts?.some((alert) => alert.severity === "critical")) {
    return "critical";
  }

  if (risks.some((risk) => risk.level === "high") || snapshot.workOrder?.priority === "urgent" || snapshot.asset?.criticality === "critical") {
    return "high";
  }

  if (risks.some((risk) => risk.level === "medium") || (snapshot.healthScore?.score ?? 100) < 75) {
    return "medium";
  }

  return "low";
}

function recommendPriority(snapshot: OperationalSubjectSnapshot, risk: OperationalRiskLevel): string {
  if (risk === "critical") {
    return "urgent";
  }

  if (risk === "high") {
    return snapshot.workOrder?.priority === "urgent" ? "urgent" : "high";
  }

  if (risk === "medium") {
    return "normal";
  }

  return snapshot.workOrder?.priority ?? "normal";
}

function recommendSpecialist(
  snapshot: OperationalSubjectSnapshot,
  patterns: readonly OperationalPatternSignal[]
): OperationalSpecialistRecommendation | undefined {
  const requiredSkills = requiredSkillsFor(snapshot, patterns);
  const specialist = snapshot.availableSpecialists
    ?.filter((item) => item.domains.includes(snapshot.domain))
    .filter((item) => requiredSkills.some((skill) => item.skills.includes(skill)))
    .sort((a, b) => (a.activeWorkOrders ?? 0) - (b.activeWorkOrders ?? 0))[0];

  if (!requiredSkills.length) {
    return undefined;
  }

  return {
    ...(specialist ? { specialistId: specialist.id, name: specialist.name } : {}),
    reason: specialist
      ? `Especialista possui aderencia a ${requiredSkills.join(", ")} e menor carga relativa.`
      : `Necessario especialista com habilidades: ${requiredSkills.join(", ")}.`,
    requiredSkills
  };
}

function buildReasoningTrace(
  snapshot: OperationalSubjectSnapshot,
  patterns: readonly OperationalPatternSignal[],
  risks: readonly PredictiveRisk[],
  missingContext: readonly MissingContextRequest[],
  riskLevel: OperationalRiskLevel
): OperationalReasoningStep[] {
  return [
    {
      id: createId("ors"),
      agent: "context-engine",
      inputRefs: snapshot.timeline.slice(0, 10).map((entry) => entry.id),
      conclusion: `Contexto montado a partir de ${snapshot.timeline.length} eventos da timeline.`,
      confidence: 1
    },
    {
      id: createId("ors"),
      agent: "pattern-agent",
      inputRefs: patterns.flatMap((pattern) => pattern.evidenceRefs),
      conclusion: patterns.length ? patterns.map((pattern) => pattern.pattern).join("; ") : "Nenhum padrao recorrente forte encontrado.",
      confidence: patterns[0]?.confidence ?? 0.62
    },
    {
      id: createId("ors"),
      agent: "risk-agent",
      inputRefs: snapshot.alerts?.map((alert) => alert.eventName) ?? [],
      conclusion: `Risco operacional classificado como ${riskLevel}; riscos preditivos: ${risks.map((risk) => risk.type).join(", ")}.`,
      confidence: Math.max(...risks.map((risk) => risk.probability), 0.55)
    },
    {
      id: createId("ors"),
      agent: "governance-agent",
      inputRefs: missingContext.map((item) => item.evidenceKind),
      conclusion: missingContext.length
        ? "Decisao humana solicitada por contexto operacional incompleto."
        : "Coordenacao mantida como recomendacao governada.",
      confidence: 1
    }
  ];
}

function buildOperationalPlan(
  priorityRecommendation: string,
  escalationSuggested: boolean,
  specialist: OperationalSpecialistRecommendation | undefined,
  missingContext: readonly MissingContextRequest[],
  risks: readonly PredictiveRisk[],
  decisionBoundary: OperationalDecisionBoundary
): OperationalPlanAction[] {
  const actions: OperationalPlanAction[] = [
    {
      id: createId("opa"),
      type: "prioritize",
      title: `Recomendar prioridade ${priorityRecommendation}`,
      rationale: "Prioridade calculada por criticidade, SLA, health score, timeline e risco preditivo.",
      decisionBoundary: "recommendation_only"
    }
  ];

  for (const request of missingContext) {
    actions.push({
      id: createId("opa"),
      type: "request_evidence",
      title: `Solicitar evidencia: ${request.evidenceKind}`,
      rationale: request.reason,
      decisionBoundary: "recommendation_only"
    });
  }

  if (specialist) {
    actions.push({
      id: createId("opa"),
      type: "recommend_specialist",
      title: specialist.name ? `Recomendar ${specialist.name}` : "Recomendar especialista qualificado",
      rationale: specialist.reason,
      decisionBoundary: "recommendation_only"
    });
  }

  if (risks.some((risk) => risk.type === "delay")) {
    actions.push({
      id: createId("opa"),
      type: "monitor_sla",
      title: "Monitorar SLA em risco",
      rationale: "Predicao operacional indica risco de atraso.",
      decisionBoundary: "recommendation_only"
    });
  }

  if (escalationSuggested) {
    actions.push({
      id: createId("opa"),
      type: "suggest_escalation",
      title: "Sugerir escalonamento",
      rationale: "Risco elevado exige validacao de responsavel humano.",
      decisionBoundary: "human_required"
    });
  }

  if (decisionBoundary === "human_required") {
    actions.push({
      id: createId("opa"),
      type: "request_human_decision",
      title: "Solicitar decisao humana",
      rationale: "Runtime nao executa decisao critica automaticamente.",
      decisionBoundary: "human_required"
    });
  }

  return actions;
}

async function createWorkflowRelations(
  snapshot: OperationalSubjectSnapshot,
  workflowRunId: EntityId,
  patterns: readonly OperationalPatternSignal[],
  missingContext: readonly MissingContextRequest[],
  repository: KnowledgeGraphRepository,
  context: OperationalContext,
  bus: EventBus
): Promise<void> {
  const workflowId = workflowRunId;
  const relations: Omit<KnowledgeGraphRelation, "id" | "createdAt" | "updatedAt">[] = [
    baseRelation(snapshot.organizationId, snapshot.subjectId, "work_order", workflowId, "workflow", "coordinated_by_workflow", workflowRunId)
  ];

  if (snapshot.asset?.id) {
    relations.push(baseRelation(snapshot.organizationId, snapshot.subjectId, "work_order", snapshot.asset.id, "asset", "opened_for_asset", workflowRunId));
  }

  for (const pattern of patterns) {
    const failureId = createId("flr");
    relations.push({
      ...baseRelation(snapshot.organizationId, snapshot.subjectId, "work_order", failureId, "failure", "has_failure_signal", workflowRunId),
      weight: pattern.confidence,
      metadata: { pattern: pattern.pattern, evidenceRefs: pattern.evidenceRefs }
    });
  }

  for (const item of missingContext) {
    const evidenceId = createId("evd");
    relations.push({
      ...baseRelation(snapshot.organizationId, snapshot.subjectId, "work_order", evidenceId, "evidence", "requires_human_decision", workflowRunId),
      metadata: { evidenceKind: item.evidenceKind, reason: item.reason, requiredBefore: item.requiredBefore }
    });
  }

  for (const relation of relations) {
    const saved = await repository.upsert(relation);
    await publishNodeCreated(saved.organizationId, saved.from, saved.fromType, context, bus, saved.from);
    await publishNodeCreated(saved.organizationId, saved.to, saved.toType, context, bus, saved.from);
    await publishRelationCreated(saved, context, bus);
    await publishRelationPersisted(saved, context, bus);
  }
}

function buildDigitalTwinState(
  snapshot: OperationalSubjectSnapshot,
  workflowRunId: EntityId,
  riskLevel: OperationalRiskLevel,
  predictiveRisks: readonly PredictiveRisk[],
  decisionBoundary: OperationalDecisionBoundary
): OperationalDigitalTwinState {
  const evidenceCount = snapshot.workOrder?.evidenceCount ?? snapshot.timeline.filter((entry) => entry.kind === "attachment").length;
  return {
    id: createId("odt"),
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    domain: snapshot.domain,
    updatedAt: systemClock.now(),
    assets: snapshot.asset?.id ? [snapshot.asset.id] : [],
    riskLevel,
    slaState: isSlaAtRisk(snapshot) ? "at_risk" : "on_track",
    activeWorkflows: [workflowRunId],
    evidenceState: evidenceCount === 0 ? "missing" : evidenceCount < 2 ? "partial" : "sufficient",
    healthScore: snapshot.healthScore?.score ?? healthScoreFromRisk(riskLevel),
    responsibleIds: snapshot.availableSpecialists?.slice(0, 3).map((item) => item.id) ?? [],
    alertEventNames: [...(snapshot.alerts?.map((alert) => alert.eventName) ?? []), ...predictiveRisks.map((risk) => `predictive.${risk.type}`)],
    historyEventNames: snapshot.timeline.slice(0, 20).map((entry) => entry.eventName),
    pendingHumanDecision: decisionBoundary === "human_required"
  };
}

function requiredSkillsFor(snapshot: OperationalSubjectSnapshot, patterns: readonly OperationalPatternSignal[]): readonly string[] {
  const text = `${snapshot.workOrder?.title ?? ""} ${snapshot.workOrder?.description ?? ""} ${patterns.map((item) => item.pattern).join(" ")}`.toLowerCase();
  const skills = new Set<string>();

  if (snapshot.asset?.kind) {
    skills.add(snapshot.asset.kind);
  }

  if (text.includes("vibracao") || text.includes("ruido") || text.includes("rolamento")) {
    skills.add("rotating_equipment");
  }

  if (text.includes("vazamento") || text.includes("pressao")) {
    skills.add("hydraulics");
  }

  if (text.includes("sla") || text.includes("orcamento")) {
    skills.add("field_supervision");
  }

  return [...skills];
}

function isSlaAtRisk(snapshot: OperationalSubjectSnapshot): boolean {
  if (snapshot.alerts?.some((alert) => alert.eventName === "SlaViolationPredicted")) {
    return true;
  }

  if (snapshot.workOrder?.dueAt && snapshot.workOrder.state !== "closed") {
    return snapshot.workOrder.dueAt.localeCompare(systemClock.now()) <= 0;
  }

  return snapshot.timeline.length >= 6 && snapshot.workOrder?.state !== "closed";
}

function healthScoreFromRisk(risk: OperationalRiskLevel): number {
  const values: Record<OperationalRiskLevel, number> = { low: 90, medium: 72, high: 55, critical: 30 };
  return values[risk];
}

function timelineText(timeline: readonly TimelineEntry[]): string {
  return timeline.map(entryText).join(" ");
}

function entryText(entry: TimelineEntry): string {
  return `${entry.eventName} ${entry.title} ${entry.body ?? ""}`.toLowerCase();
}

function occurrences(text: string, word: string): number {
  return text.split(word).length - 1;
}

function baseRelation(
  organizationId: OrganizationId,
  from: EntityId,
  fromType: KnowledgeNodeType,
  to: EntityId,
  toType: KnowledgeNodeType,
  type: KnowledgeRelationType,
  evidenceEventId: string
): Omit<KnowledgeGraphRelation, "id" | "createdAt" | "updatedAt"> {
  return {
    organizationId,
    from,
    fromType,
    to,
    toType,
    type,
    weight: 1,
    evidenceEventIds: [evidenceEventId],
    metadata: {}
  };
}

async function publishOperationalEvent(
  bus: EventBus,
  name: string,
  snapshot: OperationalSubjectSnapshot,
  context: OperationalContext,
  title: string,
  body: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await bus.publish(
    createEvent(
      name,
      {
        organizationId: snapshot.organizationId,
        subjectId: snapshot.subjectId,
        title,
        body,
        kind: "system",
        metadata
      },
      context,
      { organizationId: snapshot.organizationId, subjectId: snapshot.subjectId, sourceModule: "operations" }
    )
  );
}

async function publishRelationCreated(relation: KnowledgeGraphRelation, context: OperationalContext, bus: EventBus): Promise<void> {
  await bus.publish(
    createEvent(
      "KnowledgeGraphRelationCreated",
      {
        relationId: relation.id,
        organizationId: relation.organizationId,
        subjectId: relation.from,
        title: "Relacao do knowledge graph criada",
        body: `${relation.fromType}:${relation.from} ${relation.type} ${relation.toType}:${relation.to}`,
        kind: "system",
        metadata: relation as unknown as Record<string, unknown>
      },
      context,
      { organizationId: relation.organizationId, subjectId: relation.from, sourceModule: "operations" }
    )
  );
}

async function publishRelationPersisted(relation: KnowledgeGraphRelation, context: OperationalContext, bus: EventBus): Promise<void> {
  await bus.publish(
    createEvent(
      "KnowledgeGraphRelationPersisted",
      {
        relationId: relation.id,
        organizationId: relation.organizationId,
        subjectId: relation.from,
        title: "Relacao do knowledge graph persistida",
        body: `${relation.type} versionada com ${relation.evidenceEventIds.length} evidencias.`,
        kind: "system",
        metadata: relation as unknown as Record<string, unknown>
      },
      context,
      { organizationId: relation.organizationId, subjectId: relation.from, sourceModule: "operations" }
    )
  );
}

async function publishNodeCreated(
  organizationId: OrganizationId,
  nodeId: EntityId,
  nodeType: KnowledgeNodeType,
  context: OperationalContext,
  bus: EventBus,
  subjectId: EntityId
): Promise<void> {
  await bus.publish(
    createEvent(
      "KnowledgeGraphNodeCreated",
      {
        nodeId,
        organizationId,
        subjectId,
        title: "No operacional persistido",
        body: `${nodeType}:${nodeId}`,
        kind: "system",
        metadata: { nodeId, nodeType }
      },
      context,
      { organizationId, subjectId, sourceModule: "operations" }
    )
  );
}

async function publishRuntimeMetric(
  snapshot: OperationalSubjectSnapshot,
  context: OperationalContext,
  bus: EventBus,
  metric: string,
  value: number,
  metadata: Record<string, unknown>
): Promise<void> {
  await publishOperationalEvent(
    bus,
    "RuntimeMetricCaptured",
    snapshot,
    context,
    "Metrica do runtime capturada",
    `${metric}: ${value}`,
    { metric, value, ...metadata }
  );
  await publishOperationalEvent(
    bus,
    "OperationalTelemetryUpdated",
    snapshot,
    context,
    "Telemetria operacional atualizada",
    `Runtime atualizou ${metric}.`,
    { metric, value, ...metadata }
  );
}

export async function publishCoordinationPerformance(
  snapshot: OperationalSubjectSnapshot,
  context: OperationalContext,
  bus: EventBus,
  durationMs: number,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await publishOperationalEvent(
    bus,
    "CoordinationPerformanceMeasured",
    snapshot,
    context,
    "Performance da coordenacao medida",
    `Coordenacao concluida em ${durationMs}ms.`,
    { durationMs, ...metadata }
  );
}

function toCoordinationRecord(run: CognitiveWorkflowRun, snapshot: OperationalSubjectSnapshot): CognitiveCoordinationRecord {
  return {
    id: createId("cwr"),
    organizationId: run.organizationId,
    subjectId: run.subjectId,
    workflowRunId: run.id,
    domain: run.domain,
    capturedAt: systemClock.now(),
    contextEventIds: snapshot.timeline.map((entry) => String(entry.metadata.eventId ?? entry.id)),
    riskLevel: run.riskLevel,
    priorityRecommendation: run.priorityRecommendation,
    escalationSuggested: run.escalationSuggested,
    humanDecisionRequested: run.decisionBoundary === "human_required",
    ...(run.specialistRecommendation ? { specialistRecommendation: run.specialistRecommendation } : {}),
    missingContextRequests: run.missingContextRequests,
    predictiveRisks: run.predictiveRisks,
    plan: run.plan,
    reasoningTrace: run.reasoningTrace,
    explanation: run.reasoningTrace.map((step) => `${step.agent}: ${step.conclusion}`).join(" ")
  };
}

function reconstructStateFromTimeline(
  organizationId: OrganizationId,
  subjectId: EntityId,
  timeline: readonly TimelineEntry[]
): OperationalDigitalTwinState {
  const text = timelineText(timeline);
  const hasEvidence = timeline.some((entry) => entry.kind === "attachment");
  const riskLevel: OperationalRiskLevel =
    text.includes("critical") || text.includes("critico") || text.includes("escalonamento")
      ? "critical"
      : text.includes("risco") || text.includes("sla")
        ? "high"
        : text.includes("falha") || text.includes("vibracao")
          ? "medium"
          : "low";
  return {
    id: createId("odt"),
    organizationId,
    subjectId,
    domain: "maintenance",
    updatedAt: systemClock.now(),
    assets: [],
    riskLevel,
    slaState: text.includes("sla") ? "at_risk" : "unknown",
    activeWorkflows: timeline.filter((entry) => entry.eventName === "WorkflowCoordinationStarted").map((entry) => entry.id),
    evidenceState: hasEvidence ? "partial" : "missing",
    healthScore: healthScoreFromRisk(riskLevel),
    responsibleIds: [],
    alertEventNames: timeline.filter((entry) => entry.eventName.includes("Detected") || entry.eventName.includes("Predicted")).map((entry) => entry.eventName),
    historyEventNames: timeline.map((entry) => entry.eventName),
    pendingHumanDecision: timeline.some((entry) => entry.eventName === "HumanDecisionRequested")
  };
}

function upsertGraphNode(
  nodes: readonly KnowledgeGraphNode[],
  organizationId: OrganizationId,
  nodeId: EntityId,
  type: KnowledgeNodeType,
  metadata: Record<string, unknown>
): KnowledgeGraphNode[] {
  const now = systemClock.now();
  const current = nodes.find((node) => node.organizationId === organizationId && node.id === nodeId);
  const next: KnowledgeGraphNode = {
    id: nodeId,
    organizationId,
    type,
    label: String(metadata.label ?? `${type}:${nodeId}`),
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    metadata: { ...(current?.metadata ?? {}), ...metadata }
  };
  return current ? nodes.map((node) => (node.organizationId === organizationId && node.id === nodeId ? next : node)) : [...nodes, next];
}

function inferCausalities(
  organizationId: OrganizationId,
  subjectId: EntityId,
  relations: readonly KnowledgeGraphRelation[],
  current: OperationalCausality[]
): OperationalCausality[] {
  const subjectRelations = relations.filter((relation) => relation.organizationId === organizationId && relation.from === subjectId);
  const hasFailure = subjectRelations.some((relation) => relation.type === "has_failure_signal");
  const hasRecurrence = subjectRelations.some((relation) => relation.type === "has_recurrence") || subjectRelations.filter((relation) => relation.type === "has_failure_signal").length >= 2;
  const hasSla = subjectRelations.some((relation) => relation.type === "governed_by_sla");
  const detected: OperationalCausality[] = [];

  if (hasFailure && hasRecurrence) {
    detected.push({
      id: createId("oca"),
      organizationId,
      subjectId,
      cause: "recurrent_failure_signal",
      effect: "predictive_failure_risk",
      confidence: 0.76,
      evidenceRelationIds: subjectRelations.filter((relation) => relation.type === "has_failure_signal").map((relation) => relation.id),
      detectedAt: systemClock.now()
    });
  }

  if (hasSla && hasFailure) {
    detected.push({
      id: createId("oca"),
      organizationId,
      subjectId,
      cause: "failure_signal_under_sla",
      effect: "operational_delay_risk",
      confidence: 0.68,
      evidenceRelationIds: subjectRelations.filter((relation) => relation.type === "has_failure_signal" || relation.type === "governed_by_sla").map((relation) => relation.id),
      detectedAt: systemClock.now()
    });
  }

  const existingKeys = new Set(current.map((item) => `${item.organizationId}:${item.subjectId}:${item.cause}:${item.effect}`));
  return [
    ...current,
    ...detected.filter((item) => !existingKeys.has(`${item.organizationId}:${item.subjectId}:${item.cause}:${item.effect}`))
  ];
}

function riskScore(risk: OperationalRiskLevel): number {
  const scores: Record<OperationalRiskLevel, number> = { low: 25, medium: 50, high: 75, critical: 100 };
  return scores[risk];
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildForecastSignals(
  snapshot: OperationalSubjectSnapshot,
  relations: readonly KnowledgeGraphRelation[],
  currentTwin: OperationalDigitalTwinState | undefined,
  history: readonly CognitiveCoordinationRecord[]
): ForecastSignal[] {
  const text = timelineText(snapshot.timeline);
  const baseRisk = currentTwin?.riskLevel ?? classifyOperationalRisk(snapshot, []);
  const healthScore = currentTwin?.healthScore ?? snapshot.healthScore?.score ?? healthScoreFromRisk(baseRisk);
  const signals: ForecastSignal[] = [];
  const hasRecurrence = text.includes("recorr") || relations.some((relation) => relation.type === "has_failure_signal" || relation.type === "has_recurrence");
  const pendingHumanDecisions = history.filter((record) => record.humanDecisionRequested).length;

  if (snapshot.workOrder?.state !== "closed" && (snapshot.timeline.length >= 4 || isSlaAtRisk(snapshot))) {
    signals.push(createForecastSignal("operational_delay", 24, baseRisk === "critical" ? "critical" : "high", 0.74, 78, {
      origin: ["timeline", "digital_twin", "sla"],
      context: "OS ativa com acumulacao de eventos e sinais de SLA ou fluxo pendente.",
      causality: "Eventos pendentes + SLA em risco aumentam probabilidade de atraso operacional.",
      expectedImpact: "Pode ampliar fila operacional, atrasar decisao humana e reduzir health score."
    }));
  }

  if (healthScore < 70 || snapshot.asset?.criticality === "critical") {
    signals.push(createForecastSignal("asset_degradation", 48, healthScore < 45 ? "critical" : "high", 0.69, 72, {
      origin: ["health_score", "asset_criticality", "digital_twin"],
      context: `Health score atual ${healthScore}; criticidade ${snapshot.asset?.criticality ?? "desconhecida"}.`,
      causality: "Baixo health score em ativo critico indica tendencia de degradacao operacional.",
      expectedImpact: "Risco de indisponibilidade e custo corretivo maior se a operacao continuar sem inspecao."
    }));
  }

  if (hasRecurrence) {
    signals.push(createForecastSignal("probable_recurrence", 72, "high", 0.77, 70, {
      origin: ["knowledge_graph", "timeline"],
      context: "Grafo e timeline indicam sintomas repetidos ou relacoes de falha.",
      causality: "Sinais recorrentes tendem a reaparecer quando causa raiz nao e confirmada por evidencia.",
      expectedImpact: "Pode gerar nova OS, retrabalho e impacto acumulado de SLA."
    }));
  }

  if (pendingHumanDecisions > 0) {
    signals.push(createForecastSignal("operational_bottleneck", 12, "medium", 0.66, 58, {
      origin: ["coordination_history", "human_decision_queue"],
      context: `${pendingHumanDecisions} decisao(oes) humana(s) ainda pendente(s).`,
      causality: "Decisoes pendentes reduzem vazao do workflow cognitivo.",
      expectedImpact: "Pode atrasar escalonamento, aprovacao e fechamento operacional."
    }));
  }

  if (text.includes("orcamento") || text.includes("budget") || baseRisk === "critical") {
    signals.push(createForecastSignal("cost_escalation", 72, baseRisk === "critical" ? "high" : "medium", 0.61, 64, {
      origin: ["timeline", "risk_level", "budget_signals"],
      context: "Timeline possui risco elevado ou sinais financeiros.",
      causality: "Atraso em intervencao sob risco elevado tende a aumentar custo corretivo.",
      expectedImpact: "Custo projetado pode subir por urgencia, indisponibilidade ou troca de componente."
    }));
  }

  return signals.length ? signals : [
    createForecastSignal("future_risk", 48, "low", 0.38, 30, {
      origin: ["timeline"],
      context: "Sem sinais persistentes fortes; forecast mantido em observacao.",
      causality: "Memoria operacional atual nao sustenta causalidade forte.",
      expectedImpact: "Manter monitoramento sem acao critica automatica."
    })
  ];
}

function createForecastSignal(
  type: ForecastSignal["type"],
  horizonHours: number,
  riskLevel: OperationalRiskLevel,
  probability: number,
  impactScore: number,
  explanation: PredictionExplanation
): ForecastSignal {
  return {
    id: createId("ofs"),
    type,
    horizonHours,
    riskLevel,
    probability,
    impactScore,
    confidence: Math.min(0.95, Math.max(0.2, probability * 0.72 + impactScore / 500)),
    explanation
  };
}

function buildPredictiveCoordinationPlan(signals: readonly ForecastSignal[]): OperationalPlanAction[] {
  const actions: OperationalPlanAction[] = [];

  if (signals.some((signal) => signal.type === "asset_degradation" || signal.type === "probable_recurrence")) {
    actions.push({
      id: createId("opa"),
      type: "request_evidence",
      title: "Recomendar inspecao preventiva",
      rationale: "Forecast indica degradacao ou reincidencia provavel; solicitar evidencia antes de qualquer intervencao.",
      decisionBoundary: "recommendation_only"
    });
  }

  if (signals.some((signal) => signal.type === "operational_bottleneck")) {
    actions.push({
      id: createId("opa"),
      type: "recommend_specialist",
      title: "Antecipar especialista disponivel",
      rationale: "Gargalo previsto no workflow sugere preparar responsavel tecnico antes do atraso.",
      decisionBoundary: "recommendation_only"
    });
  }

  if (signals.some((signal) => signal.riskLevel === "critical" || signal.riskLevel === "high")) {
    actions.push({
      id: createId("opa"),
      type: "suggest_escalation",
      title: "Recomendar escalonamento proativo",
      rationale: "Risco futuro alto exige gate humano antes de qualquer decisao critica.",
      decisionBoundary: "human_required"
    });
  }

  return actions.length ? actions : [
    {
      id: createId("opa"),
      type: "monitor_sla",
      title: "Manter monitoramento preditivo",
      rationale: "Forecast nao indica intervencao imediata; continuar observando a timeline.",
      decisionBoundary: "recommendation_only"
    }
  ];
}

function createScenario(snapshot: OperationalSubjectSnapshot, kind: ScenarioKind): OperationalScenario {
  const assumptions: Record<ScenarioKind, string> = {
    delay: "E se essa OS atrasar mais 24 horas?",
    continue_operating: "E se o ativo continuar operando sem intervencao?",
    sla_missed: "E se o SLA nao for cumprido?",
    specialist_changed: "E se outro tecnico/especialista assumir?",
    missing_evidence: "E se a evidencia operacional nao for anexada?"
  };
  return {
    id: createId("osc"),
    organizationId: snapshot.organizationId,
    subjectId: snapshot.subjectId,
    domain: snapshot.domain,
    kind,
    title: assumptions[kind],
    assumption: assumptions[kind],
    createdAt: systemClock.now(),
    isolatedFromState: true
  };
}

function simulateScenario(
  snapshot: OperationalSubjectSnapshot,
  scenario: OperationalScenario,
  forecast: OperationalForecast | undefined
): SimulatedScenarioResult {
  const baseRisk = forecast?.signals.some((signal) => signal.riskLevel === "critical") ? "critical" : classifyOperationalRisk(snapshot, []);
  const baseHealth = snapshot.healthScore?.score ?? healthScoreFromRisk(baseRisk);
  const impactByKind: Record<ScenarioKind, { risk: OperationalRiskLevel; healthDelta: number; cost: number; sla: OperationalDigitalTwinState["slaState"] }> = {
    delay: { risk: baseRisk === "critical" ? "critical" : "high", healthDelta: -18, cost: 1.22, sla: "at_risk" },
    continue_operating: { risk: snapshot.asset?.criticality === "critical" ? "critical" : "high", healthDelta: -24, cost: 1.35, sla: "at_risk" },
    sla_missed: { risk: "critical", healthDelta: -20, cost: 1.28, sla: "violated" },
    specialist_changed: { risk: baseRisk === "critical" ? "high" : "medium", healthDelta: 8, cost: 0.96, sla: "on_track" },
    missing_evidence: { risk: baseRisk === "low" ? "medium" : baseRisk, healthDelta: -12, cost: 1.16, sla: "at_risk" }
  };
  const projection = impactByKind[scenario.kind];
  const projectedHealthScore = Math.max(0, Math.min(100, baseHealth + projection.healthDelta));
  return {
    id: createId("osr"),
    scenarioId: scenario.id,
    simulatedAt: systemClock.now(),
    projectedRisk: projection.risk,
    projectedHealthScore,
    projectedSlaState: projection.sla,
    projectedCostMultiplier: projection.cost,
    projectedImpact: `${scenario.assumption} Projecao: risco ${projection.risk}, health ${projectedHealthScore}, custo x${projection.cost}.`,
    explanation: {
      origin: ["timeline", "digital_twin", "forecast", "scenario_assumption"],
      context: scenario.assumption,
      causality: "Simulacao aplica deltas deterministicos sobre risco, health score e SLA sem alterar estado real.",
      expectedImpact: `Impacto projetado: risco ${projection.risk}, SLA ${projection.sla}, custo multiplicado por ${projection.cost}.`
    }
  };
}

async function publishKnowledgeInferenceEvents(
  snapshot: OperationalSubjectSnapshot,
  relations: readonly KnowledgeGraphRelation[],
  context: OperationalContext,
  bus: EventBus
): Promise<void> {
  const failureRelations = relations.filter((relation) => relation.type === "has_failure_signal");
  if (failureRelations.length >= 2) {
    await publishOperationalEvent(bus, "OperationalPatternCorrelated", snapshot, context, "Padrao operacional correlacionado", "Multiplas relacoes de falha apontam recorrencia operacional.", { relationIds: failureRelations.map((relation) => relation.id) });
    await publishOperationalEvent(bus, "CausalOperationalRelationDetected", snapshot, context, "Relacao causal operacional detectada", "Sinais de falha recorrente influenciam risco futuro.", { relationIds: failureRelations.map((relation) => relation.id) });
  }

  const similarRelations = relations.filter((relation) => relation.type === "opened_for_asset" || relation.type === "has_evidence");
  if (similarRelations.length >= 2) {
    await publishOperationalEvent(bus, "OperationalSimilarityIdentified", snapshot, context, "Similaridade operacional identificada", "Entidades compartilham ativo/evidencia e podem informar cenarios similares.", { relationIds: similarRelations.map((relation) => relation.id) });
  }
}

function riskScoreFromText(text: string): number {
  if (text.includes("critical") || text.includes("critico") || text.includes("escalonamento")) {
    return 100;
  }

  if (text.includes("risco") || text.includes("sla") || text.includes("urgente")) {
    return 75;
  }

  if (text.includes("falha") || text.includes("vibracao") || text.includes("atras")) {
    return 50;
  }

  return 25;
}

function estimateResolutionHours(timeline: readonly TimelineEntry[]): number {
  const opened = timeline.find((entry) => entry.eventName === "WorkOrderOpened");
  const closed = timeline.find((entry) => entry.eventName === "WorkOrderClosed");
  if (!opened || !closed) {
    return 0;
  }

  const elapsedMs = Math.abs(new Date(closed.occurredAt).getTime() - new Date(opened.occurredAt).getTime());
  return Math.round(elapsedMs / 36_000) / 100;
}

function detectTemporalTrends(
  riskEvolution: readonly { readonly riskScore: number }[],
  healthEvolution: readonly { readonly healthScore: number }[],
  recurrenceCount: number
): readonly string[] {
  const trends: string[] = [];
  const recentRisk = riskEvolution.slice(0, 5).map((point) => point.riskScore);
  const recentHealth = healthEvolution.slice(0, 5).map((point) => point.healthScore);
  const latestHealth = recentHealth[0];
  const oldestHealth = recentHealth.at(-1);

  if (average(recentRisk) >= 70) {
    trends.push("Risco operacional elevado nos eventos recentes.");
  }

  if (latestHealth !== undefined && oldestHealth !== undefined && latestHealth < oldestHealth) {
    trends.push("Health score em degradacao temporal.");
  }

  if (recurrenceCount >= 2) {
    trends.push("Recorrencia operacional relevante detectada na memoria.");
  }

  return trends.length ? trends : ["Operacao sem tendencia temporal forte no recorte atual."];
}
