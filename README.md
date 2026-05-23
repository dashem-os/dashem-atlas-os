# Atlas OS

Atlas OS is organized as an operational monorepo with executable apps, shared core services, and domain modules. It supports two product lines over the same intelligent core: ATLAS OS Field and ATLAS OS Enterprise.

## Workspace Map

- `apps/api`: HTTP API boundary.
- `apps/worker`: background event processor.
- `apps/field`: ATLAS OS Field PWA shell for mobile-first operations.
- `apps/web`: ATLAS OS Enterprise web shell for administrative ERP, runtime cockpit and governance.
- `core/events`: typed event bus and event envelope.
- `core/database`: repository and unit-of-work contracts.
- `core/security`: password hashing, token signing, and authorization policies.
- `core/shared`: common identifiers, results, clocks, and entity metadata.
- `modules/*`: bounded operational domains.

## First Commands

```sh
npm install
npm run infra:up
npm run build
npm run dev:api
npm run dev:field
npm run dev:enterprise
npm run dev:worker
```

The current foundation is intentionally dependency-light. The API and worker can run on Node primitives, while Field and Enterprise are static web shells that can later be upgraded to a framework when product flows settle.

## Product Lines

ATLAS OS has two experiences over the same core:

- **ATLAS OS Field**: mobile-first PWA for technicians, lightweight finance users, autonomous workers, microbusinesses and supervisors. Its primary surface is an operational card dashboard with bottom navigation, a floating quick action button and AI in context.
- **ATLAS OS Enterprise**: web-first administrative product for large engineering, maintenance and operations companies. It owns denser governance surfaces such as runtime cockpit, digital twin, knowledge graph, foresight, advanced finance, reports, integrations and permissions.

Both lines use the same Agentic Platform, AI Gateway, event stream, operational timeline, modules and the five ATLAS OS pillars. Field must stay "touch and execute"; Enterprise is "administer, govern and analyze". See [docs/ATLAS_OS_5_PILLARS.md](docs/ATLAS_OS_5_PILLARS.md), [docs/PRODUCT_LINES.md](docs/PRODUCT_LINES.md) and [docs/FIELD_ENTERPRISE_SPLIT.md](docs/FIELD_ENTERPRISE_SPLIT.md) before changing app architecture or navigation patterns.

## Architectural Rules

- Apps orchestrate; modules own domain behavior.
- Modules depend on `core`, not on other apps.
- Events describe operational facts in past tense.
- Cross-module communication should happen through typed commands, queries, or events.
- Security decisions live in `core/security` and are consumed explicitly by apps/modules.

## Sprint 0 Foundation

Sprint 0 establishes Atlas OS as a modular monolith:

- Auth and role policies live in `modules/auth` and `core/security`.
- Multitenancy is carried through `OperationalContext.organizationId` and tenant-scoped repositories.
- The event engine lives in `core/events` and supports named handlers plus global projections.
- Postgres infrastructure lives in `docker-compose.yml` and `infra/postgres/init.sql`.
- Observability lives in `core/observability` with counters, gauges, and structured logs.
- Clean architecture boundaries are kept by making apps orchestrate modules through core contracts.

## First Real Feature: Unified Operational Timeline

The timeline is a cross-domain projection, not a maintenance-only feed. Any module can publish domain events with tenant and subject metadata, and `modules/timeline` turns those facts into entries.

Useful endpoints:

- `GET /timeline?organizationId=org_demo&subjectId=wo_demo`
- `POST /timeline/demo`
- `POST /timeline/entries`
- `POST /maintenance/work-orders`
- `POST /maintenance/work-orders/:id/photos`
- `POST /ai/suggestions`
- `POST /workflow/approvals`
- `GET /observability`
- `GET /dashboard?organizationId=org_demo`

Demo body:

```json
{
  "organizationId": "org_demo",
  "subjectId": "wo_demo",
  "actorId": "usr_demo"
}
```

## Sprint 1: Operational Work Orders

Sprint 1 turns the foundation into the first usable operational workflow:

- Asset CRUD: `POST /assets`, `GET /assets`, `GET/PATCH/DELETE /assets/:id?organizationId=...`
- Work orders: `POST /maintenance/work-orders`, `GET /maintenance/work-orders`, `GET /maintenance/work-orders/:id`
- Status: `PATCH /maintenance/work-orders/:id/status`
- Evidence: `POST /maintenance/work-orders/:id/evidence`
- Checklist: `PATCH /maintenance/work-orders/:id/checklist/:itemId`
- Timeline comments: `POST /maintenance/work-orders/:id/comments`
- AI suggestion linked to OS: `POST /ai/suggestions`
- Budget submission: `POST /maintenance/work-orders/:id/budget`
- Budget approval/rejection: `POST /workflow/approvals`
- Dashboard by organization: `GET /dashboard?organizationId=...`

Golden rule: no important action happens outside the timeline. The operational event stream now includes:

