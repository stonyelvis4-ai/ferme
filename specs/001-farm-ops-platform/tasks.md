# Tasks: FERM+ Farm Operations Platform

**Input**: Design documents from `C:\MES PROJETS\FERM+\specs\001-farm-ops-platform\`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api.yaml`, `quickstart.md`

**Tests**: Test work is deferred until implementation slices are in place. This task list focuses first on delivering the application structure and independently usable story increments.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Which user story this task belongs to
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the greenfield monorepo and base developer tooling

- [ ] T001 Create root workspace manifests in `C:\MES PROJETS\FERM+\package.json`, `C:\MES PROJETS\FERM+\pnpm-workspace.yaml`, and `C:\MES PROJETS\FERM+\tsconfig.base.json`
- [ ] T002 [P] Create backend package manifests and TypeScript config in `C:\MES PROJETS\FERM+\backend\package.json` and `C:\MES PROJETS\FERM+\backend\tsconfig.json`
- [ ] T003 [P] Create frontend package manifests and TypeScript config in `C:\MES PROJETS\FERM+\frontend\package.json` and `C:\MES PROJETS\FERM+\frontend\tsconfig.json`
- [ ] T004 [P] Create shared rules package manifests in `C:\MES PROJETS\FERM+\packages\domain-rules\package.json` and `C:\MES PROJETS\FERM+\packages\domain-rules\tsconfig.json`
- [ ] T005 Configure repository scripts and environment samples in `C:\MES PROJETS\FERM+\.gitignore`, `C:\MES PROJETS\FERM+\.editorconfig`, and `C:\MES PROJETS\FERM+\.env.example`
- [ ] T006 [P] Configure linting and formatting in `C:\MES PROJETS\FERM+\eslint.config.js` and `C:\MES PROJETS\FERM+\prettier.config.cjs`
- [ ] T007 Create backend application bootstrap in `C:\MES PROJETS\FERM+\backend\src\main.ts` and `C:\MES PROJETS\FERM+\backend\src\app.module.ts`
- [ ] T008 [P] Create frontend application shell bootstrap in `C:\MES PROJETS\FERM+\frontend\src\app\layout.tsx`, `C:\MES PROJETS\FERM+\frontend\src\app\page.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\styles\globals.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish core platform infrastructure that blocks all user stories

**⚠️ CRITICAL**: No story implementation should begin before this phase is complete

- [ ] T009 Create the initial relational schema in `C:\MES PROJETS\FERM+\backend\prisma\schema.prisma`
- [ ] T010 [P] Create seed-ready reference enums and constants in `C:\MES PROJETS\FERM+\backend\src\shared\domain\constants.ts`
- [ ] T011 Implement database and Prisma integration in `C:\MES PROJETS\FERM+\backend\src\shared\database\prisma.module.ts` and `C:\MES PROJETS\FERM+\backend\src\shared\database\prisma.service.ts`
- [ ] T012 [P] Implement shared API configuration, validation, and exception filters in `C:\MES PROJETS\FERM+\backend\src\shared\http\validation.ts`, `C:\MES PROJETS\FERM+\backend\src\shared\http\exception-filter.ts`, and `C:\MES PROJETS\FERM+\backend\src\shared\http\api-response.ts`
- [ ] T013 Implement authentication and session modules in `C:\MES PROJETS\FERM+\backend\src\auth\auth.module.ts`, `C:\MES PROJETS\FERM+\backend\src\auth\auth.service.ts`, and `C:\MES PROJETS\FERM+\backend\src\auth\auth.controller.ts`
- [ ] T014 [P] Implement role and farm-scope guards in `C:\MES PROJETS\FERM+\backend\src\auth\guards\roles.guard.ts` and `C:\MES PROJETS\FERM+\backend\src\auth\guards\farm-scope.guard.ts`
- [ ] T015 Create shared backend user and farm access entities in `C:\MES PROJETS\FERM+\backend\src\shared\domain\user.entity.ts` and `C:\MES PROJETS\FERM+\backend\src\shared\domain\farm-access.entity.ts`
- [ ] T016 Create frontend auth/session service and route protection in `C:\MES PROJETS\FERM+\frontend\src\services\auth-client.ts`, `C:\MES PROJETS\FERM+\frontend\src\lib\session-store.ts`, and `C:\MES PROJETS\FERM+\frontend\src\hooks\use-session.ts`
- [ ] T017 [P] Create the shared domain-rules package entry points in `C:\MES PROJETS\FERM+\packages\domain-rules\src\index.ts`, `C:\MES PROJETS\FERM+\packages\domain-rules\src\agenda-rules.ts`, `C:\MES PROJETS\FERM+\packages\domain-rules\src\alert-rules.ts`, and `C:\MES PROJETS\FERM+\packages\domain-rules\src\sanitary-rules.ts`
- [ ] T018 Implement backend job scheduling foundation for reminders and recalculation in `C:\MES PROJETS\FERM+\backend\src\shared\jobs\jobs.module.ts` and `C:\MES PROJETS\FERM+\backend\src\shared\jobs\reminder.scheduler.ts`
- [ ] T019 Create frontend application frame, sidebar, theme provider, and responsive shell in `C:\MES PROJETS\FERM+\frontend\src\components\app-shell.tsx`, `C:\MES PROJETS\FERM+\frontend\src\components\sidebar.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\components\theme-provider.tsx`
- [ ] T020 Create base API client and farm context utilities in `C:\MES PROJETS\FERM+\frontend\src\services\api-client.ts`, `C:\MES PROJETS\FERM+\frontend\src\services\farm-client.ts`, and `C:\MES PROJETS\FERM+\frontend\src\hooks\use-active-farm.ts`

**Checkpoint**: Foundation ready. User stories can now be implemented in priority order.

---

## Phase 3: User Story 1 - Manage a farm from one workspace (Priority: P1) 🎯 MVP

**Goal**: Allow an ADMIN to create and configure farms, assign an owner, and expose a farm workspace with strict read-only owner behavior.

**Independent Test**: An ADMIN can create a farm, assign a PROPRIETAIRE, and the owner can open the farm workspace without any visible create, edit, or delete controls.

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create farm domain entities and repository contracts in `C:\MES PROJETS\FERM+\backend\src\farms\domain\farm.entity.ts`, `C:\MES PROJETS\FERM+\backend\src\farms\domain\farm-status.ts`, and `C:\MES PROJETS\FERM+\backend\src\farms\domain\farm.repository.ts`
- [ ] T022 [P] [US1] Create farm request and response DTOs in `C:\MES PROJETS\FERM+\backend\src\farms\dto\create-farm.dto.ts`, `C:\MES PROJETS\FERM+\backend\src\farms\dto\update-farm.dto.ts`, and `C:\MES PROJETS\FERM+\backend\src\farms\dto\farm-response.dto.ts`
- [ ] T023 [US1] Implement farm persistence and ownership assignment in `C:\MES PROJETS\FERM+\backend\src\farms\farms.repository.ts` and `C:\MES PROJETS\FERM+\backend\src\farms\farms.service.ts`
- [ ] T024 [US1] Implement farm API endpoints from the contract in `C:\MES PROJETS\FERM+\backend\src\farms\farms.controller.ts` and `C:\MES PROJETS\FERM+\backend\src\farms\farms.module.ts`
- [ ] T025 [P] [US1] Create frontend farm list and farm workspace routes in `C:\MES PROJETS\FERM+\frontend\src\app\farms\page.tsx` and `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\page.tsx`
- [ ] T026 [P] [US1] Create reusable farm forms and summary cards in `C:\MES PROJETS\FERM+\frontend\src\features\farms\farm-form.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\farms\farm-summary-card.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\features\farms\farm-status-badge.tsx`
- [ ] T027 [US1] Implement farm CRUD client flows and owner assignment UI in `C:\MES PROJETS\FERM+\frontend\src\services\farms-service.ts` and `C:\MES PROJETS\FERM+\frontend\src\features\farms\farm-owner-assignment.tsx`
- [ ] T028 [US1] Enforce read-only owner action masking in `C:\MES PROJETS\FERM+\frontend\src\components\permission-gate.tsx` and integrate it in `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\page.tsx`
- [ ] T029 [US1] Add empty, suspended, and closed farm workspace states in `C:\MES PROJETS\FERM+\frontend\src\features\farms\farm-workspace-state.tsx`

**Checkpoint**: User Story 1 is independently usable as the first MVP slice.

---

## Phase 4: User Story 2 - Use the intelligent agenda to organize operations (Priority: P1)

**Goal**: Deliver the agenda as the main operational cockpit with generated tasks, views, reminders, and alert-center visibility.

**Independent Test**: A configured farm with livestock or crop rules produces agenda tasks that appear in daily, weekly, monthly, and list views with overdue and reminder visibility.

### Implementation for User Story 2

- [ ] T030 [P] [US2] Create agenda and alert domain entities in `C:\MES PROJETS\FERM+\backend\src\agenda\domain\agenda-task.entity.ts` and `C:\MES PROJETS\FERM+\backend\src\alerts\domain\alert.entity.ts`
- [ ] T031 [P] [US2] Create rule templates and generation inputs in `C:\MES PROJETS\FERM+\packages\domain-rules\src\rule-template.types.ts` and `C:\MES PROJETS\FERM+\packages\domain-rules\src\generation-inputs.ts`
- [ ] T032 [US2] Implement agenda task generation logic in `C:\MES PROJETS\FERM+\packages\domain-rules\src\generate-agenda-tasks.ts`
- [ ] T033 [US2] Implement alert threshold and reminder generation logic in `C:\MES PROJETS\FERM+\packages\domain-rules\src\generate-alerts.ts`
- [ ] T034 [US2] Implement backend agenda services and persistence in `C:\MES PROJETS\FERM+\backend\src\agenda\agenda.service.ts`, `C:\MES PROJETS\FERM+\backend\src\agenda\agenda.repository.ts`, and `C:\MES PROJETS\FERM+\backend\src\agenda\agenda.module.ts`
- [ ] T035 [US2] Implement backend alert center services in `C:\MES PROJETS\FERM+\backend\src\alerts\alerts.service.ts`, `C:\MES PROJETS\FERM+\backend\src\alerts\alerts.repository.ts`, and `C:\MES PROJETS\FERM+\backend\src\alerts\alerts.module.ts`
- [ ] T036 [US2] Implement agenda and alert API endpoints from `contracts/api.yaml` in `C:\MES PROJETS\FERM+\backend\src\agenda\agenda.controller.ts` and `C:\MES PROJETS\FERM+\backend\src\alerts\alerts.controller.ts`
- [ ] T037 [P] [US2] Create frontend agenda pages and calendar views in `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\agenda\page.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\agenda\agenda-calendar.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\features\agenda\agenda-list.tsx`
- [ ] T038 [P] [US2] Create agenda task cards, filters, and overdue sections in `C:\MES PROJETS\FERM+\frontend\src\features\agenda\agenda-task-card.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\agenda\agenda-filters.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\features\agenda\overdue-panel.tsx`
- [ ] T039 [P] [US2] Create alert center UI and notification badges in `C:\MES PROJETS\FERM+\frontend\src\features\alerts\alert-center.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\alerts\alert-item.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\components\notification-badge.tsx`
- [ ] T040 [US2] Wire frontend agenda and alert data clients in `C:\MES PROJETS\FERM+\frontend\src\services\agenda-service.ts` and `C:\MES PROJETS\FERM+\frontend\src\services\alerts-service.ts`
- [ ] T041 [US2] Add duplicate-prevention and suspended-farm logic to generation flows in `C:\MES PROJETS\FERM+\backend\src\agenda\agenda-generation.policy.ts`

**Checkpoint**: User Story 2 becomes the operational heart of the product and can be validated independently after US1 foundations exist.

---

## Phase 5: User Story 3 - Track production, health, inventory, and finances (Priority: P2)

**Goal**: Capture the operational records that feed dashboards, alerts, recommendations, and reports.

**Independent Test**: An ADMIN can record livestock, crop, sanitary, inventory, and financial events for a farm and see those records saved with updated derived balances or metrics.

### Implementation for User Story 3

- [ ] T042 [P] [US3] Create livestock domain files in `C:\MES PROJETS\FERM+\backend\src\livestock\domain\animal-group.entity.ts` and `C:\MES PROJETS\FERM+\backend\src\livestock\domain\animal-event.entity.ts`
- [ ] T043 [P] [US3] Create crop and facility domain files in `C:\MES PROJETS\FERM+\backend\src\crops\domain\crop-plot.entity.ts`, `C:\MES PROJETS\FERM+\backend\src\crops\domain\crop-operation.entity.ts`, and `C:\MES PROJETS\FERM+\backend\src\facilities\domain\facility.entity.ts`
- [ ] T044 [P] [US3] Create inventory, sanitary, and finance domain files in `C:\MES PROJETS\FERM+\backend\src\inventory\domain\stock-item.entity.ts`, `C:\MES PROJETS\FERM+\backend\src\inventory\domain\stock-movement.entity.ts`, `C:\MES PROJETS\FERM+\backend\src\sanitary\domain\sanitary-event.entity.ts`, and `C:\MES PROJETS\FERM+\backend\src\finance\domain\financial-transaction.entity.ts`
- [ ] T045 [US3] Implement livestock module APIs and services in `C:\MES PROJETS\FERM+\backend\src\livestock\livestock.module.ts`, `C:\MES PROJETS\FERM+\backend\src\livestock\livestock.service.ts`, and `C:\MES PROJETS\FERM+\backend\src\livestock\livestock.controller.ts`
- [ ] T046 [US3] Implement crop and facility module APIs and services in `C:\MES PROJETS\FERM+\backend\src\crops\crops.module.ts`, `C:\MES PROJETS\FERM+\backend\src\crops\crops.service.ts`, `C:\MES PROJETS\FERM+\backend\src\crops\crops.controller.ts`, and `C:\MES PROJETS\FERM+\backend\src\facilities\facilities.service.ts`
- [ ] T047 [US3] Implement inventory, sanitary, and finance module APIs and services in `C:\MES PROJETS\FERM+\backend\src\inventory\inventory.module.ts`, `C:\MES PROJETS\FERM+\backend\src\inventory\inventory.service.ts`, `C:\MES PROJETS\FERM+\backend\src\sanitary\sanitary.service.ts`, and `C:\MES PROJETS\FERM+\backend\src\finance\finance.service.ts`
- [ ] T048 [US3] Connect operational writes to alert and agenda recalculation in `C:\MES PROJETS\FERM+\backend\src\shared\events\farm-domain-events.ts` and `C:\MES PROJETS\FERM+\backend\src\shared\events\farm-domain-event-handler.ts`
- [ ] T049 [P] [US3] Create frontend livestock and crop management pages in `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\livestock\page.tsx` and `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\crops\page.tsx`
- [ ] T050 [P] [US3] Create frontend sanitary, inventory, and finance management pages in `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\sanitary\page.tsx`, `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\inventory\page.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\finance\page.tsx`
- [ ] T051 [P] [US3] Create operational forms and tables in `C:\MES PROJETS\FERM+\frontend\src\features\livestock\animal-form.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\crops\crop-plot-form.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\inventory\stock-movement-form.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\sanitary\sanitary-event-form.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\features\finance\transaction-form.tsx`
- [ ] T052 [US3] Implement frontend operational data clients in `C:\MES PROJETS\FERM+\frontend\src\services\livestock-service.ts`, `C:\MES PROJETS\FERM+\frontend\src\services\crops-service.ts`, `C:\MES PROJETS\FERM+\frontend\src\services\inventory-service.ts`, `C:\MES PROJETS\FERM+\frontend\src\services\sanitary-service.ts`, and `C:\MES PROJETS\FERM+\frontend\src\services\finance-service.ts`

**Checkpoint**: User Story 3 makes the platform data-rich enough to drive the remaining consultation and reporting features.

---

## Phase 6: User Story 4 - Consult farm performance in read-only mode (Priority: P3)

**Goal**: Give the PROPRIETAIRE a polished read-only experience across dashboard, agenda, alerts, finances, and reports.

**Independent Test**: A PROPRIETAIRE can open the assigned farm and navigate dashboard, agenda, alerts, finances, and reports without any write path or actionable mutation controls.

### Implementation for User Story 4

- [ ] T053 [P] [US4] Create dashboard aggregation service in `C:\MES PROJETS\FERM+\backend\src\dashboards\dashboards.service.ts` and `C:\MES PROJETS\FERM+\backend\src\dashboards\dashboards.controller.ts`
- [ ] T054 [P] [US4] Create report generation service in `C:\MES PROJETS\FERM+\backend\src\reports\reports.service.ts`, `C:\MES PROJETS\FERM+\backend\src\reports\reports.controller.ts`, and `C:\MES PROJETS\FERM+\backend\src\reports\report-exporter.ts`
- [ ] T055 [P] [US4] Create recommendation service driven by shared rules in `C:\MES PROJETS\FERM+\backend\src\recommendations\recommendations.service.ts` and `C:\MES PROJETS\FERM+\backend\src\recommendations\recommendations.controller.ts`
- [ ] T056 [US4] Enforce owner-scoped consultation across dashboard, finance, alerts, and reports in `C:\MES PROJETS\FERM+\backend\src\shared\authorization\owner-read.policy.ts`
- [ ] T057 [P] [US4] Create dashboard and KPI UI in `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\dashboard\page.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\dashboard\kpi-grid.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\features\dashboard\performance-charts.tsx`
- [ ] T058 [P] [US4] Create report and recommendation UI in `C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\reports\page.tsx`, `C:\MES PROJETS\FERM+\frontend\src\features\reports\report-download-card.tsx`, and `C:\MES PROJETS\FERM+\frontend\src\features\recommendations\recommendation-panel.tsx`
- [ ] T059 [US4] Create owner-facing finance and alert summary panels in `C:\MES PROJETS\FERM+\frontend\src\features\finance\finance-summary-panel.tsx` and `C:\MES PROJETS\FERM+\frontend\src\features\alerts\alert-summary-panel.tsx`
- [ ] T060 [US4] Apply read-only navigation and hidden-actions behavior throughout the owner experience in `C:\MES PROJETS\FERM+\frontend\src\components\owner-navigation.tsx` and `C:\MES PROJETS\FERM+\frontend\src\lib\read-only-actions.ts`

**Checkpoint**: User Story 4 completes the stakeholder consultation flow with secure read-only access.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and delivery readiness across all stories

- [ ] T061 [P] Add repository onboarding documentation in `C:\MES PROJETS\FERM+\README.md`
- [ ] T062 [P] Add seeded demo data definitions in `C:\MES PROJETS\FERM+\backend\prisma\seed.ts`
- [ ] T063 Improve responsive and theme consistency in `C:\MES PROJETS\FERM+\frontend\src\styles\globals.css` and `C:\MES PROJETS\FERM+\frontend\src\styles\tokens.css`
- [ ] T064 Add audit logging for core farm mutations and operational events in `C:\MES PROJETS\FERM+\backend\src\shared\logging\audit-log.service.ts`
- [ ] T065 Optimize dashboard, agenda, and report query composition in `C:\MES PROJETS\FERM+\backend\src\dashboards\dashboards.queries.ts`, `C:\MES PROJETS\FERM+\backend\src\agenda\agenda.queries.ts`, and `C:\MES PROJETS\FERM+\backend\src\reports\report.queries.ts`
- [ ] T066 Run quickstart alignment pass and update delivery notes in `C:\MES PROJETS\FERM+\specs\001-farm-ops-platform\quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and starts immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all story work.
- **Phase 3: US1** depends on Phase 2 and defines the first MVP slice.
- **Phase 4: US2** depends on Phase 2 and on the farm context from US1.
- **Phase 5: US3** depends on Phase 2 and becomes much more valuable once US2 exists.
- **Phase 6: US4** depends on Phase 2 and on data produced by US1, US2, and US3.
- **Phase 7: Polish** depends on completion of the desired stories.

