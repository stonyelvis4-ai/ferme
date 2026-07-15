# FERM+ Blueprint

## 1. Product Core

FERM+ is a multi-tenant farm management application with one strict tenant model:

- `1 administrator = 1 farm = 1 private workspace`
- each farm is isolated from all others
- every business record must carry a `farmId`
- the owner user belongs to the same farm and is mostly read-only

The system is not a set of isolated modules. It is an interconnected operation engine:

`Farm -> Business Entity -> Operation -> Task -> Calendar -> Stock -> Finance -> Alert -> Dashboard -> Report -> Audit`

## 2. Recommended Architecture

Use a modular monolith first. It matches the product complexity better than early microservices.

Suggested layers:

1. `app`
   Handles auth, routing, UI, API surface, PWA shell, offline queue UI.
2. `domain`
   Contains business modules and inter-module rules.
3. `application`
   Orchestrates use cases and transactions.
4. `infrastructure`
   Database, file storage, notifications, sync engine, background jobs.

Recommended runtime capabilities:

- multi-tenant auth with role checks
- relational database with transactions
- background jobs for reminders, alerts, report generation, sync retries
- local offline storage for queued operations
- audit logging as a first-class concern

## 3. Core Bounded Modules

### Shared Core

- Auth
- Users
- Farms
- Settings
- Attachments
- Audit
- Sync
- Notifications

### Business Modules

- Dashboard
- Livestock
- Layers
- Fish Farming
- Crops
- Stock
- Finance
- Sanitary
- Buildings
- Tasks
- Calendar
- Alerts
- Reports

## 4. Tenant and Security Rules

Mandatory rules:

- every query must be scoped by `farmId`
- every write must validate current user role and `farmId`
- administrator can only own one farm
- owner cannot create or manage farms or users
- no record may exist without a farm unless it is a global technical reference
- deletes are logical by default: `archivedAt`, `deletedAt`, `isActive`

Audit must be automatic for important actions:

- create
- update
- archive
- logical delete
- sync conflict resolution
- authentication-sensitive actions

## 5. Core Entities

### Identity and Tenant

- `User`
- `Farm`
- `FarmMembership`
- `Role` with values `ADMIN`, `OWNER`
- `Session`

### Cross-Cutting

- `AuditLog`
- `Attachment`
- `Notification`
- `SyncOperation`
- `SyncConflict`
- `ReportExport`

### Operations Backbone

- `Task`
- `CalendarEvent`
- `Alert`
- `FinancialTransaction`
- `StockItem`
- `StockMovement`

### Business Entities

- `Building`
- `LivestockBatch`
- `LayerBatch`
- `FishPond`
- `FishBatch`
- `Plot`
- `CropCampaign`
- `HealthOperation`

Every operation-producing entity should expose:

- source module
- source entity type
- source entity id
- optional parent operation id

## 6. Cross-Module Transaction Pattern

Each business action should be executed as one application transaction plus one durable side-effect bundle.

Example pattern:

1. validate tenant and role
2. lock target aggregate if needed
3. write business operation
4. write linked task/calendar changes
5. write stock changes
6. write finance changes
7. evaluate alerts
8. enqueue dashboard/report refresh signals
9. append audit log
10. commit

Idempotency is required for:

- offline resubmission
- repeated client retries
- flaky network submissions
- sync replay

Suggested fields:

- `operationId`
- `idempotencyKey`
- `sourceModule`
- `sourceEntityType`
- `sourceEntityId`

## 7. Offline and Sync Model

The sync engine should store operations, not partial UI state.

### Sync statuses

- `SYNCED`
- `PENDING`
- `IN_PROGRESS`
- `CONFLICT`
- `ERROR`

### Rule

An interconnected action must sync as one coherent operation. Never sync only the finance row without the stock movement that belongs to the same source operation.

### Local queue payload

- operation type
- farm id
- actor id
- source entity metadata
- business payload
- idempotency key
- created at
- retry count
- sync status

## 8. Module Interaction Examples

### Livestock vaccination

- create health operation
- create or update task
- create calendar event
- deduct vaccine from stock
- create sanitary expense if applicable
- update batch health history
- close task when completed
- create audit log
- evaluate overdue or missed alerts

### Egg sale

- create sale operation
- deduct egg stock
- create revenue transaction
- update profitability counters
- refresh dashboard metrics
- append audit log

### Crop harvest

- close harvest task
- create harvested stock entry
- update plot and campaign yield
- optionally create sale and revenue
- append audit log
- include in production reporting

## 9. Database Conventions

Required columns on nearly all tenant tables:

- `id`
- `farmId`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `archivedAt` nullable
- `deletedAt` nullable
- `syncStatus`

Useful constraints:

- unique farm owner membership
- unique administrator farm
- unique idempotency key per farm and operation type
- foreign keys preserving history
- no hard delete on operation tables

## 10. API / Use Case Priorities

### Phase 1

- auth
- farm creation
- admin profile
- owner creation
- settings bootstrap

### Phase 2

- tasks
- calendar
- stock
- finance
- audit
- alerts foundation

### Phase 3

- livestock
- layers
- sanitary
- buildings

### Phase 4

- crops
- fish farming
- reports
- dashboard aggregation

### Phase 5

- PWA installability
- offline queue
- sync conflict handling
- push notifications
- attachments

## 11. Non-Functional Requirements

- responsive across desktop, tablet, mobile
- installable PWA
- offline-safe operation queue
- secure password storage
- session management
- farm isolation on every request
- auditability
- exportable reports
- backup and restore strategy

## 12. Open Technical Decisions

These choices should be fixed before scaffolding:

1. frontend stack
2. backend stack
3. database choice
4. auth provider
5. file storage strategy
6. notification channel strategy
7. sync conflict policy

## 13. Build Recommendation

If starting from zero, the fastest stable path is:

1. web app with responsive mobile-first UI
2. API-backed modular monolith
3. PostgreSQL
4. background jobs
5. PWA shell and offline queue after core transactions are stable

Do not build dashboard, alerts, reports, and sync as isolated features. They should consume source operations emitted by business modules.
