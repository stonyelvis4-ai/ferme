# Research: FERM+ Farm Operations Platform

## Decision 1: Build as a greenfield web monorepo

**Decision**: Use a monorepo with `frontend/`, `backend/`, and a shared `packages/domain-rules/` package.

**Rationale**: The repository currently contains no application code. A monorepo keeps the first implementation cohesive while allowing clear separation between UI, API, and shared rule logic for agenda generation, sanitary calendars, alerts, and recommendations.

**Alternatives considered**:

- Single application project: simpler at the very beginning, but it would tightly couple UI, backend logic, and scheduled jobs.
- Fully separate repositories: stronger isolation, but too heavy for a first greenfield delivery.

## Decision 2: Use a relational domain model centered on farm events

**Decision**: Model the platform around relational farm entities and immutable operational events for livestock, crops, sanitary tracking, stock movements, and financial transactions.

**Rationale**: The product needs dashboards, audit history, exports, and alert recalculation from consistent records. A relational core makes ownership, filtering, aggregation, and historical review easier to reason about than an unstructured event store for the initial release.

**Alternatives considered**:

- Document-oriented storage: flexible but weaker for relational reporting and permissions.
- Pure event sourcing: powerful for traceability but unnecessarily complex for the initial scope.

## Decision 3: Use rule-based agenda and recommendations in V1

**Decision**: Implement deterministic business rules for task generation, sanitary schedules, alert thresholds, and recommendations instead of predictive AI or sensor-driven automation.

**Rationale**: The specification already supports a strong operational MVP through predefined rules per species, crop, season, and production cycle. Deterministic rules are easier to validate with farmers and safer to ship first.

**Alternatives considered**:

- AI-generated schedules: attractive but harder to verify and explain.
- External sensor integration: useful later, but not required for the initial user value loop.

## Decision 4: Use event-driven recalculation for alerts and agenda freshness

**Decision**: Recompute affected alerts, reminders, and derived metrics whenever triggering records change, and back this with scheduled jobs for time-based reminders.

**Rationale**: The specification expects alerts to appear within one minute after triggering data is recorded. Combining write-time recalculation with scheduled reminder jobs gives predictable freshness without requiring a more complex streaming platform on day one.

**Alternatives considered**:

- Batch recalculation only: simpler, but too slow for the alert requirement.
- Full stream-processing architecture: scalable, but unnecessary for the initial release.

## Decision 5: Enforce permissions in both API and UI

**Decision**: Treat API authorization as the source of truth, while also tailoring the UI to hide disallowed actions from PROPRIETAIRE users.

**Rationale**: The specification explicitly requires that owner users never create, modify, or delete and that action buttons stay hidden. Enforcing this in both layers protects data integrity and keeps the experience coherent.

**Alternatives considered**:

- UI-only restrictions: unsafe because direct API access could bypass controls.
- API-only restrictions: secure but would expose confusing dead-end actions in the interface.

## Decision 6: Generate reports from canonical operational views

**Decision**: Build PDF and spreadsheet-compatible reports from the same canonical farm aggregates used by dashboards.

**Rationale**: This keeps numbers aligned across consultation, exports, and alerts while reducing duplicate reporting logic.

**Alternatives considered**:

- Independent reporting pipelines: more flexible later, but too much divergence risk for V1.
- Manual export templates disconnected from dashboard aggregates: fast to start, but weak for consistency.
