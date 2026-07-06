# Data Model: FERM+ Farm Operations Platform

## Overview

The platform uses a farm-centered domain model with strong ownership boundaries, operational histories, and derived planning artifacts. Records that represent real-world changes are captured as durable domain events or transactions, while agenda entries, alerts, dashboards, and reports are computed from those canonical sources and supporting rule templates.

## Entities

### User

**Purpose**: Represents an authenticated platform user.

**Fields**:

- `id`
- `fullName`
- `email`
- `role` with allowed values `ADMIN` or `PROPRIETAIRE`
- `isActive`
- `createdAt`
- `updatedAt`

**Rules**:

- Only `ADMIN` users can create or update operational records.
- A `PROPRIETAIRE` only sees farms explicitly assigned to that user.

### Farm

**Purpose**: Represents a managed farm workspace.

**Fields**:

- `id`
- `name`
- `logoUrl`
- `photoUrl`
- `description`
- `location`
- `surfaceArea`
- `createdOn`
- `status` with allowed values `ACTIVE`, `EN_PREPARATION`, `SUSPENDUE`, `FERMEE`
- `activityType` with allowed values `ELEVAGE`, `CULTURE`, `MIXTE`
- `ownerUserId` nullable
- `createdAt`
- `updatedAt`

**Relationships**:

- One farm may have one assigned owner.
- One farm has many animals, crops, facilities, stock items, tasks, alerts, sanitary events, transactions, and reports.

**State transitions**:

- `EN_PREPARATION -> ACTIVE`
- `ACTIVE -> SUSPENDUE`
- `ACTIVE -> FERMEE`
- `SUSPENDUE -> ACTIVE`
- `SUSPENDUE -> FERMEE`

**Rules**:

- Suspended or closed farms keep historical data.
- Suspended or closed farms cannot generate new active planning tasks until reactivated, except for administrative review or historical regeneration workflows.

### Facility

**Purpose**: Represents a building, enclosure, or production space.

**Fields**:

- `id`
- `farmId`
- `type`
- `name`
- `description`
- `capacity`
- `locationDetail`
- `status`

**Rules**:

- Facility type must align with farm activities where applicable.

### AnimalGroup

**Purpose**: Represents an individual animal or managed lot for operational tracking.

**Fields**:

- `id`
- `farmId`
- `facilityId` nullable
- `trackingMode` with allowed values `INDIVIDUAL` or `LOT`
- `identificationNumber`
- `name` nullable
- `species`
- `subtype`
- `breed`
- `sex`
- `birthDate`
- `currentAgeDays`
- `currentWeight`
- `status`
- `photoUrl`
- `initialCount` nullable
- `currentCount` nullable

**Rules**:

- Poultry, fish, and some rabbit flows may use lot tracking.
- Cattle and breeding animals typically use individual tracking.

### AnimalEvent

**Purpose**: Represents a livestock lifecycle or follow-up event.

**Fields**:

- `id`
- `farmId`
- `animalGroupId`
- `eventType`
- `eventDate`
- `quantity` nullable
- `weight` nullable
- `notes`
- `recordedByUserId`

**Allowed event types**:

- `NAISSANCE`
- `ACHAT`
- `VENTE`
- `DECES`
- `REPRODUCTION`
- `VACCINATION`
- `TRAITEMENT`
- `PESEE`
- `PRODUCTION`

**Rules**:

- Events update derived counts, mortality, production, and growth metrics.

### CropPlot

**Purpose**: Represents a parcel or cultivated area.

**Fields**:

- `id`
- `farmId`
- `name`
- `cropType`
- `surfaceArea`
- `season`
- `status`
- `notes`

### CropOperation

**Purpose**: Represents an operation performed on a crop plot.

**Fields**:

- `id`
- `farmId`
- `cropPlotId`
- `operationType`
- `operationDate`
- `notes`
- `recordedByUserId`

**Allowed operation types**:

- `PREPARATION_SOL`
- `SEMIS`
- `FERTILISATION`
- `DESHERBAGE`
- `IRRIGATION`
- `RECOLTE`