- `AssetCreated`
- `WorkOrderOpened`
- `EvidenceAttached`
- `AiSuggestionCreated`
- `BudgetSubmitted`
- `BudgetApproved`
- `BudgetRejected`
- `WorkOrderClosed`

Additional operational events such as `AssetUpdated`, `ChecklistItemUpdated`, `CommentAdded`, and `WorkOrderStatusChanged` also project into the same timeline.

## Sprint 2: Intelligence Layer

Sprint 2 adds assistive AI for work orders while preserving the event-driven core. The AI reads operational memory from the timeline and writes suggestions back as events. It does not approve, close, or execute critical actions.

Endpoints:

- `POST /ai/work-orders/:id/diagnosis`
- `POST /ai/work-orders/:id/checklist`
- `POST /ai/work-orders/:id/risk`
- `POST /ai/work-orders/:id/budget-draft`
- `POST /ai/work-orders/:id/summary`
- `POST /ai/work-orders/:id/report`

Request body:

```json
{
  "organizationId": "org_demo"
}
```

AI operational events:

- `AiDiagnosisSuggested`
- `AiChecklistGenerated`
- `AiRiskClassified`
- `AiBudgetDrafted`
- `AiTimelineSummarized`
- `TechnicalReportGenerated`

## Sprint 3: Operational Evidence & Reports

Sprint 3 promotes evidence and technical reports into auditable operational records.

Evidence endpoints:

- `GET /maintenance/work-orders/:id/evidence?organizationId=...`
- `POST /maintenance/work-orders/:id/evidence/upload`

Upload body:

```json
{
  "organizationId": "org_demo",
  "kind": "document",
  "title": "Laudo inicial",
  "fileName": "laudo.txt",
  "mimeType": "text/plain",
  "contentBase64": "TGF1ZG8gZGUgdGVzdGU=",
  "metadata": { "source": "field" }
}
```

Report endpoints:

- `GET /reports/work-orders/:id?organizationId=...`
- `POST /reports/work-orders/:id?organizationId=...`
- `GET /reports/work-orders/:id/versions/:reportId/html?organizationId=...`
- `GET /reports/work-orders/:id/versions/:reportId/pdf?organizationId=...`
- `POST /reports/work-orders/:id/versions/:reportId/decision?organizationId=...`

Sprint 3 events:

- `EvidenceUploaded`
- `EvidenceOcrExtracted`
- `ReportVersionCreated`
- `ReportApproved`
- `ReportRejected`

Rules enforced in the current runtime:

- Evidence is always scoped by `organizationId` and `workOrderId`.
- Report versions are generated from timeline entries.
- Approved report versions cannot be changed by a later decision.
- Report and evidence changes are published as events and projected into the timeline.

## Sprint 4: Operational Awareness & Monitoring

Sprint 4 adds continuous operational perception on top of timeline, workflow, evidence, and behavior.

Monitoring endpoints:

- `GET /monitoring/feed?organizationId=...`
- `GET /monitoring/alerts?organizationId=...`
- `GET /monitoring/health?organizationId=...`

Monitoring events:

- `OperationalRiskDetected`
- `SlaViolationPredicted`
- `RecurringFailureDetected`
- `MissingEvidenceDetected`
- `DelayedWorkOrderDetected`
- `HealthScoreRecalculated`

Rules:

- Every detection is derived from timeline state.
- Every operational perception is published as an event and appears in the timeline.
- The monitoring/AI layer can detect and suggest, but never executes mitigation automatically.
- Health scores are recalculated after relevant events.

## Sprint 5: Cognitive Operational Runtime

Sprint 5 moves Atlas from assistive AI into governed cognitive coordination. The runtime reads the timeline as operational memory, coordinates specialized deterministic agents, writes every relevant decision trace back as events, and requests human decision whenever the plan touches critical action.

Operations endpoints:

- `POST /operations/work-orders/:id/coordinate`
- `GET /operations/knowledge-graph?organizationId=...&subjectId=...`
- `GET /operations/digital-twin?organizationId=...&subjectId=...`

Coordination body:

```json
{
  "organizationId": "org_demo",
  "domain": "maintenance",
  "actorId": "usr_demo",
  "specialists": [
    {
      "id": "usr_specialist",
      "name": "Ana Tecnica",
      "domains": ["maintenance"],
      "skills": ["equipment", "rotating_equipment", "field_supervision"],
      "activeWorkOrders": 2
    }
  ]
}
```

Sprint 5 events:

- `WorkflowCoordinationStarted`
- `RiskEscalationSuggested`
- `SpecialistAssignmentRecommended`
- `MissingContextRequested`
- `OperationalPlanGenerated`
- `HumanDecisionRequested`
- `PredictiveRiskDetected`
- `OperationalPatternIdentified`
- `KnowledgeGraphRelationCreated`
- `DigitalTwinStateUpdated`

Rules:

