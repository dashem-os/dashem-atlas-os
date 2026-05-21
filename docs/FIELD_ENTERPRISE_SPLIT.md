# Field and Enterprise Split Recovery Note

This note exists to prevent future agents from repeating a critical product-line mistake.

## What Happened

Commit `074e103` introduced the ATLAS OS Field PWA, but it replaced the existing `apps/web` Enterprise/ERP shell. That was incorrect because the Enterprise shell was the original administrative product surface.

The correct architecture is two product lines over one intelligent core:

- `apps/field`: ATLAS OS Field, PWA mobile-first for technicians, lightweight finance, supervisors, autonomous workers and microbusinesses.
- `apps/web`: ATLAS OS Enterprise, web-first ERP/admin shell for large engineering, maintenance and operations companies.
- `apps/api`, `apps/worker`, `core/*`, and `modules/*`: shared intelligent core, agentic platform, AI gateway, event/timeline memory, governance and domain rules.

## Recovery Point

The Enterprise shell was restored from commit `f2e12dd` into `apps/web/src/server.ts`.

The Field PWA from commit `074e103` was moved into `apps/field`.

Do not delete or overwrite either app to implement features in the other.

## Rules for Future Work

- Field changes go in `apps/field` unless they are shared API/core/domain behavior.
- Enterprise changes go in `apps/web` unless a future dedicated rename to `apps/enterprise` is performed.
- Shared behavior goes in `core/*`, `modules/*`, `apps/api`, or `apps/worker`.
- Do not convert Enterprise into Field.
- Do not convert Field into Enterprise.
- Do not merge both navigation models into one primary screen.
- If a requested change appears to affect both product lines, update shared core first and then adapt both shells explicitly.
- Field must not present mock data, fake intelligence, simulated finance, or placeholder documents as if they were real.
- If a capability is not implemented end to end, show it as blocked/planned with the required next field or do not show it in the primary flow.
- Every Field action should have one of these states: available, requires setup, requires selected OS, or planned.
- Creation flows must ask for the minimum required fields before sending data to the API.

## Ports and Scripts

- Field defaults to `http://localhost:5174` and can be started with `npm run dev:field`.
- Enterprise defaults to `http://localhost:5173` and can be started with `npm run dev:enterprise` or the legacy `npm run dev:web`.
- API defaults to `http://localhost:4000` and can be started with `npm run dev:api`.

## Product Intent

Field is "touch and execute".

Enterprise is "administer, govern and analyze".

Both are powered by one ATLAS OS intelligent core.