### StockItem

**Purpose**: Represents an inventory item tracked by the farm.

**Fields**:

- `id`
- `farmId`
- `category`
- `name`
- `unit`
- `currentQuantity`
- `lowStockThreshold`
- `isActive`

### StockMovement

**Purpose**: Represents an inventory entry, exit, or adjustment.

**Fields**:

- `id`
- `farmId`
- `stockItemId`
- `movementType` with allowed values `ENTREE`, `SORTIE`, `INVENTAIRE`, `AJUSTEMENT`
- `quantity`
- `movementDate`
- `notes`
- `recordedByUserId`

**Rules**:

- Saving a movement updates the stock item balance and may trigger a low-stock alert.

### SanitaryEvent

**Purpose**: Represents a disease, treatment, vaccination, consultation, or mortality-related health record.

**Fields**:

- `id`
- `farmId`
- `animalGroupId` nullable
- `eventType`
- `eventDate`
- `status`
- `notes`
- `recordedByUserId`

**Rules**:

- Vaccination and treatment events may complete or generate agenda tasks from the sanitary calendar.

### FinancialTransaction

**Purpose**: Represents an expense or revenue line.

**Fields**:

- `id`
- `farmId`
- `transactionType` with allowed values `DEPENSE` or `REVENU`
- `category`
- `amount`
- `transactionDate`
- `referenceModule` nullable
- `notes`
- `recordedByUserId`

**Rules**:

- Profitability views derive from categorized expenses and revenues over a period.

### RuleTemplate

**Purpose**: Represents reusable rule definitions for agenda generation, sanitary schedules, alerts, and recommendations.

**Fields**:

- `id`
- `ruleDomain` with allowed values `AGENDA`, `SANITAIRE`, `ALERTE`, `RECOMMANDATION`
- `appliesToActivityType`
- `appliesToSpeciesOrCrop`
- `conditions`
- `outputTemplate`
- `priority`
- `isActive`

**Rules**:

- Rule templates are versioned logically so updates do not invalidate historical generated records.

### AgendaTask

**Purpose**: Represents a planned, active, completed, or overdue operational task.

**Fields**:

- `id`
- `farmId`
- `sourceRuleTemplateId` nullable
- `relatedEntityType` nullable
- `relatedEntityId` nullable
- `title`
- `description`
- `scheduledDate`
- `scheduledTime`
- `priority`
- `status` with allowed values `A_FAIRE`, `EN_COURS`, `TERMINEE`, `EN_RETARD`
- `isAutoGenerated`
- `completedAt` nullable

**Rules**:

- Mixed farms can generate tasks from both livestock and crop rules.
- Duplicate tasks for the same farm, date, source, and operational purpose should be merged or prevented.

### Alert

**Purpose**: Represents a reminder or anomaly notification visible in the alert center.

**Fields**:

- `id`
- `farmId`
- `taskId` nullable
- `alertType`
- `severity`
- `title`
- `message`
- `triggeredAt`
- `readAt` nullable
- `resolvedAt` nullable

**Allowed alert types**:

- `RAPPEL_TACHE`
- `RETARD_TACHE`
- `MORTALITE_ELEVEE`
- `BAISSE_PRODUCTION`
- `RETARD_VACCINATION`
- `STOCK_FAIBLE`
- `PERTE_FINANCIERE`
- `CROISSANCE_FAIBLE`

### Report

**Purpose**: Represents a generated technical, sanitary, financial, production, or profitability output.

**Fields**:

- `id`
- `farmId`
- `reportType`
- `periodStart`
- `periodEnd`
- `fileFormat`
- `fileUrl`
- `generatedAt`
- `generatedByUserId`

## Cross-Entity Rules

- Every writeable domain record must be tied to a farm.
- Farm ownership scope is evaluated before any read or write operation.
- Dashboard and report aggregates must distinguish zero-value metrics from unavailable metrics.
- Derived artifacts such as alerts and agenda tasks should be reproducible from canonical records and active rule templates.
