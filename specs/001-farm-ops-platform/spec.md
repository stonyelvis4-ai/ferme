# Feature Specification: FERM+ Farm Operations Platform

**Feature Branch**: `001-farm-ops-platform`  
**Created**: 2026-06-29  
**Status**: Draft  
**Input**: User description: "Application web FERM+ de gestion agricole et d'elevage avec agenda intelligent, alertes, suivi sanitaire, stocks, finances, tableaux de bord et rapports"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage a farm from one workspace (Priority: P1)

An ADMIN creates and configures a farm, assigns its owner, records the farm's activity profile, and can access the farm's operational data from a single workspace.

**Why this priority**: The rest of the platform depends on having a farm, its ownership, and its base configuration in place before operational tracking can deliver value.

**Independent Test**: Can be fully tested by creating a farm with its profile, assigning an owner, and confirming that the farm appears with the correct status and visible modules.

**Acceptance Scenarios**:

1. **Given** an ADMIN is authenticated, **When** the ADMIN creates a farm with its identity, location, size, activity type, and status, **Then** the system stores the farm and displays it in the farm list.
2. **Given** a farm exists, **When** the ADMIN assigns a PROPRIETAIRE to that farm, **Then** the owner can access that farm in read-only mode.
3. **Given** a PROPRIETAIRE is viewing the farm, **When** the page is loaded, **Then** action controls for create, edit, and delete are hidden.

---

### User Story 2 - Use the intelligent agenda to organize operations (Priority: P1)

An ADMIN relies on the agenda as the main operational cockpit to view automatically generated tasks, reminders, alerts, and overdue work for livestock and crop activities.

**Why this priority**: The intelligent agenda is the core value proposition of FERM+ and the main mechanism that turns farm data into useful daily execution.

**Independent Test**: Can be fully tested by configuring a farm with animals or crops, verifying that tasks are generated automatically, and validating that the agenda displays them in daily, weekly, monthly, and list views.

**Acceptance Scenarios**:

1. **Given** a farm has configured livestock or crop cycles, **When** the schedule rules are applied, **Then** the system generates dated operational tasks with priority and status.
2. **Given** tasks exist for a farm, **When** the ADMIN opens the agenda, **Then** the system shows tasks of the day, upcoming tasks, completed tasks, overdue tasks, events, reminders, and alerts.
3. **Given** a task is approaching or overdue, **When** its reminder threshold is reached, **Then** the system adds the corresponding notification to the alert center.

---

### User Story 3 - Track production, health, inventory, and finances (Priority: P2)

An ADMIN records operational events across animals, crops, sanitary follow-up, stocks, and finances in order to monitor performance and make informed decisions.

**Why this priority**: Once the farm and agenda exist, operational data capture is what keeps the platform useful over time and supports reporting and recommendations.

**Independent Test**: Can be fully tested by entering operational records in each module and confirming that dashboards, alerts, and reports update accordingly.

**Acceptance Scenarios**:

1. **Given** an ADMIN records health events, stock movements, and financial transactions, **When** the records are saved, **Then** the system updates the related histories, balances, and metrics.
2. **Given** performance thresholds are exceeded or missed, **When** new data is recorded, **Then** the system raises the corresponding operational alerts.
3. **Given** farm data exists across modules, **When** the ADMIN requests a report, **Then** the system produces a technical, sanitary, production, financial, or profitability report in a downloadable format.

---

### User Story 4 - Consult farm performance in read-only mode (Priority: P3)

A PROPRIETAIRE consults the assigned farm's agenda, alerts, finances, dashboards, and reports without being able to alter operational data.

**Why this priority**: This role increases stakeholder visibility and trust, but it depends on ADMIN workflows and platform data already being in place.

**Independent Test**: Can be fully tested by signing in as a read-only owner and verifying access to consultation screens while confirming that no write action is available.

**Acceptance Scenarios**:

