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

Demo body:

```json
{
  "organizationId": "org_demo",
  "subjectId": "wo_demo",
  "actorId": "usr_demo"
}
```
