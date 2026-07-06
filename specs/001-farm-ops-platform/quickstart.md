# Quickstart: FERM+ Farm Operations Platform

## Goal

Bootstrap the first runnable version of `FERM+` as a greenfield monorepo with a responsive frontend, modular backend, shared business rules, and a relational database.

## Suggested Workspace Setup

```text
frontend/              Web application for ADMIN and PROPRIETAIRE experiences
backend/               API, scheduling, exports, and domain orchestration
packages/domain-rules/ Shared rules for agenda, alerts, sanitary calendars, and recommendations
specs/                 Product and implementation documentation
```

## Recommended First Milestones

1. Initialize the monorepo and shared TypeScript tooling.
2. Scaffold the backend service with auth, farms, and agenda modules.
3. Scaffold the frontend application with authentication, shell layout, dashboard, and agenda routes.
4. Define the relational schema for users, farms, rule templates, tasks, alerts, and core operational records.
5. Implement role-aware authentication and farm ownership scoping.
6. Implement farm creation and read-only owner consultation.
7. Implement rule-based task generation and alert center flows.
8. Add livestock, crop, sanitary, stock, and finance capture modules.
9. Add dashboards, recommendations, and report exports.
10. Add end-to-end coverage for ADMIN and PROPRIETAIRE primary flows.

## MVP Delivery Slice

The first demonstrable MVP should include:

- login and role-based access
- farm creation and owner assignment
- farm list and farm detail workspace
- intelligent agenda with generated tasks
- alert center with reminder and overdue states
- one livestock workflow, one crop workflow, stock tracking, sanitary follow-up, and finance tracking
- dashboard overview and one downloadable report

## Validation Priorities

- Confirm a PROPRIETAIRE never sees write actions and cannot mutate data through API calls.
- Confirm task generation works for at least one livestock case and one crop case.
- Confirm alerts appear after task lateness and threshold-triggering records.
- Confirm mixed farm data appears in one unified agenda without duplicate reminders.
- Confirm reports and dashboards use the same canonical aggregates.