1. **Given** a PROPRIETAIRE is assigned to a farm, **When** the owner opens the application, **Then** the owner can view only the assigned farm's information, agenda, alerts, dashboards, finances, and reports.
2. **Given** a PROPRIETAIRE accesses any module, **When** the interface renders, **Then** all creation, modification, and deletion actions remain unavailable.

### Edge Cases

- If a farm is marked as suspended or closed, the system must preserve historical data while preventing new active operational planning for that farm.
- If a farm has both livestock and crop activities, the agenda must merge generated tasks without duplicating reminders for the same operational event.
- If an owner is not assigned to a farm, the farm remains accessible only to ADMIN users.
- If reminder channels such as email or push are not enabled, the in-application alert center must still capture all task reminders and alerts.
- If stock, health, or finance data is incomplete for a period, dashboards and reports must still display available data and clearly distinguish missing information from zero values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support exactly two user roles: ADMIN with full management permissions and PROPRIETAIRE with read-only access.
- **FR-002**: The system MUST allow an ADMIN to create, update, deactivate, and archive a farm record with name, logo, photo, description, location, size, creation date, owner assignment, activity type, and status.
- **FR-003**: The system MUST support farm statuses of Active, En preparation, Suspendue, and Fermee.
- **FR-004**: The system MUST support farm activity types of Elevage, Culture, and Mixte.
- **FR-005**: The system MUST allow an ADMIN to assign one owner to a farm and MUST restrict a PROPRIETAIRE to viewing only assigned farm data.
- **FR-006**: The system MUST hide all create, edit, delete, and configuration actions from PROPRIETAIRE users across all modules.
- **FR-007**: The system MUST provide an intelligent agenda as the primary operational workspace for each farm.
- **FR-008**: The system MUST automatically generate agenda tasks based on applicable livestock species, crop type, animal age, production cycle, sanitary calendar, and agricultural season.
- **FR-009**: Each generated or manually managed task MUST include a date, time, priority, status, and farm context.
- **FR-010**: The system MUST support task statuses of A faire, En cours, Terminee, and En retard.
- **FR-011**: The agenda MUST provide daily, weekly, monthly, and list views.
- **FR-012**: The agenda MUST display tasks of the day, upcoming tasks, completed tasks, overdue tasks, events, reminders, and alerts.
- **FR-013**: The system MUST create reminder notifications at least 24 hours before a task, a few hours before a task, at the scheduled time, and when a task becomes overdue.
- **FR-014**: The system MUST provide a centralized alert center that groups task reminders, operational alerts, and system notifications.
- **FR-015**: The system MUST support in-application notifications and MUST be designed to accommodate sound alarms, mobile push notifications, optional email notifications, and future SMS or WhatsApp notifications.
- **FR-016**: The system MUST allow an ADMIN to manage animal records with identification, species, breed, sex, birth date, age, weight, photo, status, and lifecycle events.
- **FR-017**: The system MUST record animal follow-up events including birth, purchase, sale, death, reproduction, treatments, vaccinations, and weigh-ins.
- **FR-018**: The system MUST support livestock-specific tracking for poultry, cattle, sheep and goats, pigs, fish farming, rabbits, and beekeeping with production and growth indicators relevant to each category.
- **FR-019**: The system MUST allow an ADMIN to manage crop records including parcels, cultivated area, crop calendar, operations follow-up, yield, and harvests.
- **FR-020**: The system MUST allow an ADMIN to manage buildings and enclosures including poultry houses, barns, sheepfolds, pigsties, ponds, and fenced areas.
- **FR-021**: The system MUST allow an ADMIN to manage stock items for feed, medicines, seeds, fertilizers, equipment, and materials.
- **FR-022**: The stock module MUST record entries, exits, inventories, and low-stock alerts.
- **FR-023**: The system MUST allow an ADMIN to record sanitary data including diseases, vaccinations, treatments, consultations, mortality, and sanitary history.
- **FR-024**: The system MUST automatically generate a sanitary calendar adapted to each relevant species.
- **FR-025**: The system MUST allow an ADMIN to record farm expenses and revenues by category and compute turnover, total expenses, profit, loss, net margin, and profitability.
- **FR-026**: The system MUST provide dashboards with farm counts, animal counts, crop counts, production metrics, revenue, expenses, profit, tasks, and alerts.
- **FR-027**: The dashboard experience MUST present key indicators, interactive charts, and interactive tables suited to mobile, tablet, and desktop consultation.
- **FR-028**: The system MUST generate automatic alerts for elevated mortality, production decline, vaccination delays, low stock, financial losses, and low growth.
- **FR-029**: The system MUST generate technical, sanitary, financial, production, and profitability reports.
- **FR-030**: The system MUST allow reports to be exported in PDF and spreadsheet-compatible formats.
- **FR-031**: The system MUST present recommendations tailored to the farm's livestock and crop activities, including feeding, vaccination, cleaning, reproduction, growth, irrigation, fertilization, and harvest-related guidance where relevant.
- **FR-032**: The interface MUST be responsive across mobile, tablet, and desktop form factors and support both light and dark visual themes.
- **FR-033**: The platform MUST preserve historical records for operational, sanitary, stock, and financial events so users can review past performance over time.
- **FR-034**: The system MUST ensure that alerts, dashboards, and reports reflect the latest saved operational data for the relevant farm.

