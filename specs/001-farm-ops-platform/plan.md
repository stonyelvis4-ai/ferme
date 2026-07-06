# Implementation Plan: FERM+ Farm Operations Platform

**Branch**: `001-farm-ops-platform` | **Date**: 2026-06-29 | **Spec**: [spec.md](C:\MES PROJETS\FERM+\specs\001-farm-ops-platform\spec.md)
**Input**: Feature specification from `C:\MES PROJETS\FERM+\specs\001-farm-ops-platform\spec.md`

**Note**: This plan assumes a greenfield implementation because the repository currently contains Spec Kit scaffolding but no application code, package manifests, or architecture constraints.

## Summary

Build `FERM+` as a responsive web application with a dedicated `frontend/` and `backend/`, centered on a rule-based intelligent agenda that orchestrates farm operations, alerts, dashboards, reports, and read-only owner access. The initial implementation favors explicit business rules, event-driven alert recalculation, and modular domain services so we can ship a strong MVP first and expand species, crops, and notification channels incrementally.

## Technical Context

**Language/Version**: TypeScript 5.x across frontend and backend  
**Primary Dependencies**: Next.js for the web application shell, NestJS for modular backend services, Prisma ORM for data access, a component/charting stack for dashboards, and a job scheduling library for reminders and recurring task generation  
**Storage**: PostgreSQL for transactional data, object storage for farm media and exported reports  
**Testing**: Vitest for unit tests, Playwright for end-to-end flows, API integration tests for backend modules and role enforcement  
**Target Platform**: Modern web browsers on mobile, tablet, and desktop, backed by a Linux-hosted web stack  
**Project Type**: Web application with separate frontend and backend services  
**Performance Goals**: Agenda and dashboard views load primary farm data in under 2 seconds for standard farm sizes; alert creation appears in the alert center within 1 minute of triggering data changes  
**Constraints**: Read-only owner permissions must be enforced in both UI and API layers; mixed farms must avoid duplicate generated tasks; suspended and closed farms preserve history while blocking new active planning; missing metrics must be distinguishable from zero values  
**Scale/Scope**: Initial release supports dozens to hundreds of farms, each with thousands of operational records, across farm setup, agenda, alerts, livestock, crops, sanitary tracking, stock, finance, dashboards, recommendations, and report exports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No enforceable constitution rules are currently defined. The available constitution file is still a placeholder template, so there are no active governance gates blocking planning. We will still apply sensible greenfield standards:

- Keep the architecture modular by domain.
- Enforce authorization at the API boundary and in UI rendering.
- Prefer testable business services over tightly coupled screen logic.
- Defer non-essential integrations such as SMS, WhatsApp, and sensor ingestion.

**Post-design check**: Pass. The proposed structure remains modular, testable, and consistent with the greenfield scope.

## Project Structure

### Documentation (this feature)

```text
specs/001-farm-ops-platform/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.yaml
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   ├── farms/
│   ├── agenda/
│   ├── alerts/
│   ├── livestock/
│   ├── crops/
│   ├── facilities/
│   ├── inventory/
│   ├── sanitary/
│   ├── finance/
│   ├── dashboards/
│   ├── reports/
│   ├── recommendations/
│   ├── rules/
│   └── shared/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── hooks/
│   ├── lib/
│   └── styles/
└── tests/
    ├── e2e/
    └── unit/

packages/
└── domain-rules/
    ├── src/
    └── tests/
```

**Structure Decision**: Use a web application layout with separate `frontend/` and `backend/` services plus a shared `packages/domain-rules/` workspace for task generation, sanitary schedules, alert thresholds, and recommendation rules. This keeps the agenda engine reusable and independently testable while supporting a premium responsive UI.

## Phase 0 Research Focus

Phase 0 resolves the key design decisions that would otherwise stay ambiguous:

1. Confirm a greenfield monorepo with `frontend`, `backend`, and shared rule package.
2. Choose relational storage and model boundaries suitable for farm operations, task generation, and audit history.
3. Define how reminders and alerts are recalculated within the one-minute expectation.
4. Define a role and access strategy that cleanly separates ADMIN full access from PROPRIETAIRE read-only scoped access.
5. Define a report export strategy that supports PDF and spreadsheet-compatible outputs from the same canonical datasets.

## Phase 1 Design Output

Phase 1 produces:

- a normalized but implementation-friendly data model for farms, operations, alerts, and finance
- API contracts for authentication, farm workspace, agenda, alerts, dashboards, and operational modules
- a quickstart for bootstrapping the greenfield codebase
- updated agent context reflecting the chosen stack

## Implementation Strategy

1. Establish repository foundations and shared workspace tooling.
2. Implement identity, role enforcement, and farm ownership scoping first.
3. Build farm setup and agenda foundations before deeper operational modules.
4. Add livestock, crops, sanitary, stock, and finance capture as event-producing domains.
5. Compute dashboards, alerts, recommendations, and reports from those canonical records.
6. Expand notification channels and advanced rule coverage after the MVP operational loop is stable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate frontend and backend | The product includes role-based access, scheduling, exports, alerts, and many domain modules | A single tightly coupled app would slow independent evolution of UI, API, jobs, and report generation |
| Shared domain rules package | Agenda generation, recommendations, and sanitary rules must stay consistent across services and tests | Duplicating rule logic in frontend and backend would create drift and weaken trust in operational outputs |