- Coordination requires existing timeline memory.
- Runtime can coordinate, recommend, prioritize, request context, and explain.
- Critical action is never executed automatically; the runtime emits `HumanDecisionRequested`.
- Operational reasoning is stored in the plan metadata and timeline.
- Knowledge graph relations and digital twin state are updated through operational events.
- Domains are represented through a common operational abstraction: `maintenance`, `construction`, `facilities`, `logistics`, and `compliance`.

## Sprint 6: Cognitive Runtime Persistence & Operational Visualization

Sprint 6 consolidates the cognitive kernel into persistent, auditable, replayable operational infrastructure. The runtime still coordinates and recommends only; critical decisions continue to require human approval.

Persistence:

- Knowledge graph state is stored in `.atlas-data/knowledge-graph.json`.
- Digital twin live state and snapshots are stored in `.atlas-data/digital-twin.json`.
- Cognitive coordination history is stored in `.atlas-data/cognitive-history.json`.
- The JSON repositories are deliberately isolated behind module contracts so they can be replaced by Postgres without changing runtime behavior.

Runtime endpoints:

- `GET /operations/runtime-dashboard?organizationId=...&subjectId=...`
- `GET /operations/coordination-history?organizationId=...&subjectId=...`
- `POST /operations/timeline/:subjectId/replay`

Replay body:

```json
{
  "organizationId": "org_demo",
  "limit": 500
}
```

Sprint 6 events:

- `KnowledgeGraphNodeCreated`
- `KnowledgeGraphRelationPersisted`
- `OperationalCausalityDetected`
- `DigitalTwinSnapshotCreated`
- `DigitalTwinStatePersisted`
- `OperationalStateTransitionDetected`
- `CognitiveWorkflowPersisted`
- `OperationalReasoningCaptured`
- `HumanDecisionContextStored`
- `TimelineReplayStarted`
- `OperationalContextReconstructed`
- `HistoricalOperationalStateLoaded`
- `RuntimeMetricCaptured`
- `OperationalTelemetryUpdated`
- `CoordinationPerformanceMeasured`

Rules:

- Every cognitive workflow is persisted with context event references, plan, risk, specialist recommendation, human decision boundary, and reasoning trace.
- Every digital twin update creates a temporal snapshot.
- Knowledge graph relations are versioned and can produce basic operational causality signals.
- Timeline replay reconstructs historical operational state from timeline memory.
- Enterprise should expose a runtime cockpit for live feed, active coordination, pending human decisions, health, digital twin, and graph relations. Field may surface selected runtime signals only when they help immediate field execution.

## Sprint 7: Autonomous Operational Simulation & Foresight Engine

Sprint 7 adds operational foresight without autonomous execution. Atlas can forecast, simulate, compare and explain future operational scenarios, but simulated paths remain isolated from the live Digital Twin and every critical implication triggers a human approval gate.

Foresight persistence:

- Forecasts, scenarios, simulations, comparisons, and temporal analytics are stored in `.atlas-data/foresight.json`.
- Forecasts reference timeline events and include explicit origin, context, causality, expected impact, confidence, and approval gate.
- Scenario simulation projects future risk, health score, SLA state and cost multiplier without mutating real operational state.

Foresight endpoints:

- `POST /operations/work-orders/:id/forecast`
- `POST /operations/work-orders/:id/simulate`
- `POST /operations/work-orders/:id/temporal-analytics`
- `GET /operations/foresight?organizationId=...&subjectId=...`

Simulation body:

```json
{
  "organizationId": "org_demo",
  "domain": "maintenance",
  "scenarios": ["delay", "continue_operating", "sla_missed", "specialist_changed", "missing_evidence"]
}
```

Sprint 7 events:

- `OperationalForecastGenerated`
- `FutureRiskPredicted`
- `OperationalImpactEstimated`
- `CostEscalationPredicted`
- `OperationalBottleneckDetected`
- `OperationalScenarioCreated`
- `OperationalScenarioSimulated`
- `AlternativeOperationalPathGenerated`
- `ScenarioComparisonCompleted`
- `PreventiveActionSuggested`
- `ProactiveEscalationRecommended`
- `OperationalInterventionSuggested`
- `PredictiveCoordinationTriggered`
- `OperationalPatternCorrelated`
- `CausalOperationalRelationDetected`
- `OperationalSimilarityIdentified`
- `TemporalAnalyticsGenerated`
- `OperationalTrendDetected`
- `RiskEvolutionTracked`
- `PredictionConfidenceCalculated`
- `OperationalExplanationGenerated`
- `HumanApprovalGateTriggered`

Rules:

- Forecasting requires timeline memory.
- Predictions never mutate work orders, assets, Digital Twin live state, or approvals.
- Simulated scenarios are explicitly marked `isolatedFromState: true`.
- Every prediction carries confidence and operational explanation.
- High/critical forecast implications trigger `HumanApprovalGateTriggered`.
- Predictive coordination remains recommendation-only unless a human decides.