### User Story Dependencies

- **US1**: Starts first after the foundation because it establishes farm ownership and workspace access.
- **US2**: Relies on farm existence and access control from US1.
- **US3**: Can begin after the foundation, but it integrates best after agenda structures from US2 are in place.
- **US4**: Requires mature consultation data from the previous stories.

### Within Each User Story

- Domain entities and DTOs come before services.
- Services come before controllers and frontend integrations.
- Backend APIs should exist before frontend pages are fully wired.
- Read-only and business-rule enforcement should be added before the phase is considered complete.

### Parallel Opportunities

- Setup tasks marked `[P]` can run together once the workspace structure exists.
- In Foundational, frontend shell, rules package, and shared HTTP infrastructure can be built in parallel.
- In US1, backend farm modeling and frontend farm pages can progress in parallel after API boundaries are clear.
- In US2, rule generation, backend agenda services, and frontend alert center work can be split across teammates.
- In US3, each operational domain module can be assigned independently before integration wiring.
- In US4, dashboards, reports, and recommendations can be built in parallel.

---

## Parallel Example: User Story 2

```bash
Task: "Create agenda and alert domain entities in C:\MES PROJETS\FERM+\backend\src\agenda\domain\agenda-task.entity.ts and C:\MES PROJETS\FERM+\backend\src\alerts\domain\alert.entity.ts"
Task: "Create rule templates and generation inputs in C:\MES PROJETS\FERM+\packages\domain-rules\src\rule-template.types.ts and C:\MES PROJETS\FERM+\packages\domain-rules\src\generation-inputs.ts"
Task: "Create frontend agenda pages and calendar views in C:\MES PROJETS\FERM+\frontend\src\app\farms\[farmId]\agenda\page.tsx and C:\MES PROJETS\FERM+\frontend\src\features\agenda\agenda-calendar.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete **US1** to establish authentication, farm creation, owner assignment, and the farm workspace.
3. Complete **US2** to deliver the intelligent agenda and alert center.
4. Validate the product as a credible MVP around farm management plus operational scheduling.

### Incremental Delivery

1. Add **US3** to make the platform operationally rich and self-feeding with real farm data.
2. Add **US4** to complete the secure owner consultation experience.
3. Finish with the polish phase for demo readiness, onboarding, performance, and consistency.

### Parallel Team Strategy

1. One developer can own backend foundation while another owns frontend shell during Phase 2.
2. Once US1 is stable, one stream can focus on agenda and alerts while another prepares livestock, crop, inventory, sanitary, and finance modules.
3. Dashboard, report, and recommendation work can begin once operational records are flowing.

---

## Notes

- Total tasks: 66
- US1 tasks: 9
- US2 tasks: 12
- US3 tasks: 11
- US4 tasks: 8
- Parallelizable tasks identified: 28
- Suggested MVP scope: Phase 1, Phase 2, Phase 3, and Phase 4
- All tasks follow the required checklist format with task ID and explicit file paths