### Key Entities *(include if feature involves data)*

- **Utilisateur**: Represents an authenticated person using the platform with a role, identity, and access scope.
- **Ferme**: Represents a managed agricultural business unit with identity, location, ownership, activity profile, and lifecycle status.
- **AgendaTask**: Represents an operational task or reminder with scheduling, priority, status, origin rule, and farm linkage.
- **Alerte**: Represents a notification or warning generated from reminders, thresholds, or operational anomalies.
- **Animal**: Represents an individual animal or managed lot with biological attributes, status, and lifecycle history.
- **Culture**: Represents a crop activity on a parcel with crop type, calendar, operations, and yield tracking.
- **BatimentOuEnclos**: Represents a physical farm space used for housing animals, production, storage, or confinement.
- **StockItem**: Represents a tracked inventory resource with category, quantity movement history, and alert state.
- **EvenementSanitaire**: Represents a disease, vaccination, treatment, consultation, mortality event, or sanitary follow-up entry.
- **TransactionFinanciere**: Represents an expense or revenue entry attached to a farm activity, category, date, and amount.
- **Rapport**: Represents a generated analytical output summarizing one or more farm domains for consultation or export.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An ADMIN can create and configure a new farm, assign its owner, and access the farm workspace in under 10 minutes without external assistance.
- **SC-002**: At least 90% of required routine livestock or crop tasks for a configured farm appear automatically in the agenda before their planned execution date.
- **SC-003**: Users can identify overdue work, active alerts, and today's priorities for a farm within 60 seconds of opening the agenda or dashboard.
- **SC-004**: A PROPRIETAIRE can consult the assigned farm's key information, agenda, finances, dashboards, and reports with zero write actions exposed.
- **SC-005**: Operational alerts for low stock, delayed vaccination, elevated mortality, production decline, financial loss, or weak growth are visible in the alert center within one minute of the triggering data being recorded.
- **SC-006**: Users can generate a requested report for an active farm in under 2 minutes for standard reporting periods.
- **SC-007**: At least 95% of primary consultation screens remain usable on mobile, tablet, and desktop without horizontal overflow or blocked actions.

## Assumptions

- The first release targets a single platform for authenticated farm administrators and owners, without public access.
- Each farm has one primary assigned owner for read-only consultation, while ADMIN users may access all farms.
- The initial release prioritizes in-application alerts as the guaranteed notification channel; email and mobile push may be enabled progressively without changing core behavior.
- Intelligent recommendations and task generation are based on predefined business rules per species, crop, season, and production cycle rather than on external sensor integrations in the first release.
- Report exports may use PDF and spreadsheet-compatible files generated from the same operational data already visible in dashboards.
- Historical operational data remains available even when a farm is suspended or closed.
