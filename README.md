# Atlas OS

Atlas OS is organized as an operational monorepo with three executable apps, shared core services, and domain modules.

## Workspace Map

- `apps/api`: HTTP API boundary.
- `apps/worker`: background event processor.
- `apps/web`: browser shell for operations.
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
npm run dev:worker
npm run dev:web
```

The current foundation is intentionally dependency-light. The API and worker can run on Node primitives, while the web app is a static operational shell that can later be upgraded to a framework when product flows settle.

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
