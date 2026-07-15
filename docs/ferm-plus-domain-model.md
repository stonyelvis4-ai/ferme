# FERM+ Domain Model

## Core Roles

### Administrator

- creates account
- creates and configures farm
- creates owner account
- manages all modules
- reads full audit

### Owner

- belongs to admin farm
- mostly read-only
- can view operational modules, dashboard, alerts, reports
- cannot manage users, farm structure, or sensitive settings

## Aggregate Candidates

### Farm

Owns:

- users
- settings
- buildings
- batches
- ponds
- plots
- stock
- finance
- tasks
- calendar
- alerts
- reports
- audit

### Task

Fields:

- title
- description
- farmId
- sourceModule
- sourceEntityType
- sourceEntityId
- startDate
- dueDate
- priority
- status
- reminderAt
- createdBy

Enums:

- priority: `LOW`, `NORMAL`, `HIGH`, `CRITICAL`
- status: `TODO`, `IN_PROGRESS`, `DONE`, `OVERDUE`, `CANCELLED`

### CalendarEvent

Fields:

- farmId
- title
- startAt
- endAt
- linkedTaskId nullable
- sourceModule
- sourceEntityType
- sourceEntityId

Rule:

- moving an event updates the source schedule when the source is schedule-driven

### StockItem

Fields:

- farmId
- name
- categoryId
- unit
- minimumThreshold
- currentQuantity
- locationId nullable

### StockMovement

Fields:

- farmId
- stockItemId
- type: `IN`, `OUT`, `ADJUSTMENT`
- quantity
- unitCost nullable
- sourceModule
- sourceEntityType
- sourceEntityId
- operationId

Rule:

- duplicate movement creation for the same idempotent operation is forbidden

### FinancialTransaction

Fields:

- farmId
- type: `EXPENSE`, `REVENUE`
- amount
- categoryId
- sourceModule
- sourceEntityType
- sourceEntityId
- operationId
- occurredAt

### Alert

Fields:

- farmId
- type
- severity
- title
- description
- sourceModule
- sourceEntityType
- sourceEntityId
- status

### AuditLog

Fields:

- farmId
- userId
- module
- entityType
- entityId
- action
- oldValue
- newValue
- occurredAt
- deviceInfo
- syncStatus

## Business Aggregates

### LivestockBatch

- species
- breed
- buildingId
- initialCount
- currentCount
- acquisitionCost
- startDate
- status

Derived consequences:

- building assignment
- finance expense
- sanitary schedule
- tasks
- calendar events
- audit

### LayerBatch

- batch metadata
- daily egg production
- broken eggs
- losses
- egg stock linkage
- sale linkage

### FishPond

- building-style technical entity for fish operations
- linked maintenance schedule
- linked fish batches

### FishBatch

- pondId
- species
- quantity
- feed usage linkage
- mortality tracking
- harvest linkage

### Plot

- name
- area
- crop capability
- optional geolocation

### CropCampaign

- plotId
- cropType
- startDate
- expectedHarvestDate
- status

Derived consequences:

- calendar
- tasks
- stock usage
- expenses
- harvest stock
- optional sales

### HealthOperation

- farmId
- targetType
- targetId
- operationType: `VACCINATION`, `TREATMENT`
- scheduledAt
- completedAt nullable
- product linkage
- stock linkage
- cost linkage

## Recommended Event Names

Use domain events internally even in a modular monolith:

- `farm.created`
- `owner.created`
- `livestock.batch.created`
- `health.operation.scheduled`
- `health.operation.completed`
- `egg.production.recorded`
- `egg.sale.recorded`
- `fish.feed.distributed`
- `fish.harvest.recorded`
- `crop.campaign.created`
- `crop.harvest.recorded`
- `stock.threshold.reached`
- `task.overdue.detected`
- `sync.operation.failed`

These events are useful for:

- alerts
- dashboard refresh
- reports
- notifications
- audit enrichment
