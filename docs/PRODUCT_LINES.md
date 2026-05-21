# ATLAS OS Product Lines

ATLAS OS has two product experiences over the same intelligent core. Future agents must preserve this separation.

## Shared Intelligent Core

ATLAS OS Field and ATLAS OS Enterprise are not separate systems. They are two interfaces over the same core platform:

- Agentic Platform
- AI Gateway
- unified events and operational timeline
- work orders, assets, organizations, budgets, approvals, reports and monitoring modules
- security, tenant context, observability and audit trails
- the five ATLAS OS pillars

Domain rules, agent behavior, event contracts, timeline memory and governance should live in `core/*` and `modules/*`. Product-specific interaction patterns should live in app shells.

## ATLAS OS Field

Field is the mobile-first operational product for technicians, lightweight finance users, autonomous workers, microbusinesses and supervisors in the daily field flow.

Primary channel:

- PWA first
- mobile-first
- responsive on desktop, but not desktop-dense

Experience rules:

- first screen is an operational card dashboard
- bottom navigation is the primary navigation on mobile
- floating quick action button handles creation flows
- sidebar/menu is only support for settings, administration, integrations and advanced reports
- AI appears in context, not hidden in a generic menu
- workflows optimize for speed, touch, clarity and few clicks

Expected Field modules:

- Nova OS
- Gerar Orcamento
- Clientes
- Estoque
- Fluxo de Caixa
- Financeiro
- Assistente IA
- Ativos/Equipamentos
- Agenda Tecnica
- Chamados Pendentes

Field must not become a legacy ERP surface with a giant sidebar, dozens of menus and dense desktop-first tables.

## ATLAS OS Enterprise

Enterprise is the web-first administrative product for large engineering, maintenance and operations companies.

Primary channel:

- administrative web first
- desktop-first
- responsive where useful, but optimized for supervision, governance and analysis

Experience rules:

- denser dashboards are acceptable
- advanced filters, tables and multi-panel views are appropriate
- navigation can expose hierarchy, permissions, reporting, integrations and governance
- digital twin, runtime dashboard, foresight, knowledge graph and advanced monitoring belong here first
- Enterprise can manage Field users, teams, contracts, units and operational policies

Expected Enterprise modules:

- ERP-style administrative work orders
- contracts and organizations
- multi-team supervision
- SLA and KPI governance
- advanced finance and billing
- reports and technical documentation
- runtime cockpit
- digital twin
- knowledge graph
- foresight and simulations
- integrations and permissions

Enterprise can be operationally dense, but it must still use modern product design and remain clearly governed by the shared core.

## Implementation Guidance

The current `apps/web` shell is ATLAS OS Field unless a future refactor splits apps explicitly.

When Enterprise evolves, prefer one of these structures:

```txt
apps/field
apps/enterprise
apps/api
apps/worker
```

or a route-level split inside the current web app:

```txt
/field
/enterprise
```

Do not blend Field and Enterprise interaction models into the same primary screen. Field is "touch and execute"; Enterprise is "administer, govern and analyze".

Both product lines must continue to use the same core modules, event stream, timeline memory, AI gateway and agentic platform.
