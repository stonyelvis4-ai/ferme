# FERM+ Laravel 13 Scaffold

This directory contains the first Laravel 13 backend scaffold for FERM+,
aligned with the MVP backlog prioritization document.

## Scope

- authentication
- farm bootstrap
- admin-created owner accounts
- tenant isolation by `farm_id`
- base settings
- task backbone
- audit log

## Notes

- This scaffold is intentionally framework-oriented and does not include a
  runnable Laravel runtime in this environment because `php` and `composer`
  are not available on the machine.
- Once PHP 8.3+ and Composer are installed, this directory can be converted
  into a standard Laravel 13 application.

