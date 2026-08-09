# WeaveOne — Development & Functional Specification
## Textile Fabric Costing & Manufacturing ERP Platform

| Field | Value |
|---|---|
| Document Type | Development & Functional Specification |
| Version | 3.0 |
| Status | Development Baseline |
| Primary Audience | Developers, Solution Architects, UI/UX Developers, QA Engineers, DevOps |
| Source | Refactored from WeaveOne PRD v2.0 |
| Application Type | Responsive Web Application |
| Primary Currency | INR |
| Database | PostgreSQL 15+ |
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| ORM | Prisma |
| Decimal Engine | decimal.js |
| Deployment | Docker Compose / Container Platform |

> **Document objective:** This version is intentionally development-focused. Business background, personas, business-value narrative, and management-oriented explanations have been removed from the primary specification. The document concentrates on modules, screens, functions, data, APIs, calculations, validation, permissions, integrations, testing, and deployment.
>
> **Source fidelity:** Functional and technical requirements below are derived from the supplied PRD. Where the source contains an assumption, the assumption marker is retained rather than silently changing the requirement.

## 1. Development Scope

### 1.1 Implementation Principles

1. Implement the application as a modular monolith with clear service boundaries.
2. Keep calculation logic independent from UI and persistence.
3. Use exact decimal arithmetic for all monetary and quantity calculations.
4. Never use JavaScript `Number` for monetary values.
5. Preserve historical cost sheets through immutable value snapshots.
6. Enforce authorization at API/service level, not only in the UI.
7. Every mutation must be auditable.
8. Use soft deletion for business records where downstream references exist.
9. Use server-side pagination, filtering and sorting for large datasets.
10. Keep print/PDF layouts based on the same React print component.
11. Design Phase 1 schema and APIs so later phases extend the model without replacing core entities.

### 1.2 Phase Scope

| Phase | Development Scope |
|---|---|
| 1 | Authentication, users/roles, settings, masters, yarn/rates, costing, calculation engine, versioning/approval, print/export/import, reports, search, dashboard, audit, backup |
| 2 | Design repository, feeder management, image/file management, buyer sharing, design comparison, notifications |
| 3 | Production orders, loom allocation, beam/warp/weft planning, job cards, production capture, downtime, consumption, operator performance |
| 4 | Inventory, warehouse, barcode/QR traceability |
| 5 | Sales, quotations, orders, dispatch, invoices, outstanding, job work, customer portal, integrations |
| 6 | Quality inspection, shade approval, defect mapping, lab records |
| 7 | Machine/IoT dashboards, downtime/energy analytics, predictive maintenance, AI layer |


## 2. Technology & Architecture


### 2.1 Required Stack

| Layer | Technology | Requirement |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Required |
| Styling | Tailwind CSS | Required |
| Data grid | TanStack Table | Required for spreadsheet-style data |
| Forms | React Hook Form + Zod | Required |
| Server state | TanStack Query | Required |
| Charts | Recharts | Required |
| Backend | Node.js + Express + TypeScript | Required |
| ORM | Prisma | Required |
| Database | PostgreSQL 15+ | Required |
| Decimal | decimal.js | Required |
| Auth | JWT + rotating refresh token | Required |
| Cache / revocation | Redis where required by security architecture | Required for token deny-list when enabled |
| Files | S3-compatible object storage / MinIO | Required |
| Excel | ExcelJS | Required |
| PDF | Headless Chrome rendering React print components | Required |
| Reverse proxy | Nginx | Required |
| Deployment | Docker Compose / container platform | Required |

### 2.2 Application Layers

```text
React UI
   ↓
API Client / TanStack Query
   ↓
Express REST API
   ↓
Authorization / Validation / Audit Middleware
   ↓
Application Services
   ├── Costing Service
   ├── Master Service
   ├── Workflow Service
   ├── Reporting Service
   ├── File Service
   └── Integration Service
   ↓
Prisma ORM
   ↓
PostgreSQL
   ↓
Object Storage / Redis / External Integrations
```

### 2.3 Repository Structure

```text
/apps
  /web
  /api
/packages
  /shared-types
  /validation
  /decimal-engine
  /ui
  /config
  /reporting
/prisma
/tests
  /unit
  /integration
  /e2e
  /fixtures
/docker
/docs
```


## 3. Module Register


## 4.0 Module Register

| Module ID | Module | Phase | Priority | Depends On |
|---|---|---|---|---|
| M01 | Authentication & Session Management | 1 | P0 | — |
| M02 | User & Role Management | 1 | P0 | M01 |
| M03 | System Settings & Constants | 1 | P0 | M02 |
| M04 | Master Data Management (9 masters) | 1 | P0 | M02, M03 |
| M05 | Material / Yarn Master & Rate History | 1 | P0 | M04 |
| M06 | Cost Sheet — Header & Identity | 1 | P0 | M04, M05 |
| M07 | Cost Sheet — Warp Section | 1 | P0 | M06, M10 |
| M08 | Cost Sheet — Weft Section | 1 | P0 | M06, M10 |
| M09 | Cost Sheet — Summary, Wastage, Process, Card, Pricing | 1 | P0 | M07, M08, M10 |
| M10 | Exact Decimal Calculation Engine | 1 | P0 | M03 |
| M11 | Versioning, Lifecycle & Approval Workflow | 1 | P0 | M06, M02 |
| M12 | Print, PDF Export, Excel Export & Import | 1 | P1 | M09, M04 |
| M13 | Reporting Engine (Phase 1 report set) | 1 | P1 | M09, M05 |
| M14 | Audit History | 1 | P0 | M02 |
| M15 | Dashboard & KPIs | 1 | P2 | M13 |
| M16 | Global & Advanced Search | 1 | P1 | M04, M06 |
| M17 | Backup, Restore & Data Retention | 1 | P1 | all |
| M18 | Design Repository & Technical Specification | 2 | P0 | M04 |
| M19 | Feeder Colourway Management | 2 | P0 | M18 |
| M20 | Fabric Image Gallery & File Management | 2 | P1 | M18 |
| M21 | Buyer Communication (WhatsApp / Email Share) | 2 | P2 | M18, M20 |
| M22 | Design Comparison & Cross-Reference | 2 | P2 | M18, M19 |
| M23 | Production Order Management | 3 | P0 | M11, M18 |
| M24 | Loom Planning & Allocation | 3 | P0 | M23, M04 |
| M25 | Beam Planning, Warp & Weft Planning | 3 | P1 | M24 |
| M26 | Job Card Voucher | 3 | P0 | M23, M19 |
| M27 | Daily Production & Downtime Capture | 3 | P1 | M26 |
| M28 | Yarn Consumption & Wastage Analysis | 3 | P1 | M27, M05 |
| M29 | Operator Performance | 3 | P2 | M27 |
| M30 | Inventory — Yarn, Beam, Grey, Finished, Chemicals, Accessories | 4 | P0 | M04, M27 |
| M31 | Warehouse, Barcode & QR Traceability | 4 | P1 | M30 |
| M32 | Sales — Customer, Quotation, Order, Dispatch, Invoice, Outstanding | 5 | P0 | M11, M30 |
| M33 | Job Work Management & Portal | 5 | P1 | M30 |
| M34 | Customer Portal | 5 | P2 | M32 |
| M35 | Quality — Grey & 4-Point Inspection, Shade, Defect Map, Lab | 6 | P0 | M27, M30 |
| M36 | Machine Dashboard, IoT, Downtime & Energy | 7 | P1 | M27 |
| M37 | Predictive Maintenance & AI Layer | 7 | P2 | M36 |
| M38 | Notification & Escalation Engine | 2 | P1 | M02 |
| M39 | Integration Gateway (ERP, Accounting, Barcode, Printers) | 5 | P1 | M32 |

**Priority key:** `P0` = must have, blocks release; `P1` = should have, release with documented workaround; `P2` = could have, deferrable without release impact.

---

## 4. Functional Module Specifications


### M01 — Authentication & Session Management


**Purpose**

Establish verified user identity for every request and maintain revocable sessions, so that all downstream authorisation and audit attribution is trustworthy.


**Development Description**

Email-and-password authentication issuing a short-lived JWT access token and a long-lived rotating refresh token. Refresh tokens are persisted server-side so that sessions can be revoked. No costing or master data endpoint is reachable without a valid access token.


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M01-01 | Login | Email + password; returns access token (15 min) and refresh token (7 days, HttpOnly cookie) |
| FR-M01-02 | Logout | Invalidates the current refresh token server-side |
| FR-M01-03 | Logout all devices | Invalidates every refresh token for the user |
| FR-M01-04 | Token refresh | Exchanges a valid refresh token for a new access + refresh pair (rotation) |
| FR-M01-05 | Profile retrieval | Returns identity, role, permission set, preferences |
| FR-M01-06 | Change own password | Requires current password; invalidates all other sessions |
| FR-M01-07 | Forgot password | Emails a single-use, 30-minute reset token `[A-12]` |
| FR-M01-08 | Account lockout | 5 consecutive failures locks the account for 15 minutes |
| FR-M01-09 | Idle timeout | 30 minutes of inactivity ends the session; configurable |
| FR-M01-10 | Session inventory | User can view and terminate their own active sessions |
| FR-M01-11 | Forced password change | Admin can flag an account to require a password change at next login |
| FR-M01-12 | Optional 2FA (TOTP) | Deferred to Phase 2; schema provisioned in Phase 1 |


**Development / Business Rules**

- **BR-01** — Inactive users (`active = false`) cannot authenticate, regardless of credential validity.
- **BR-02** — Passwords are stored only as Argon2id hashes. Plain text or reversible encryption is prohibited.
- **BR-03** — A refresh token is single-use; presenting a previously used refresh token invalidates the entire token family and forces re-authentication (replay detection).
- **BR-04** — Login attempts, successes, failures, lockouts and password changes are written to audit.
- **BR-05** — Error messages for unknown email and wrong password are identical, to prevent account enumeration.


**Dependencies**

Email delivery service (M38) for password reset. Blocked by nothing.


**Expected Outputs**

Access token, refresh cookie, user profile payload, audit entries.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** an active user with correct credentials, **when** they log in, **then** an access token valid for 15 minutes and a rotating refresh token are issued and a `LOGIN_SUCCESS` audit record is written.
2. **Given** 5 consecutive failed attempts, **when** a 6th is made within the window, **then** the response is a lockout message and no distinction is made between wrong password and unknown user.
3. **Given** a deactivated user with correct credentials, **when** they log in, **then** authentication fails and an `AUTH_DENIED_INACTIVE` audit record is written.
4. **Given** a refresh token that has already been used, **when** it is presented again, **then** all tokens in that family are revoked and the user must re-authenticate.
5. **Given** any API request without a valid access token, **when** it targets a protected endpoint, **then** HTTP 401 is returned with no data leakage.

`[ASSUMPTION A-12]` SMTP relay credentials will be provided by the company. If no mail infrastructure exists, password reset falls back to an Administrator-initiated reset with a one-time code delivered out of band.

---


### M02 — User & Role Management


**Purpose**

Define who exists in the system and what each person may do, expressed as roles composed of granular permissions.


**Development Description**

Administrators create users, assign exactly one primary role, and optionally grant or revoke individual permission overrides. Roles are seeded with the Phase 1 set (Admin, Costing User, Approver/Viewer) and extended per phase. The permission model is capability-based (`costsheet.create`, `master.yarn.update`, `costsheet.approve`), not role-name-based, so that new roles are configuration rather than code.


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M02-01 | Create user | Name, email, role, initial password or invite link, active flag |
| FR-M02-02 | Edit user | Name, email, role, contact, department, active flag |
| FR-M02-03 | Deactivate / reactivate user | Soft state change; records are never hard-deleted |
| FR-M02-04 | Reset user password | Admin-initiated; forces change at next login |
| FR-M02-05 | Role management | Create, edit, clone roles; assign permission sets |
| FR-M02-06 | Permission override | Grant or deny a specific capability to an individual user |
| FR-M02-07 | Role permission matrix screen | Grid of roles × capabilities with checkboxes |
| FR-M02-08 | User activity view | Last login, session count, recent audit entries |
| FR-M02-09 | Bulk user import | Excel template with validation preview |
| FR-M02-10 | Scope assignment | Assign territory / department scope for scoped roles (e.g., Salesman) |


**Development / Business Rules**

- **BR-06** — At least one active Administrator must exist at all times. The system shall refuse the operation that would remove the last one.
- **BR-07** — A user cannot modify their own role or permission overrides.
- **BR-08** — A user cannot deactivate their own account.
- **BR-09** — Email is unique across all users, active or inactive.
- **BR-10** — Deleting a user is prohibited where audit or document references exist; deactivation is the only permitted removal. `[A-13]`
- **BR-11** — Permission changes take effect on the user's next token refresh (≤ 15 minutes) or immediately if the Admin forces session termination.


**Dependencies**

M01 (authentication), M14 (audit).


**Expected Outputs**

User records, role definitions, effective-permission payload delivered in the JWT claims and `/profile` response.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** the system has exactly one active Admin, **when** that Admin attempts to deactivate themselves or change their own role, **then** the operation is refused with a clear message.
2. **Given** a Costing User, **when** they call the approve endpoint directly, **then** HTTP 403 is returned and an `AUTHZ_DENIED` audit record is written.
3. **Given** an Admin revokes `costsheet.create` from a user, **when** that user's token refreshes, **then** the Create button is absent from the UI **and** the endpoint returns 403.
4. **Given** a bulk import file with a duplicate email in row 14, **when** it is uploaded, **then** no rows are committed and the preview identifies row 14 by number and reason.

`[ASSUMPTION A-13]` Hard deletion of users is disallowed to preserve audit attribution. A "purge" utility for erasure requests is out of scope for Phase 1.

---


### M03 — System Settings & Constants


**Purpose**

Remove every magic number from the codebase and place it under administrator control, so that a change in business convention is a settings edit rather than a software release.


**Development Description**

A typed key–value settings store with defaults, validation, change history, and an effective-dating capability for constants that must not retroactively alter historical documents.


**Functions**

- Grouped settings screen (Calculation, Display, Company, Security, Localisation, Retention).
- Inline validation with the constraint stated next to each field.
- **Change history** per setting: old value, new value, actor, timestamp, reason (mandatory for calculation constants).
- **Restore defaults** per group, with confirmation.
- **Preview impact**: for calculation constants, show a worked example using the acceptance fixture before and after the proposed change.


**Development / Business Rules**

- **BR-12** — Constants marked *non-retroactive* are **snapshotted onto each cost sheet at creation**. Changing the setting affects only cost sheets created afterwards. This is the mechanism that guarantees SC-04.
- **BR-13** — Changing a calculation constant requires a mandatory free-text reason of ≥ 10 characters, recorded in audit.
- **BR-14** — Display-only settings may be changed freely and apply immediately to all views and reports.
- **BR-15** — `internal_precision` may never be reduced below `12`; the engine relies on it for intermediate results.
- **BR-16** — Only users holding `settings.manage` may write settings; all authenticated users may read display settings.


**Dependencies**

M02 (permissions), M10 (engine reads calculation constants), M14 (audit).


**Expected Outputs**

Effective settings object cached client-side; per-sheet snapshot embedded in each cost sheet record; settings change history.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** `card_divisor = 39.37` and an approved cost sheet using it, **when** an Admin changes the setting to `39.50`, **then** the existing sheet's card cost is unchanged on reopen, and a newly created sheet uses `39.50`.
2. **Given** an Admin attempts to save `kg_divisor = 0`, **when** they submit, **then** the save is rejected with "KG Divisor must be greater than zero".
3. **Given** an Admin changes `final_display_rounding` to `NEAREST_RUPEE`, **when** any cost sheet is viewed or printed, **then** the final figure displays as ₹352 while the stored value remains 351.896510033020.
4. **Given** a calculation constant change submitted without a reason, **when** saved, **then** it is rejected.
5. **Given** any settings change, **when** it commits, **then** an audit record with old and new values exists.

---


### M04 — Master Data Management


**Purpose**

Provide one authoritative record for every business entity referenced by costing, design, production and sales, eliminating duplicate and inconsistent data.


**Development Description**

Nine masters share a common CRUD framework: list with server-side pagination, filter and sort; create/edit form; activate/deactivate; Excel import with dry-run preview; Excel export; change history; and duplicate detection on save. Only the field sets and validation differ.


**Functions**

| FR-M04-01 | List view | Server-side pagination (25/50/100), multi-column sort, quick filter, column chooser, saved views |
| FR-M04-02 | Create | Modal or full-page form with inline validation |
| FR-M04-03 | Edit | Same form, pre-populated; concurrency-protected by `row_version` |
| FR-M04-04 | Activate / Deactivate | Soft state; inactive records hidden from selection lists but visible in historical documents |
| FR-M04-05 | Duplicate detection | On save, fuzzy-match (trigram similarity ≥ 0.85) against existing names; show candidates and require explicit confirmation |
| FR-M04-06 | Excel import | Download template → upload → **dry-run preview** listing per-row create/update/error → confirm → commit |
| FR-M04-07 | Excel export | Applies current filters; includes all visible columns |
| FR-M04-08 | Change history | Per-record before/after diff timeline |
| FR-M04-09 | Bulk activate/deactivate | Multi-select with confirmation |
| FR-M04-10 | Reference count | Shows how many documents reference the record before any state change |
| FR-M04-11 | Code auto-generation | Configurable prefix + zero-padded sequence per master |


**Development / Business Rules**

- **BR-17** — Codes are unique per master, case-insensitively, and immutable after first use in a transaction.
- **BR-18** — A master record referenced by any transaction **cannot be hard-deleted**; only deactivated.
- **BR-19** — Deactivating a master record does not alter any existing document; the record remains readable everywhere it is referenced.
- **BR-20** — Import never partially commits. Validation runs over the whole file; commit is all-or-nothing within a transaction.
- **BR-21** — GSTIN, where supplied, must satisfy the 15-character structural format and be unique across active parties.
- **BR-22** — `no_of_feeds`, `dobby_frames` and `jacquard_hooks` are conditionally mandatory per the loom's `shedding_type` and `loom_type`.
- **BR-23** — A Beam Master record with `current_status = On Loom` must carry a `current_loom_id`.


**Dependencies**

M02 (permissions), M03 (settings), M14 (audit), M12 (import/export engine).


**Expected Outputs**

Master records, selection lists consumed by costing/design/production, import validation reports, Excel exports, change history.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** a Yarn Master record referenced by an approved cost sheet, **when** an Admin attempts deletion, **then** deletion is refused and the reference count is displayed.
2. **Given** an import file of 500 rows with one invalid GSTIN at row 237, **when** the dry run completes, **then** the preview flags row 237 and no rows are committed until the user confirms; on confirm with errors present, commit is blocked.
3. **Given** a Loom Master record with `shedding_type = Jacquard` and no `jacquard_hooks`, **when** saved, **then** validation fails with a field-specific message.
4. **Given** an existing party "Aarav Retail Pvt Ltd", **when** a user creates "Aarav Retail Private Limited", **then** the duplicate-detection dialog lists the existing record and requires explicit confirmation to proceed.
5. **Given** a deactivated yarn, **when** a Costing User opens the yarn selector, **then** it does not appear; **when** they open a historical sheet that used it, **then** it displays normally with an "inactive" indicator.

---


### M05 — Material / Yarn Master & Rate History


**Purpose**

Maintain the yarn and material catalogue with controlled rate changes and a complete rate history, and guarantee that historical cost sheets never move when a rate is updated.


**Development Description**

The Yarn Master is the highest-traffic master in the system and the single greatest source of costing error today. It carries the identity, technical characteristics and current rate of each material. Every rate change is versioned. Cost sheets copy denier and rate **by value** at line creation.


**Data / Field Definition**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| material_code | Text(30) | Yes | Unique, auto-generatable |
| material_name | Text(150) | Yes | Display name used in cost sheets |
| yarn_name | Text(150) | No | Commercial/trade name where different |
| yarn_type | Enum | No | Filament / Spun / Textured / Twisted / Fancy / Metallic / Zari |
| composition | Text(100) | No | e.g. "100% Polyester", "60/40 Poly-Cotton" |
| denier | Decimal(12,4) | Yes | Primary count unit used by the costing formulas |
| count_ne | Decimal(12,4) | No | Alternate count; informational |
| count_tex | Decimal(12,4) | No | Alternate count; informational |
| twist_tpm | Decimal(10,2) | No | |
| twist_direction | Enum | No | S / Z |
| shade / colour_id | FK → Colour Master | No | |
| lustre | Enum | No | Bright / Semi-Dull / Dull |
| is_hydrophobic | Boolean | No | Drives Water Jet loom compatibility |
| rate_incl_gst | Decimal(19,6) | Yes | **The rate used in costing**, inclusive of GST as per current workbook convention `[A-14]` |
| rate_excl_gst | Decimal(19,6) | No | Informational; derived if tax known |
| rate_unit | Enum | Yes | Default `PER_KG` |
| supplier_id | FK → Party | No | Preferred supplier |
| supplier_lot | Text(50) | No | |
| min_order_qty | Decimal(12,3) | No | |
| reorder_level | Decimal(12,3) | No | Phase 4 alerts |
| active | Boolean | Yes | Default true |
| last_updated_date | Timestamp | Yes | System-set |
| updated_by | FK → Users | Yes | System-set |
| row_version | Integer | Yes | Optimistic concurrency |


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M05-01 | Add material | Full form with technical and commercial attributes |
| FR-M05-02 | Edit material | Rate changes route through the rate-change flow |
| FR-M05-03 | Rate change | Dedicated action capturing new rate, effective date, reason; writes a rate-history row |
| FR-M05-04 | Bulk rate update | Select materials → apply absolute rate or % change → preview → confirm; single reason applies to all |
| FR-M05-05 | Rate history view | Chronological table: old rate, new rate, delta, %, actor, date, reason |
| FR-M05-06 | Rate history chart | Line chart of rate over time per material |
| FR-M05-07 | Search & filter | By code, name, composition, denier range, supplier, active state |
| FR-M05-08 | Activate / deactivate | Soft state |
| FR-M05-09 | Excel import | Create-or-update by `material_code`; rate changes in an import also write history rows |
| FR-M05-10 | Excel export | Full catalogue with current rates |
| FR-M05-11 | Auto-population contract | Selecting a material in a cost sheet populates denier and rate **by value** |
| FR-M05-12 | Override indicator | Where a cost sheet line's denier or rate differs from the master snapshot, the line is visually flagged |
| FR-M05-13 | Usage report | Which cost sheets, designs and job cards reference this material |
| FR-M05-14 | Stale-rate warning | If a material's rate is older than `stale_rate_days` (default 30), the cost sheet shows a non-blocking warning |


**Development / Business Rules**

- **BR-24** — **Historical immutability.** When a material is selected on a warp or weft line, `denier` and `rate` are **copied into the line**. Subsequent master edits never alter any existing cost sheet line. This is non-negotiable and is verified by `TC-HIST-001`.
- **BR-25** — Every rate change writes a `material_rate_history` row containing old rate, new rate, actor, timestamp and reason. Reason is mandatory, minimum 5 characters.
- **BR-26** — Rate may not be negative. Rate of zero is permitted but raises a warning wherever used.
- **BR-27** — `material_code` is immutable once the material has been used in any cost sheet.
- **BR-28** — A material may be deactivated at any time; deactivation removes it from selection lists only.
- **BR-29** — Only users with `master.yarn.update` may change rates. Costing Users may override at line level (per BR-30) but cannot change the master.
- **BR-30** — A line-level denier or rate override requires the `costsheet.override_rate` capability, is visually flagged, is printed with an asterisk, and is written to audit with the master value and the overridden value.


**Dependencies**

M04 (master framework), M03 (precision settings), M14 (audit), M06–M09 (consumers).


**Expected Outputs**

Material catalogue, rate history records, auto-population payload `{material_id, material_name, denier, rate, rate_unit, snapshot_at}`, rate history report, stale-rate warnings.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** a cost sheet saved with yarn "PV 150/48" at ₹185.00/kg, **when** the master rate is changed to ₹195.00, **then** reopening that cost sheet shows ₹185.00 and the identical final cost, to the last internal decimal.
2. **Given** a rate change from ₹185.00 to ₹195.00, **when** it is saved, **then** a rate history row exists with old = 185.000000, new = 195.000000, actor, timestamp, and the supplied reason.
3. **Given** a rate change submitted without a reason, **when** saved, **then** it is rejected.
4. **Given** a Costing User overriding a line rate from ₹185.00 to ₹180.00, **when** the sheet is printed, **then** the line shows an override marker and the print footer explains it.
5. **Given** a material with `rate` last updated 45 days ago and a threshold of 30, **when** it is selected in a cost sheet, **then** a non-blocking "rate may be stale" warning appears on that line.
6. **Given** an attempt to save a negative rate, **when** submitted, **then** validation fails with "Rate cannot be negative".

`[ASSUMPTION A-14]` The source workbook uses a rate inclusive of GST. This convention is preserved exactly. A separate `rate_excl_gst` field is provided for future tax-aware costing but is not used by the Phase 1 formulas.


---


### M06 — Cost Sheet: Header & Identity


**Purpose**

Establish the identity, ownership, lifecycle state and configuration snapshot of each costing document.


**Development Description**

The header is created first and governs everything below it. Critically, the header also carries the **calculation constants snapshot** taken at creation, which is what makes historical reproduction possible.


**Data / Field Definition**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| design_number | Text(50) | Yes | Business identity |
| version | Integer | Yes | Starts at 1 |
| revision_label | Text(20) | No | Optional human label ("Rev A") |
| costing_date | Date | Yes | Defaults to today |
| customer_id | FK → Party | No `[A-16]` | |
| customer_name_snapshot | Text(200) | Auto | Frozen at approval |
| item_id | FK → Item Master | No | |
| unit_basis | Enum | Yes | Per Metre / Per Piece / Per Cut / Per KG |
| quantity_basis | Decimal(12,4) | No | Quantity the sheet is costed for, default 1 |
| prepared_by | FK → Users | Auto | Creator |
| notes | Text(2000) | No | |
| status | Enum | Yes | Draft / Pending Approval / Approved / Rejected / Archived |
| parent_costsheet_id | UUID | No | Set when duplicated or versioned |
| kg_divisor_snapshot | Decimal | Auto | From settings at creation |
| card_divisor_snapshot | Decimal | Auto | From settings at creation |
| internal_precision_snapshot | Integer | Auto | From settings at creation |
| rounding_mode_snapshot | Enum | Auto | From settings at creation |
| calc_engine_version | Text(20) | Auto | Engine build that produced the stored figures |
| created_by / created_at | — | Auto | |
| modified_by / modified_at | — | Auto | |
| approved_by / approved_at | — | Auto | |
| row_version | Integer | Auto | Optimistic concurrency |


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M06-01 | Create cost sheet | New draft, version 1, constants snapshotted |
| FR-M06-02 | Edit header | Permitted only in Draft or Rejected status |
| FR-M06-03 | Search by design number | Type-ahead across all versions |
| FR-M06-04 | Version list | All versions of a design number with status and final cost |
| FR-M06-05 | Duplicate | Copy latest version of a design number into a new Draft with version + 1 |
| FR-M06-06 | Copy to new design | Copy all content under a different design number, version 1 |
| FR-M06-07 | Status transitions | Governed by M11 |
| FR-M06-08 | Concurrency guard | Second editor receives a conflict warning, not a silent overwrite |
| FR-M06-09 | Auto-save draft | Every 30 seconds and on blur, to server as a draft snapshot `[A-17]` |
| FR-M06-10 | Recover unsaved work | On reopen after a crash, offer to restore the auto-saved draft |


**Development / Business Rules**

- **BR-31** — Identity is `design_number + version`, unique together. Under `design_number_unique_mode = STRICT_UNIQUE`, only version 1 may exist per design number.
- **BR-32** — `design_number` is required and immutable after the first save.
- **BR-33** — Constants are snapshotted at creation and never refreshed, even if the sheet is edited months later.
- **BR-34** — Only the sheet's creator or a user with `costsheet.edit_any` may edit a Draft.
- **BR-35** — A sheet in `Approved` or `Archived` status is read-only for all roles including Admin; Admin may only Archive or create a new version.
- **BR-36** — `costing_date` may not be in the future.
- **BR-37** — Deleting a sheet is permitted only in `Draft` status and only by Admin or the creator; deletion is soft (`deleted_at`) and audited.


**Dependencies**

M03 (constants), M04 (party, item), M11 (lifecycle), M14 (audit).


**Expected Outputs**

Cost sheet header record with immutable constants snapshot; version tree; auto-save snapshots.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** settings `kg_divisor = 9000000`, **when** a cost sheet is created, **then** the header stores `kg_divisor_snapshot = 9000000` and uses it for all subsequent recalculations of that sheet.
2. **Given** an Approved cost sheet, **when** any user attempts to edit any field, **then** the UI presents read-only controls and the API returns 409 with "Approved cost sheet cannot be modified".
3. **Given** design number `DN-1042` version 1 exists, **when** a user duplicates it, **then** version 2 is created in Draft with `parent_costsheet_id` pointing at version 1 and all lines copied including frozen rates.
4. **Given** two users open the same Draft, **when** the second saves after the first, **then** the second receives a conflict notice showing which fields changed and is offered reload or overwrite (overwrite requires `costsheet.edit_any`).
5. **Given** an in-progress sheet and a browser crash, **when** the user reopens the sheet, **then** the auto-saved content is offered for restoration.

`[ASSUMPTION A-16]` Customer is optional because costings are frequently prepared speculatively before a buyer is identified. If the business requires a customer on every sheet, set `costsheet_customer_required = true`.

`[ASSUMPTION A-17]` The source PDD specifies 60-second localStorage auto-save for design entry. For costing, a 30-second **server-side** draft snapshot is specified instead, because losing a costing is more damaging and localStorage does not survive a device change.

---


### M07 — Cost Sheet: Warp Section


**Purpose**

Capture warp yarn consumption and cost with exact reproduction of the workbook's warp arithmetic.


**Development Description**

An expandable, spreadsheet-style grid, minimum 3 rows (configurable), where each row represents one warp yarn component.


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M07-01 | Minimum rows | Renders `warp_min_rows` (default 3) empty rows on new sheet |
| FR-M07-02 | Add / delete row | Unlimited addition; delete with confirmation if the row has data |
| FR-M07-03 | Reorder rows | Drag handle or keyboard `Alt+↑/↓`; `sequence` renumbers |
| FR-M07-04 | Duplicate row | Copies all values including frozen rate |
| FR-M07-05 | Copy / paste from Excel | Paste a tab-delimited block into the grid; column mapping preview |
| FR-M07-06 | Material type-ahead | Search by code, name or composition; keyboard-selectable |
| FR-M07-07 | Auto-population | On material select, fill `yarn_name`, `denier`, `rate_per_kg` from master snapshot |
| FR-M07-08 | Real-time calculation | KG and Cost recompute on every keystroke, debounced 150 ms |
| FR-M07-09 | Sticky totals row | Warp Total Cost, Total Ends, Total KG pinned at the section foot |
| FR-M07-10 | Keyboard navigation | `Tab`/`Shift+Tab` between cells, `Enter` to next row same column, `Ctrl+D` fill-down |
| FR-M07-11 | Override flagging | Denier or rate differing from master snapshot shows an amber marker and tooltip with the master value |
| FR-M07-12 | Blank-row tolerance | Rows with no material and no numeric entries are ignored in totals and not persisted |


**Development / Business Rules**

- **BR-38** — A row is *material* (participates in calculation) if it has a material **or** any non-zero numeric value. Otherwise it is blank and treated as zero.
- **BR-39** — Missing rate, zero rate or missing denier produces a **warning**, never a hard block — the workbook permits incomplete rows.
- **BR-40** — Negative values in `ends`, `denier`, `length` or `rate` are **rejected**.
- **BR-41** — `kg_divisor_snapshot` from the header, not the live setting, is used for every recalculation.
- **BR-42** — Deleting the last remaining material row is permitted; the section may legitimately be empty (weft-only costing).


**Dependencies**

M05 (material), M10 (engine), M03 (constants), M06 (header).


**Expected Outputs**

Warp lines with computed KG and Cost; warp totals feeding the material summary.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** Ends = 8000, Denier = 100, Length = 3675, `kg_divisor` = 9,000,000, **when** computed, **then** Warp KG = 3.266666666667 (at 12 dp internal) and displays as 3.2667.
2. **Given** the acceptance fixture warp lines, **when** computed, **then** individual warp costs are 32.66 and 10.06 and Warp Total Cost = 42.72 exactly.
3. **Given** a user selects a material, **when** selection completes, **then** denier and rate populate from the master and the line records the snapshot timestamp.
4. **Given** a user then edits the populated rate, **when** they leave the cell, **then** `is_rate_overridden = true`, an amber marker appears, and the tooltip states the master value.
5. **Given** a negative value typed into Ends, **when** the cell loses focus, **then** the value is rejected with "Ends cannot be negative" and the previous value is restored.
6. **Given** three empty rows and one populated row, **when** the sheet is saved, **then** only the populated row is persisted and totals reflect only that row.

`[ASSUMPTION A-18]` The SRS lists "Optional Width/Panna" among warp fields but the warp formula omits it. It is therefore treated as informational. **This must be confirmed at sign-off** — if panna does belong in the warp calculation, the formula changes and the acceptance fixture must be re-derived.

---


### M08 — Cost Sheet: Weft Section


**Purpose**

Capture weft yarn consumption and cost with exact reproduction of the workbook's weft arithmetic.


**Development Description**

Structurally identical to the warp grid, minimum 6 rows (configurable), with `picks_per_inch` replacing `ends` and `panna_inch` mandatory in the calculation.


**Functions**

Identical feature set to M07 (FR-M08-01 … FR-M08-12), with:

| ID | Feature | Description |
|---|---|---|
| FR-M08-13 | Default panna propagation | Entering panna on the first weft line offers to apply it to all weft lines |
| FR-M08-14 | Default length propagation | Same behaviour for fabric length across warp and weft |
| FR-M08-15 | Picks total badge | Total picks displayed prominently; used later by the Job Card Voucher |


**Development / Business Rules**

- **BR-43** — All rules BR-38 to BR-42 apply identically to weft.
- **BR-44** — `panna_inch` is mandatory for a material weft row; a zero panna produces a KG of zero and raises a warning.
- **BR-45** — Weft Total Picks is carried forward to the Job Card Voucher (`total_pick`) in Phase 3.


**Dependencies**

M05, M10, M03, M06.


**Expected Outputs**

Weft lines with computed KG and Cost; weft totals; total picks.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** the acceptance fixture weft lines, **when** computed, **then** individual weft costs are 69.21, 18.92 and 17.86 and Weft Total Cost = 105.99 exactly.
2. **Given** Picks = 0 on a row with a material selected, **when** computed, **then** Weft KG = 0, Cost = 0.00, and a warning "Picks is zero — line contributes no cost" is shown.
3. **Given** the user enters panna 44 on line 1 and confirms propagation, **when** applied, **then** all material weft lines carry panna 44 and all costs recompute.
4. **Given** weft lines with picks 96, 24 and 18, **when** totals compute, **then** Weft Total Picks = 138.

---


### M09 — Cost Sheet: Summary, Wastage, Process Charges, Card Cost & Pricing


**Purpose**

Aggregate warp and weft into the final cost using the workbook's exact sequence of operations, and optionally derive a sale rate.


**Functions**

| ID | Feature |
|---|---|
| FR-M09-01 | Summary cards: Base Material Cost, Wastage, Process Cost, Card Cost, Final Cost, Sale Rate |
| FR-M09-02 | Live recalculation of the entire chain on any input change |
| FR-M09-03 | Wastage percentage entry with warning threshold |
| FR-M09-04 | Process charge grid: add, delete, reorder, select from Process Master |
| FR-M09-05 | Card cost entry with configurable divisor shown as a tooltip |
| FR-M09-06 | Pricing block, collapsed by default, expandable |
| FR-M09-07 | Cost composition chart (stacked bar: material / wastage / process / card) |
| FR-M09-08 | "Show full precision" toggle exposing internal values to full dp for verification |
| FR-M09-09 | Rounding preview: shows the final figure under both `2_DECIMALS` and `NEAREST_RUPEE` |


**Dependencies**

M07, M08, M10, M03.


**Expected Outputs**

Final cost, sale rate, margin figures, cost composition data for charts and reports.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** the acceptance fixture, **when** fully computed, **then** Base Material = 148.71, Wastage (10%) = 14.87, Material With Wastage = 163.58, Butta = 13.30, RFD = 0, Card Cost = 175.01651003302, and **Final Cost = 351.89651003302**.
2. **Given** `final_display_rounding = 2_DECIMALS`, **when** displayed, **then** ₹351.90; **given** `NEAREST_RUPEE`, **then** ₹352.
3. **Given** no markup, no profit amount and no manual override, **when** the sheet is saved, **then** Sale Rate equals Final Cost to full internal precision.
4. **Given** markup of 15%, **when** entered, **then** Suggested Sale Rate = 404.681, Gross Profit = 52.784, Gross Margin = 13.0435%, and **Final Cost remains 351.89651003302 unchanged**.
5. **Given** a manual sale rate below the final cost and `sale_below_cost_action = WARN`, **when** saving, **then** a warning is shown and save proceeds after acknowledgement.
6. **Given** Sale Rate = 0, **when** margin computes, **then** the field shows "—" and no error is raised.

`[ASSUMPTION A-19]` The 25% wastage warning threshold is inferred, not specified. It is configurable.

`[ASSUMPTION A-20]` Negative markup (discount below cost) is permitted down to −100% to support clearance pricing, subject to BR-55.

---


### M10 — Exact Decimal Calculation Engine


**Purpose**

Provide one authoritative, side-effect-free implementation of every formula, shared by the frontend (for live display) and the backend (for authoritative persistence), so the two can never disagree.


**Development Description**

A pure TypeScript package (`@weaveone/calc`) with no I/O and no framework dependency, consumed by both tiers. It receives a fully-specified input object — including the constants snapshot — and returns a fully-computed result object. It never reads global settings itself.


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M10-01 | Pure function | `computeCostSheet(input) => result`; deterministic, no I/O, no clock, no randomness |
| FR-M10-02 | Decimal-only arithmetic | Every operation via `decimal.js`; the engine contains no float arithmetic on monetary values |
| FR-M10-03 | Explicit rounding points | Rounding applied **only** at the three points the workbook rounds: warp line cost, weft line cost, wastage cost |
| FR-M10-04 | Shared configuration | A single `decimal.js` config module sets precision and rounding identically on both tiers |
| FR-M10-05 | Warning collection | Zero rate, missing denier, zero panna, high wastage, sale below cost — returned as structured warnings, never thrown |
| FR-M10-06 | Server authority | The backend recomputes on every save and persists **its** result; a client-supplied computed value is ignored |
| FR-M10-07 | Divergence detection | If client and server results differ, the server logs a `CALC_DIVERGENCE` error with both payloads and the server value wins |
| FR-M10-08 | Golden-file tests | The acceptance fixture and 30 regression workbooks are committed as golden files |
| FR-M10-09 | Property-based tests | Randomised inputs assert invariants (monotonicity, non-negativity, associativity of sums) |
| FR-M10-10 | Versioned engine | `calc_engine_version` stored on each cost sheet; enables detecting sheets computed by an older engine |


**Development / Business Rules**

- **BR-57** — JavaScript `Number` arithmetic on any monetary or quantity value is **prohibited**. Enforced by an ESLint rule and code review.
- **BR-58** — All monetary values cross the API as strings. JSON parsing shall never produce a float for a money field.
- **BR-59** — Database storage is `NUMERIC(19,6)` for money and KG. No `FLOAT`, `REAL` or `DOUBLE PRECISION` anywhere in the schema.
- **BR-60** — The engine reads constants only from its input. It shall not import the settings module.
- **BR-61** — Any change to the engine requires the full golden-file suite to pass unmodified. Modifying a golden file requires documented business sign-off.


**Dependencies**

None (deliberately). Consumed by M07, M08, M09, M12, M13.


**Expected Outputs**

`CostSheetResult` object; structured warnings; divergence logs.


**Priority**

**P0** — this is the highest-risk component in the programme.


**Acceptance Criteria**

1. **Given** the acceptance fixture input, **when** `computeCostSheet` runs, **then** the final cost string is exactly `351.89651003302`.
2. **Given** identical input, **when** run 1,000 times, **then** the output is bit-identical every time.
3. **Given** the same input executed in Node and in the browser, **when** results are compared, **then** they are identical to the last digit.
4. **Given** the 30-workbook regression corpus, **when** the suite runs, **then** all 30 match their golden files exactly.
5. **Given** a client sends a tampered final cost, **when** the sheet is saved, **then** the server-computed value is persisted and the discrepancy is logged.
6. **Given** static analysis of the engine package, **when** the lint rule runs, **then** zero float arithmetic on monetary values is detected.

---


### M11 — Versioning, Lifecycle & Approval Workflow


**Purpose**

Make every costing decision attributable, reversible in the sense of being superseded rather than overwritten, and permanently reconstructible.


**Development Description**

A cost sheet moves through a constrained state machine. Approval locks the document. Change requires a new version, never an edit.


**Functions**

| ID | Feature | Description |
|---|---|---|
| FR-M11-01 | Submit for approval | Runs the full validation set; blocks on errors, lists warnings for acknowledgement |
| FR-M11-02 | Approval queue | Filterable list of Pending sheets with age, preparer, customer, final cost |
| FR-M11-03 | Approve | Records approver, timestamp, optional remarks; locks the sheet |
| FR-M11-04 | Reject | Mandatory remarks ≥ 10 characters; returns to Rejected; notifies preparer |
| FR-M11-05 | Recall | Submitter withdraws a pending sheet |
| FR-M11-06 | Save as new version | Copies header, lines and charges; version + 1; status Draft; links parent |
| FR-M11-07 | Version comparison | Side-by-side diff of any two versions with changed cells highlighted and a delta column |
| FR-M11-08 | Version tree | Visual lineage from version 1 to current, including branches created by "copy to new design" |
| FR-M11-09 | Archive | Removes from active lists; remains fully readable and printable |
| FR-M11-10 | Lock indicator | A persistent banner on approved sheets stating who approved and when |
| FR-M11-11 | Approval delegation | An approver may delegate to a named alternate for a date range `[A-22]` |
| FR-M11-12 | Escalation | Pending beyond `approval_sla_hours` (default 24) notifies the approver's manager |


**Development / Business Rules**

- **BR-62** — An Approved cost sheet is immutable. No role, including Administrator, may edit its content. The only permitted actions are Archive, Print/Export, and Create New Version.
- **BR-63** — Approval requires the approver to be a different user from the preparer, unless `allow_self_approval = true`.
- **BR-64** — Rejection remarks are mandatory and minimum 10 characters.
- **BR-65** — Only one version of a design number may be Approved and *current* at a time; approving version N automatically archives version N−1 if it was Approved. `[A-23]`
- **BR-66** — Version numbers are strictly increasing and never reused, even after a version is deleted.
- **BR-67** — Every state transition writes an audit record with from-state, to-state, actor, timestamp and remarks.
- **BR-68** — A sheet may not be submitted with zero material lines in both warp and weft.


**Dependencies**

M06, M02, M14, M38 (notifications).


**Expected Outputs**

Status transitions, approval records, version lineage, diff data, notifications.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** an Approved sheet, **when** an Admin issues an update request, **then** HTTP 409 is returned with code `COSTSHEET_LOCKED` and nothing changes.
2. **Given** a preparer attempts to approve their own sheet with `allow_self_approval = false`, **when** they submit approval, **then** HTTP 403 with code `SELF_APPROVAL_FORBIDDEN`.
3. **Given** a rejection with 4 characters of remarks, **when** submitted, **then** validation fails with "Rejection remarks must be at least 10 characters".
4. **Given** version 2 is approved while version 1 was Approved, **when** approval commits, **then** version 1 status becomes Archived and both transitions appear in audit.
5. **Given** versions 1 and 3 of a design, **when** compared, **then** every differing field is highlighted with old value, new value and numeric delta where applicable.
6. **Given** a sheet pending for 25 hours with an SLA of 24, **when** the escalation job runs, **then** a notification is sent to the approver's manager and recorded.

`[ASSUMPTION A-21]` Self-approval is disallowed by default as a segregation-of-duties control. Small teams may need it enabled; it is therefore a setting, and enabling it is itself an audited event.

`[ASSUMPTION A-22]` Delegation is assumed necessary because a single approver on leave would otherwise halt costing.

`[ASSUMPTION A-23]` Auto-archiving the superseded version is inferred from the requirement that "only latest revision is active". Confirm at sign-off.

---


### M12 — Print, PDF Export, Excel Export & Import


**Purpose**

Produce documents that are trusted, professional and identical in every channel, and move data in and out via Excel without loss of precision.


**Development Description**

A single React print component per document type is the layout source of truth. Browser print, server-side PDF (headless Chrome) and emailed attachments all render it. Excel export is produced by ExcelJS with typed cells; Excel import runs a strict, previewable pipeline.


**Functions**

| FR-M12-01 | Print preview | Renders the exact print component in a modal before printing |
| FR-M12-02 | Browser print | Native print against `@media print` styles |
| FR-M12-03 | Server PDF | Headless Chrome renders the same component; returns a downloadable PDF |
| FR-M12-04 | PDF filename convention | `CostSheet_{design}_{v}_{yyyymmdd}.pdf` |
| FR-M12-05 | Excel export — single sheet | Structured workbook mirroring the print layout, with computed values and full precision in hidden columns |
| FR-M12-06 | Excel export — register | Multi-row export of the cost sheet register with applied filters |
| FR-M12-07 | Excel export — masters | Any master list, filtered |
| FR-M12-08 | Excel import — masters | Template download → upload → dry-run preview → confirm |
| FR-M12-09 | Import validation report | Downloadable Excel of rejected rows with reasons |
| FR-M12-10 | Watermarking | Draft and Rejected sheets print with a diagonal "DRAFT" / "REJECTED" watermark |
| FR-M12-11 | Bulk PDF | Queue-based generation of many sheets into a ZIP |
| FR-M12-12 | Email attachment | Send the generated PDF to a recipient with a templated message |


**Development / Business Rules**

- **BR-69** — A Draft or Rejected sheet **must** print with a watermark. A watermark-free print is possible only for Approved and Archived sheets.
- **BR-70** — Exports reflect exactly what is stored; the export layer performs no arithmetic of its own.
- **BR-71** — Excel exports carry full internal precision in hidden columns alongside the display-rounded visible columns, so that a recipient can verify.
- **BR-72** — Import is transactional and previewed; partial commits are prohibited.
- **BR-73** — Import files are retained for `import_retention_days` (default 90) for audit.
- **BR-74** — Legacy report engines (RDLC, Crystal, Jasper, FastReport) are not supported; they are desktop-oriented and incompatible with a cloud-native web application.


**Dependencies**

M09 (data), M04/M05 (masters), M03 (company branding and precision).


**Expected Outputs**

Printable HTML, PDF binaries, XLSX workbooks, import preview and rejection reports.


**Priority**

**P1** (print/PDF are effectively P0 for user acceptance; Excel import is P1)


**Acceptance Criteria**

1. **Given** an Approved sheet, **when** printed from the browser and exported as PDF, **then** both outputs are visually identical and contain identical figures.
2. **Given** a Draft sheet, **when** printed, **then** a "DRAFT" watermark is present on every page.
3. **Given** a cost sheet with 14 warp and 22 weft lines, **when** printed, **then** table headers repeat on page 2 and no row is split across a page boundary.
4. **Given** an Excel export, **when** the hidden precision column is inspected, **then** the card cost reads 175.016510033020 while the visible column reads 175.02.
5. **Given** an import file with 3 invalid rows out of 200, **when** previewed, **then** the 3 rows are listed with row numbers and reasons and the Confirm button is disabled until they are excluded or corrected.

`[ASSUMPTION A-24]` A short document hash printed in the footer allows a printed sheet to be verified against the system record. Low cost, high dispute-resolution value.


---


### M13 — Reporting Engine


**Purpose**

Answer recurring business questions without exporting to Excel first.


**Development Description**

A shared report framework: parameter panel → server-side query with pagination → on-screen grid → export to Excel/PDF → optional schedule. Section 13 specifies each report in full; this module specifies the framework.


**Functions**

| ID | Feature |
|---|---|
| FR-M13-01 | Parameter panel with date ranges, multi-select filters, and saved parameter sets |
| FR-M13-02 | Server-side pagination, sorting and grouping |
| FR-M13-03 | Column chooser and column ordering, persisted per user per report |
| FR-M13-04 | Subtotals and grand totals with correct decimal aggregation |
| FR-M13-05 | Drill-down from any aggregate row to the underlying documents |
| FR-M13-06 | Export to Excel and PDF preserving grouping |
| FR-M13-07 | Print-optimised layout (landscape where column count demands) |
| FR-M13-08 | Scheduled delivery by email (daily/weekly/monthly) `[A-25]` |
| FR-M13-09 | Report access controlled per role |
| FR-M13-10 | Row-level scoping (a Salesman sees only their parties) |


**Development / Business Rules**

- **BR-75** — Reports are read-only; no report may mutate data.
- **BR-76** — Aggregations use exact decimal arithmetic; summing display-rounded values is prohibited — aggregate the stored precision, then round for display.
- **BR-77** — Every report respects the caller's row-level scope. A scoped user's export contains only their scoped rows.
- **BR-78** — Reports over 5,000 rows are generated asynchronously and delivered as a download notification.


**Dependencies**

M09, M05, M11, M14.


**Expected Outputs**

On-screen grids, XLSX, PDF, scheduled emails.


**Priority**

**P1**


**Acceptance Criteria**

1. **Given** a Cost Sheet Register filtered to one customer and a date range, **when** run, **then** only matching sheets appear and the grand total equals the exact decimal sum of the underlying final costs.
2. **Given** a Salesman runs the register, **when** results return, **then** only their assigned parties' sheets are included, in both the grid and the export.
3. **Given** a report returning 12,000 rows, **when** requested, **then** it is queued, the user is notified on completion, and the file downloads correctly.
4. **Given** three sheets with final costs 351.896510, 100.004000 and 99.999999, **when** totalled, **then** the total is 551.900509 and displays as 551.90 — not 551.91.

`[ASSUMPTION A-25]` Scheduled email delivery depends on SMTP availability (A-12).

---


### M14 — Audit History


**Purpose**

Make every change attributable and every past state reconstructible.


**Development Description**

An append-only audit log capturing actor, action, module, entity, timestamp, before/after values, IP address and user agent, written inside the same database transaction as the change it records.


**Functions**

| ID | Feature |
|---|---|
| FR-M14-01 | Immutable append-only store; no update or delete endpoint exists |
| FR-M14-02 | Filter by user, module, entity, action, date range, IP |
| FR-M14-03 | Entity timeline: full history of one record in chronological order |
| FR-M14-04 | Before/after field-level diff viewer |
| FR-M14-05 | Export audit extract to Excel/CSV for external auditors |
| FR-M14-06 | Retention per `audit_retention_years`, with archival to cold storage rather than deletion |
| FR-M14-07 | Tamper-evidence: each record carries a hash chained to its predecessor `[A-27]` |
| FR-M14-08 | Correlation ID linking all audit rows produced by one user action |


**Development / Business Rules**

- **BR-79** — Audit writes participate in the same transaction as the business change. If the audit write fails, the business change is rolled back.
- **BR-80** — No user, including Administrator, may edit or delete an audit record through the application.
- **BR-81** — Secret values (passwords, tokens) are never written to audit, not even hashed.
- **BR-82** — Audit records survive the deletion (soft or otherwise) of the entity they describe.


**Dependencies**

Every mutating module.


**Expected Outputs**

Audit records, entity timelines, auditor extracts.


**Priority**

**P0**


**Acceptance Criteria**

1. **Given** a material rate change, **when** it commits, **then** exactly one audit record exists with old value, new value, actor, timestamp, IP and reason.
2. **Given** a simulated audit-write failure, **when** a cost sheet save is attempted, **then** the save is rolled back and the user sees an error.
3. **Given** an approved cost sheet, **when** its entity timeline is opened, **then** every event from creation to approval is listed in order with actors.
4. **Given** any API surface, **when** searched for an audit update or delete route, **then** none exists.
5. **Given** a single save action affecting header, 5 warp lines and 3 charges, **when** audited, **then** all resulting records share one correlation ID.

`[ASSUMPTION A-26]` Print and export events are audited because a printed cost sheet leaves the system's control and disputes commonly turn on which version was printed.

`[ASSUMPTION A-27]` Hash chaining is included for tamper evidence at negligible cost. If the company's audit posture does not require it, it can be omitted.

---


### M15 — Dashboard & KPIs


**Purpose**

Give each role an immediate answer to "what needs my attention".


**Development Description**

Role-aware dashboard composed of KPI cards, charts, and action queues. Full widget catalogue in Section 12.


**Functions**

Role-based layout; date-range selector; KPI summary cards; charts (Recharts); pending-action queues; recent items; quick-action grid; drill-down from every widget; export of any widget's underlying data; auto-refresh at a configurable interval; mobile-optimised layout for Management.


**Development / Business Rules**

- **BR-83** — Every widget respects the viewer's permissions and row-level scope. A widget for which the user lacks permission is not rendered at all (not rendered-and-disabled).
- **BR-84** — Dashboard queries are read-only and served from indexed aggregate views; they must not degrade transactional performance.
- **BR-85** — Every KPI is drillable to its source records.


**Dependencies**

M13, M02.


**Expected Outputs**

KPI values, chart series, action queues.


**Priority**

**P2** for Phase 1 (a minimal dashboard ships; the full widget set follows).


**Acceptance Criteria**

1. **Given** a Costing User, **when** the dashboard loads, **then** it shows their drafts, their rejected sheets and their monthly throughput — and no approval queue.
2. **Given** an Approver, **when** the dashboard loads, **then** the pending-approval queue is the primary widget with an ageing indicator.
3. **Given** any KPI card, **when** clicked, **then** the user is taken to a filtered list of the exact records behind the number.
4. **Given** a dashboard load at 100,000 cost sheets, **when** measured, **then** it completes in under 2 seconds.

---


### M16 — Global & Advanced Search


**Purpose**

Locate any record in the system in seconds, from anywhere.


**Development Description**

A persistent search bar performing debounced (300 ms) federated search across cost sheets, designs, materials, parties, looms and job cards, plus per-module advanced search with saved filters.


**Functions**

| ID | Feature |
|---|---|
| FR-M16-01 | Global search with grouped, ranked results by entity type |
| FR-M16-02 | Keyboard shortcut `Ctrl/Cmd + K` to focus |
| FR-M16-03 | Type-ahead suggestions with recent and frequent items |
| FR-M16-04 | Advanced search per module: field-level operators (equals, contains, between, in, is null) |
| FR-M16-05 | Saved filters, private or shared |
| FR-M16-06 | Quick filter chips (My Drafts, Pending Approval, This Month, Approved) |
| FR-M16-07 | Full-text search over notes, remarks and descriptions |
| FR-M16-08 | Cross-reference search (Phase 2): find all designs using a given feeder colour or old number |
| FR-M16-09 | Fuzzy matching for names with tolerance for spelling variants |
| FR-M16-10 | Search result export |


**Development / Business Rules**

- **BR-86** — Results are filtered by permission and scope **before** returning; a user must never see the existence of a record they cannot access, including in result counts.
- **BR-87** — Search must return within 2 seconds at target data volumes (SC-05).
- **BR-88** — Search is read-only.


**Dependencies**

PostgreSQL full-text search with GIN indexes and `pg_trgm` for fuzzy matching.


**Expected Outputs**

Ranked, grouped, permission-filtered results.


**Priority**

**P1**


**Acceptance Criteria**

1. **Given** 100,000 designs, **when** a design number is searched, **then** results return in under 2 seconds.
2. **Given** a user without design access, **when** they search a design number, **then** zero design results are shown and no count is leaked.
3. **Given** a search for "DN 1042" against stored "DN-1042", **when** executed, **then** the record is found (separator-tolerant matching).
4. **Given** a saved filter "My pending high-value sheets", **when** reopened next week, **then** it applies the same criteria against current data.

---


### M17 — Backup, Restore & Data Retention


**Purpose**

Guarantee that no data loss event is unrecoverable.


**Functions**

| ID | Feature |
|---|---|
| FR-M17-01 | Automated nightly full database backup |
| FR-M17-02 | Continuous WAL archiving for point-in-time recovery (RPO ≤ 15 min) |
| FR-M17-03 | Object-storage backup of uploaded files (images, imports, generated PDFs) |
| FR-M17-04 | On-demand backup with a user-supplied label |
| FR-M17-05 | Retention of the last `backup_retention_count` (default 10) full backups plus monthly archives |
| FR-M17-06 | Encrypted backups at rest; off-site replication |
| FR-M17-07 | Restore to a staging environment; production restore requires two-person authorisation |
| FR-M17-08 | Automated weekly restore verification with a report |
| FR-M17-09 | Export of the full dataset as JSON + files, as a vendor-independence guarantee |
| FR-M17-10 | Retention policy enforcement with archival, never silent deletion |


**Development / Business Rules**

- **BR-89** — A backup that has not been test-restored is not counted as a backup. Weekly verification is mandatory.
- **BR-90** — Production restore requires authorisation from two users holding `system.restore`, and is audited.
- **BR-91** — Backups are encrypted; keys are stored separately from backup media.


**Dependencies**

Infrastructure (PostgreSQL, object storage).


**Expected Outputs**

Backup artefacts, checksums, verification reports, restore audit records.


**Priority**

**P1**


**Acceptance Criteria**

1. **Given** the nightly job, **when** it completes, **then** a backup artefact exists, its checksum is recorded, and success is reported.
2. **Given** a quarterly drill, **when** a restore is performed to staging from a 7-day-old backup, **then** the acceptance fixture cost sheet reproduces 351.89651003302 exactly.
3. **Given** a single-user restore request, **when** submitted without a second authoriser, **then** it remains pending and does not execute.

---


### M18 — Design Repository & Technical Specification *(Phase 2)*


**Purpose**

Convert the physical swatch-card archive into a searchable structured repository, preserving the master weaver's technical knowledge.


**Data / Field Definition**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | |
| design_number | Text(50) | Yes | Unique |
| design_name | Text(200) | No | Commercial name, e.g. "Royal Banarasi Silk" |
| dn | Text(50) | No | Internal drawing number |
| dn_code | Text(50) | No | Design code alias |
| reed | Text(30) | No | Reed count — text to preserve entries like "72/2" |
| pick | Text(30) | No | Pick count |
| cards | Text(30) | No | Jacquard card count |
| patti | Text(30) | No | Patti count |
| total_dc | Text(30) | No | Total Direct Count / Ends |
| total_cut | Text(30) | No | Total cut specification |
| work | FK → Work Type | No | Jacquard / Dobby / Ikat / Plain / Satin / Twill |
| blue_apt | Text(50) | No | Blue + APT specification |
| item_id | FK → Item Master | No | |
| description | Text | No | |
| remarks | Text | No | Manufacturing / quality notes |
| primary_image_id | FK → Files | No | |
| costsheet_id | FK → Cost Sheet | No | Link to approved costing |
| shareable | Boolean | Yes | Governs external sharing (BR-105) |
| active | Boolean | Yes | |
| created_date / updated_date | Timestamp | Auto | |

> **Design decision — text types for technical counts.** Reed, pick, cards, patti, total D.C. and total cut are stored as text because legacy entries are not consistently numeric ("72/2", "96 + 4"). A parallel nullable numeric column (`reed_numeric`, etc.) is populated where parsing succeeds, enabling range filtering without data loss. `[A-28]`


**Functions**

Create/edit/deactivate design; dual view (gallery grid with colour swatches, tabular list); auto-save draft to local storage every 60 seconds; duplicate-design-number prevention on client and server; multi-criteria search (design number, DN, DN code, work type, reed, pick, feeder colour, old number); link to cost sheet; design comparison side-by-side; bulk Excel import/export; recently-viewed list; work-type distribution analytics.


**Development / Business Rules**

- **BR-92** — `design_number` is unique across the design repository, case-insensitively.
- **BR-93** — A design may not be hard-deleted once referenced by a cost sheet, job card or order; deactivate instead.
- **BR-94** — Auto-saved drafts are per-user and per-design and cleared on successful save.


**Dependencies**

M04, M20 (images), M19 (feeders).


**Expected Outputs**

Design records, gallery data, search index entries.


**Priority**

**P0 within Phase 2**


**Acceptance Criteria**

1. **Given** an existing design `D-001`, **when** a user attempts to create another `D-001`, **then** it is rejected on both client and server with a clear message.
2. **Given** an in-progress design entry and a browser crash, **when** the form reopens, **then** the auto-saved values are offered for restoration.
3. **Given** a search for reed "72", **when** executed, **then** designs with reed "72" and "72/2" are both returned, ranked by exactness.

`[ASSUMPTION A-28]` Legacy technical values are assumed to be inconsistently formatted. If the archive proves uniformly numeric, the numeric columns become primary.

---


### M19 — Feeder Colourway Management *(Phase 2)*


**Purpose**

Capture the ordered feeder colour arrangement for each design — currently the company's most fragile piece of institutional knowledge.


**Data / Field Definition**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | |
| design_id | UUID FK → designs | Yes | `ON DELETE CASCADE` |
| feeder_number | Integer | Yes | Sequential position 1..N |
| colour_id | FK → Beam Colour Master | No | Preferred, gives swatch and hex |
| colour_name | Text(100) | No | Free text where the colour is not in master |
| old_number | Text(50) | No | Legacy yarn/shade code (e.g. 5831) — **indexed** |
| yarn_id | FK → Yarn Master | No | Links the physical yarn |
| remarks | Text(200) | No | |


**Functions**

Add, delete, and reorder feeders (`↑`/`↓` buttons and drag); automatic renumbering on reorder; visual colour swatch from hex; colour picker fallback; bulk paste of a feeder list; copy the feeder set from another design; cross-reference search ("which designs use old number 5831?"); feeder count badge on the design card; print feeder table on the design card and job card.


**Development / Business Rules**

- **BR-95** — `feeder_number` is unique within a design and always contiguous from 1; reordering renumbers automatically.
- **BR-96** — Deleting a design cascades to its feeders. Deleting a feeder renumbers the remainder.
- **BR-97** — A feeder must carry either a `colour_id` or a `colour_name`; both empty is invalid.
- **BR-98** — Feeder count per design is capped at 32 `[A-29]`; the Job Card Voucher prints FDR-1 to FDR-10 and paginates beyond that.


**Dependencies**

M18, M04 (Beam Colour Master).


**Expected Outputs**

Ordered feeder sets; cross-reference index; job card program data.


**Priority**

**P0 within Phase 2**


**Acceptance Criteria**

1. **Given** feeders 1–5 and the user moves feeder 4 above feeder 2, **when** committed, **then** numbering is 1,2,3,4,5 with the moved feeder at position 2 and all others shifted.
2. **Given** feeder 3 of 5 is deleted, **when** committed, **then** remaining feeders renumber to 1–4 with no gap.
3. **Given** a search for old number "5831", **when** executed, **then** every design containing a feeder with that old number is listed with the feeder position shown.
4. **Given** a feeder with a `colour_id` whose hex is `#1B3A6B`, **when** displayed, **then** a colour swatch of that exact hex renders beside the name.

`[ASSUMPTION A-29]` A 32-feeder cap is inferred from typical multi-feed loom capability (16+ colours on rapier). Confirm the company's maximum.

---


### M20 — Fabric Image Gallery & File Management *(Phase 2)*


**Purpose**

Attach visual truth to every design record.


**Functions**

Upload (drag-drop, multi-file, camera capture on tablet); formats JPG, PNG, WEBP `[A-30]`; maximum 20 MB per file; automatic generation of thumbnail (200 px), medium (800 px) and original derivatives; primary-image designation; caption and tag per image; lightbox with zoom and metadata overlay; gallery filtered by design attributes; bulk download as ZIP; image replacement with version retention; EXIF stripping on upload for privacy and size.


**Development / Business Rules**

- **BR-99** — Files are stored in object storage, never in the database; the database holds metadata and keys only.
- **BR-100** — Every uploaded file is virus-scanned before it becomes retrievable.
- **BR-101** — Deleting an image is soft; the object is retained for `file_retention_days` (default 90) before hard deletion.
- **BR-102** — Image URLs are signed and time-limited; direct unauthenticated object access is prohibited.


**Dependencies**

Object storage, virus scanner, image processing library.


**Expected Outputs**

Stored derivatives, signed URLs, gallery payloads.


**Priority**

**P1 within Phase 2**


**Acceptance Criteria**

1. **Given** a 25 MB image, **when** uploaded, **then** it is rejected with a size message before any bytes are stored.
2. **Given** a valid upload, **when** processing completes, **then** thumbnail, medium and original derivatives exist and the gallery displays the thumbnail.
3. **Given** an unauthenticated request for a stored image URL, **when** made after the signature expires, **then** access is denied.

`[ASSUMPTION A-30]` HEIC (common on iPhone) is not in the source list. Server-side conversion to JPEG on upload is recommended and assumed.

---


### M21 — Buyer Communication (WhatsApp / Email Share) *(Phase 2)*


**Purpose**

Let sales and design share an accurate, professional design card with a buyer in one action.


**Functions**

Compose a structured message containing design number, name, technical specification and feeder arrangement; attach the primary image; one-click share via WhatsApp (deep link in Phase 2, WhatsApp Business API in Phase 5 `[A-31]`); email share with PDF design card attached; configurable message template with merge fields; share history per design (who shared, with whom, when); a share preview before sending.


**Development / Business Rules**

- **BR-103** — Shared content **never** includes cost, rate or margin data, regardless of the sharer's own permissions.
- **BR-104** — Every share is audited with recipient, channel and timestamp.
- **BR-105** — Only designs marked `shareable = true` may be shared externally.


**Dependencies**

M18, M20, M38.


**Expected Outputs**

Formatted share message, PDF design card, share history records.


**Priority**

**P2 within Phase 2**


**Acceptance Criteria**

1. **Given** a design card share, **when** the message is generated, **then** it contains no rate, cost or margin field under any circumstance.
2. **Given** a share action, **when** completed, **then** an audit record captures recipient, channel and timestamp.

`[ASSUMPTION A-31]` WhatsApp deep links require the user's own WhatsApp client and cannot be automated or logged at delivery level. True automated delivery requires the WhatsApp Business API with an approved template and per-message cost.

---


### M22 — Design Comparison & Cross-Reference *(Phase 2)*


**Purpose**

Answer "have we made something like this before?" in seconds.


**Functions**

Select 2–4 designs for side-by-side comparison of all technical attributes with differences highlighted; feeder-set comparison; image comparison; similarity suggestion ("designs with the same reed/pick and ≥ 70% feeder overlap"); cross-reference index by colour, old number, work type, yarn and loom compatibility; export comparison to PDF.


**Development / Business Rules**

- **BR-106** — Comparison is read-only.
- **BR-107** — Similarity scoring is advisory and must be labelled as such, with the scoring basis visible.


**Dependencies**

M18, M19.


**Expected Outputs**

Comparison matrices, similarity rankings, PDF comparison export.


**Priority**

**P2 within Phase 2**


**Acceptance Criteria**

1. **Given** two designs differing only in pick count, **when** compared, **then** only the pick row is highlighted as different.
2. **Given** a design, **when** similar designs are requested, **then** results are ranked with the scoring basis visible.


---


### M23 — Production Order Management *(Phase 3)*


**Purpose**

Turn a confirmed commercial commitment into an executable manufacturing instruction.


**Development Description**

A production order references an approved cost sheet and a design, states quantity and delivery date, and decomposes into loom allocations, beam requirements and job cards.


**Functions**

Create from an approved cost sheet with pre-filled construction; manual creation; quantity and delivery planning; priority sequencing; split an order across multiple looms; hold and release with reason; progress tracking as a percentage of planned metres; cancellation with reason and cascade rules; order-to-job-card lineage view.


**Development / Business Rules**

- **BR-108** — A production order may reference only an **Approved** cost sheet.
- **BR-109** — Planned quantity must be greater than zero.
- **BR-110** — A production order cannot be cancelled once any production has been recorded against it; it may only be short-closed with a reason.
- **BR-111** — Changing the design or costing reference after release is prohibited; cancel and re-raise instead.


**Dependencies**

M11, M18, M24.


**Expected Outputs**

Production orders, allocation requirements, job card source data.


**Priority**

**P0 within Phase 3**


**Acceptance Criteria**

1. **Given** a Draft cost sheet, **when** a production order is created against it, **then** the operation is refused with "Costing must be approved".
2. **Given** a released order with 200 m produced of 1,000 m planned, **when** cancellation is attempted, **then** it is refused and short-close is offered.
3. **Given** an order created from an approved cost sheet, **when** the form opens, **then** design, construction, panna and picks are pre-filled from the costing.

---


### M24 — Loom Planning & Allocation *(Phase 3)*


**Purpose**

Assign work to machines that can actually run it, and make capacity visible.


**Functions**

Loom utilisation board (Gantt-style timeline by loom); drag-and-drop allocation and re-allocation; **compatibility engine** blocking impossible allocations; capacity calculation from RPM, picks per inch and efficiency assumption; estimated start and completion per allocation; conflict detection for overlapping allocations; loom status overlay (Running / Idle / Maintenance / Breakdown); what-if simulation for a proposed reschedule; utilisation percentage by loom, shed and period.


**Development / Business Rules**

- **BR-112** — A blocking compatibility failure cannot be overridden by any role. If the business genuinely needs it, the loom master data is wrong and must be corrected.
- **BR-113** — Two allocations may not overlap on the same loom for the same period.
- **BR-114** — Re-allocating a loom with work in progress requires a reason and notifies the supervisor.


**Dependencies**

M23, M04 (Loom Master), M18.


**Expected Outputs**

Loom allocations, utilisation metrics, planning board data.


**Priority**

**P0 within Phase 3**


**Acceptance Criteria**

1. **Given** a fabric of 60 inch finished width and a loom of 54 inch reed width, **when** allocation is attempted, **then** it is blocked with "Fabric width exceeds loom reed width (60 > 54)".
2. **Given** a design requiring 6 weft colours and a loom with 4 feeds, **when** allocated, **then** it is blocked with the specific numbers stated.
3. **Given** a polyester-only fabric, **when** allocated to a Water Jet loom, **then** it is permitted; **given** a cotton weft, **then** it is blocked.
4. **Given** an existing allocation on loom L-12 from the 5th to the 9th, **when** a second allocation from the 7th to the 11th is attempted, **then** the overlap is detected and refused.

---


### M25 — Beam, Warp & Weft Planning *(Phase 3)*


**Purpose**

Plan the physical preparation that must precede weaving.


**Functions**

Warp plan from the cost sheet's warp section (total ends, denier-wise breakdown, required length including wastage); sectional versus direct warping selection; beam requirement calculation and beam allocation from Beam Master; sizing recipe capture (size ingredients, pickup %, box temperature); drawing-in and knotting record; weft plan with colour-wise quantity requirement; yarn requisition generation against the plan; beam status lifecycle (Planned → Under Preparation → Ready → On Loom → Exhausted → Returned).


**Development / Business Rules**

- **BR-115** — A beam may be allocated to only one loom at a time.
- **BR-116** — Warp length planned must include the configured wastage allowance; the system shall display planned versus theoretical.
- **BR-117** — A beam cannot be marked "On Loom" unless the loom allocation exists.


**Dependencies**

M24, M07 (warp data), M04 (Beam Master).


**Expected Outputs**

Warp plans, beam allocations, sizing records, yarn requisitions.


**Priority**

**P1 within Phase 3**


**Acceptance Criteria**

1. **Given** a cost sheet with total warp ends 8,120, **when** a warp plan is generated, **then** total ends carry forward exactly and the beam requirement is computed against beam ends capacity.
2. **Given** a beam already On Loom at L-04, **when** allocation to L-09 is attempted, **then** it is refused.

---


### M26 — Job Card Voucher *(Phase 3)*


**Purpose**

Replace the handwritten Production Card with a system-generated, legible, traceable document that the shop floor can act on — reproducing the existing paper layout so that adoption requires no retraining.


**Development Description**

Derived from the production order, design, feeder set and approved costing. Layout reproduces the existing "Job Card Voucher / Production Card Party Wise" document.


**Functions**

Auto-generate from a production order; manual creation for orders outside the system (historical or external `[A-32]`); feeder program auto-population from the design's feeder set; A4 print layout matching the existing paper card; PDF and Excel export; reprint with a "REPRINT" marker and reprint count; issue to loom with acknowledgement; completion recording; cancellation with reason; job card register with filters.


**Development / Business Rules**

- **BR-118** — `voucher_no` is unique and generated from a configurable series; it is never reused, even after cancellation.
- **BR-119** — A job card may be issued only for a Released production order with a valid loom allocation.
- **BR-120** — Feeder values are copied by value at generation; later design changes do not alter an issued card.
- **BR-121** — An issued job card is immutable; corrections require cancellation and reissue, both audited.
- **BR-122** — Reprints are counted and marked so that the floor can identify the authoritative copy.
- **BR-123** — The job card shall not display any rate, cost or margin.


**Dependencies**

M23, M19, M24, M12 (print engine).


**Expected Outputs**

Job card records, printable A4 voucher, PDF/Excel exports, issue and completion records.


**Priority**

**P0 within Phase 3**


**Acceptance Criteria**

1. **Given** a released production order with a loom allocation and a design with 8 feeders, **when** a job card is generated, **then** FDR-1 to FDR-8 are populated, FDR-9 and FDR-10 are blank, and the sub-total sums the numeric feeder values.
2. **Given** an issued job card, **when** the underlying design's feeder set is edited, **then** the issued card is unchanged.
3. **Given** an issued job card, **when** printed a second time, **then** it carries a "REPRINT #2" marker.
4. **Given** any job card, **when** inspected, **then** no rate, cost or margin figure appears anywhere on it.
5. **Given** the printed output, **when** compared with the existing paper Job Card Voucher, **then** field order and table structure match.

`[ASSUMPTION A-32]` Manual job card creation is retained because the company issues cards for rework, samples and external job work that never pass through costing.

---


### M27 — Daily Production & Downtime Capture *(Phase 3)*


**Purpose**

Record what actually happened at the loom, at the loom, during the shift.


**Functions**

Shift-based production entry (date, shift, loom, job card, operator); metres and pieces produced; picks recorded; beam consumption; downtime log with reason code and duration; quality alerts raised from the floor; efficiency computed as actual versus theoretical output; large-touch-target tablet UI with numeric keypad; offline capture with sync on reconnection `[A-33]`; supervisor verification of entered figures.


**Development / Business Rules**

- **BR-124** — Production may be recorded only against an issued job card.
- **BR-125** — Cumulative production against a job card may not exceed planned quantity by more than `overproduction_tolerance_pct` (default 5%) without supervisor authorisation.
- **BR-126** — Total downtime in a shift may not exceed the shift duration.
- **BR-127** — Entries older than `production_entry_lock_days` (default 3) may be corrected only by a supervisor, with reason.


**Dependencies**

M26, M24, offline sync infrastructure.


**Expected Outputs**

Production records, downtime records, efficiency metrics.


**Priority**

**P1 within Phase 3**


**Acceptance Criteria**

1. **Given** an 8-hour shift, **when** downtime totalling 9 hours is entered, **then** it is rejected with the arithmetic shown.
2. **Given** a job card planned at 1,000 m with 1,040 m already recorded and a 5% tolerance, **when** a further 50 m is entered, **then** supervisor authorisation is required.
3. **Given** the tablet loses connectivity mid-entry, **when** connectivity returns, **then** the entry syncs without duplication.

`[ASSUMPTION A-33]` Shop-floor connectivity is assumed unreliable; offline-first capture with conflict-free sync is required for Phase 3 (contrast with A-04 for desk modules).

---


### M28 — Yarn Consumption & Wastage Analysis *(Phase 3)*


**Purpose**

Compare what costing assumed against what production actually consumed.


**Functions**

Planned consumption derived from the cost sheet; actual consumption from store issues and beam usage; variance by yarn, design, loom, operator and period; wastage percentage actual versus the costed assumption; exception report for variance beyond a threshold; feedback loop suggesting a revised wastage percentage for future costings.


**Development / Business Rules**

- **BR-128** — Planned consumption is derived from the **approved** cost sheet snapshot, never from current master data.
- **BR-129** — Variance beyond `consumption_variance_threshold_pct` (default 5%) raises an exception requiring explanation.
- **BR-130** — The system may **suggest** a revised wastage percentage but shall never alter a cost sheet automatically.


**Dependencies**

M27, M05, M30 (issues).


**Expected Outputs**

Variance reports, wastage analysis, costing feedback suggestions.


**Priority**

**P1 within Phase 3**


**Acceptance Criteria**

1. **Given** planned consumption of 100 kg and actual of 112 kg with a 5% threshold, **when** the variance report runs, **then** an exception is raised showing +12%.
2. **Given** any variance, **when** examined, **then** the planned figure traces back to the specific approved cost sheet version.

---


### M29 — Operator Performance *(Phase 3)*


**Purpose**

Provide fair, data-based visibility of shop-floor performance.


**Functions**

Output per operator per shift; efficiency versus loom standard; downtime attributable versus non-attributable; quality defects traced to shift and operator; trend charts; shift comparison; exportable performance summary.


**Development / Business Rules**

- **BR-131** — Performance data is visible to the operator concerned, their supervisor and management only.
- **BR-132** — Non-attributable downtime (power failure, no material) is excluded from operator efficiency.
- **BR-133** — Performance data shall not be used as the sole basis for disciplinary action; reports carry this statement. `[A-34]`


**Dependencies**

M27, M35 (defect attribution).


**Expected Outputs**

Operator performance metrics and trend data.


**Priority**

**P2 within Phase 3**


**Acceptance Criteria**

1. **Given** a shift with 2 hours of power-failure downtime, **when** operator efficiency computes, **then** those 2 hours are excluded from the denominator.
2. **Given** an operator user, **when** they open performance, **then** they see only their own figures.

`[ASSUMPTION A-34]` Included as a fairness safeguard; the company may adjust this policy statement.

---


### M30 — Inventory *(Phase 4)*


**Purpose**

Maintain perpetual, location-aware stock for yarn, beams, grey fabric, finished fabric, chemicals and accessories.


**Functions**

Perpetual stock with bin/location; lot and roll-level traceability; FIFO/FEFO issue suggestion; reorder level alerts; ageing and slow-moving analysis; stock valuation (weighted average and FIFO `[A-35]`); cycle counting with variance approval; inter-location transfer; stock ledger with running balance; negative-stock prevention.


**Development / Business Rules**

- **BR-134** — Negative stock is prohibited; an issue exceeding available stock is refused.
- **BR-135** — Every stock movement carries a document reference; unreferenced adjustments require authorisation and a reason.
- **BR-136** — Roll identity is immutable once created; splitting creates child rolls with parent lineage.
- **BR-137** — Stock valuation method is configured once and may not be changed mid-financial-year.


**Dependencies**

M04, M27, M31, M32.


**Expected Outputs**

Stock balances, ledgers, valuation, alerts, genealogy data.


**Priority**

**P0 within Phase 4**


**Acceptance Criteria**

1. **Given** 50 kg of a yarn lot in stock, **when** an issue of 60 kg is attempted, **then** it is refused with the available quantity stated.
2. **Given** a 500 m roll split into 300 m and 200 m, **when** committed, **then** two child rolls exist referencing the parent and the parent is closed.
3. **Given** a yarn below its reorder level, **when** the alert job runs, **then** the store keeper and purchase are notified.

`[ASSUMPTION A-35]` Weighted average is assumed as the default valuation method, being the most common in Indian textile practice. Confirm with Finance.

---


### M31 — Warehouse, Barcode & QR Traceability *(Phase 4)*


**Purpose**

Create a digital twin of every physical unit from yarn lot to dispatched roll.


**Functions**

QR/barcode generation at beam warping and at roll creation; label printing to thermal printers; scan-driven transactions (receipt, issue, transfer, inspection, packing, dispatch); full genealogy view (dispatched roll → finished roll → grey roll → job card → beam → yarn lot → supplier GRN); mobile scanning app; label reprint with audit.


**Development / Business Rules**

- **BR-138** — Every roll and beam carries a system-generated unique identifier that is never reused.
- **BR-139** — A scan-driven transaction records device, user, timestamp and location.
- **BR-140** — Genealogy must be reconstructible for any unit within its retention period.


**Dependencies**

M30, thermal printer integration, mobile scanner.


**Expected Outputs**

Labels, scan transactions, genealogy trees.


**Priority**

**P1 within Phase 4**


**Acceptance Criteria**

1. **Given** a dispatched roll, **when** genealogy is requested, **then** the complete chain to the supplier yarn lot is displayed.
2. **Given** a scanned code that does not exist, **when** processed, **then** a clear error is shown and no transaction is created.

---


### M32 — Sales: Customer, Quotation, Order, Dispatch, Invoice, Outstanding *(Phase 5)*


**Purpose**

Execute order-to-cash inside the system.


**Functions**

Quotation builder with margin visibility (permission-gated); quotation-to-order conversion; order acknowledgement PDF; delivery schedule tracking; partial dispatch; packing list with roll-level detail; GST-compliant invoice; e-invoice and e-way bill data export `[A-36]`; receipt entry and allocation; ageing report; automated payment reminders; broker commission calculation.


**Dependencies**

M11, M30, M39, M04.


**Expected Outputs**

Quotations, orders, dispatches, invoices, receivables data, accounting export payloads.


**Priority**

**P0 within Phase 5**


**Acceptance Criteria**

1. **Given** a Draft cost sheet, **when** a quotation line is created against it, **then** it is refused.
2. **Given** a customer at their credit limit, **when** a new order is confirmed, **then** it is blocked pending authorised override, which is audited.
3. **Given** a dispatch of 3 rolls, **when** committed, **then** those exact roll identities move to dispatched and are no longer available.
4. **Given** an issued invoice, **when** edited, **then** it is refused and a credit note is offered.

`[ASSUMPTION A-36]` E-invoicing (IRN) and e-way bill generation are assumed to be handled by the company's existing GSP; WeaveOne produces the required JSON payload rather than integrating directly.

---


### M33 — Job Work Management & Portal *(Phase 5)*


**Purpose**

Control material sent outside the factory for processing.


**Functions**

Job work challan (outward) with material, quantity and expected return; process instruction and agreed rate; receipt (inward) against challan with shortage and wastage recording; pending reconciliation by party; job work billing verification; ageing of outstanding material; external partner portal restricted to the partner's own challans.


**Development / Business Rules**

- **BR-146** — Outward quantity minus inward quantity minus agreed wastage equals shortage, which requires explanation beyond a threshold.
- **BR-147** — A job work party sees only their own challans; cross-party visibility is a security defect.
- **BR-148** — Material sent on job work remains the company's stock and is reported as "stock with third party".


**Dependencies**

M30, M04 (Job Work Party Master), M01 (portal auth).


**Expected Outputs**

Challans, reconciliation statements, job work billing data.


**Priority**

**P1 within Phase 5**


**Acceptance Criteria**

1. **Given** 1,000 m sent and 940 m returned with 3% agreed wastage, **when** reconciled, **then** shortage is computed as 30 m and flagged.
2. **Given** a job work portal user, **when** they attempt to access another party's challan by ID, **then** access is denied.

---


### M34 — Customer Portal *(Phase 5)*


**Purpose**

Let buyers self-serve status and documents.


**Functions**

Authenticated buyer dashboard; my orders with status and delivery schedule; my quotations; sample request and tracking; document downloads (order acknowledgement, packing list, invoice, TDS, certificates); catalogue browsing scoped to the buyer's approved products; enquiry submission.


**Development / Business Rules**

- **BR-149** — Portal data is strictly scoped to the authenticated customer; every query is scope-filtered server-side.
- **BR-150** — No cost, margin, internal design number, production detail or other customer's data is ever exposed.
- **BR-151** — Portal sessions have independent, shorter timeouts and separate rate limits.


**Dependencies**

M32, M01, M20.


**Expected Outputs**

Portal views, downloadable documents, sample requests.


**Priority**

**P2 within Phase 5**


**Acceptance Criteria**

1. **Given** a buyer, **when** they request an order ID belonging to another buyer, **then** HTTP 404 (not 403 — existence is not disclosed) is returned.
2. **Given** any portal response, **when** inspected, **then** it contains no cost or margin field.

---


### M35 — Quality Assurance *(Phase 6)*


**Purpose**

Grade fabric objectively and make defect causes visible.


**Functions**

Roll-level inspection entry on tablet; visual defect map with tap-to-place positioning; automatic point and grade computation; hold and release; shade band capture with reference standard and approval; lab test results against specification with pass/fail; defect Pareto by type, loom, design, shift and operator; certificate of inspection printout.


**Development / Business Rules**

- **BR-152** — Grade is computed by the system; manual grade override requires authorisation and a reason.
- **BR-153** — A roll on hold cannot be dispatched.
- **BR-154** — Inspection records are immutable after supervisor verification; corrections require a re-inspection record.
- **BR-155** — Defect points cannot exceed 4 per linear yard regardless of the number of defects (standard cap).


**Dependencies**

M27, M30, M31.


**Expected Outputs**

Inspection records, defect maps, grades, certificates, Pareto analytics.


**Priority**

**P0 within Phase 6**


**Acceptance Criteria**

1. **Given** defects of 2, 5, 8 and 12 inches in one yard, **when** scored, **then** raw points are 1+2+3+4 = 10 but the yard is capped at 4.
2. **Given** a 100 yd × 44 inch roll with 22 total points, **when** computed, **then** points per 100 sq yd = 18.0 and the grade is A under default thresholds.
3. **Given** a roll on hold, **when** dispatch is attempted, **then** it is refused.

`[ASSUMPTION A-37]` The ≤ 20 points A-grade threshold is the widely used industry default. Confirm the company's and its buyers' actual thresholds; they are configurable per customer.

---


### M36 — Machine Dashboard, IoT, Downtime & Energy *(Phase 7)*


**Purpose**

Move from recorded production to observed production.


**Functions**

Real-time loom status wall (running/stopped/fault); live pick counters and efficiency; automatic stop-cause capture from the loom controller where supported; downtime Pareto; energy consumption per loom and per metre; shed-level heat map; shift and day comparison; alert thresholds with notification.


**Development / Business Rules**

- **BR-156** — IoT ingestion is one-way (read-only from machines); WeaveOne shall not write to loom controllers.
- **BR-157** — Telemetry gaps must be visible as gaps, never interpolated into apparent production.
- **BR-158** — Manual entry remains authoritative where telemetry and manual records conflict, until reconciled.


**Dependencies**

M27, IoT gateway, loom vendor protocols.


**Expected Outputs**

Real-time status, efficiency and energy metrics, alerts.


**Priority**

**P1 within Phase 7**


**Acceptance Criteria**

1. **Given** a 30-minute telemetry gap, **when** displayed, **then** the gap is shown explicitly and excluded from efficiency denominators.
2. **Given** a loom reporting a fault, **when** the threshold is breached, **then** the configured recipients are notified within 60 seconds.

---


### M37 — Predictive Maintenance & AI Layer *(Phase 7)*


**Purpose**

Anticipate failure and optimise cost.


**Functions**

Maintenance schedule and history per loom; condition-based alerts from telemetry trends; failure prediction models; AI cost optimisation suggesting yarn substitutions with margin impact; yarn consumption prediction; demand forecasting; visual defect detection at inspection; recommendation engine for related designs.


**Development / Business Rules**

- **BR-159** — AI outputs are advisory. No AI output may automatically alter a cost sheet, a price, or a production instruction.
- **BR-160** — Every AI suggestion displays its basis and confidence.
- **BR-161** — Model training data and versions are recorded for reproducibility.


**Dependencies**

M36, M28, M35, M32.


**Expected Outputs**

Maintenance schedules, predictions, advisory suggestions with confidence.


**Priority**

**P2 within Phase 7**


**Acceptance Criteria**

1. **Given** an AI yarn substitution suggestion, **when** displayed, **then** it shows the basis, the margin impact and a confidence indicator, and requires explicit human action to apply.
2. **Given** any AI feature, **when** disabled in settings, **then** the system operates fully without it.

---


### M38 — Notification & Escalation Engine *(Phase 2)*


**Purpose**

Ensure that pending work reaches the right person without a phone call.

Full specification in Section 15. Summary: channel-agnostic engine (in-app, email, WhatsApp, SMS, push) with event subscriptions, per-user preferences, quiet hours, digest batching, escalation ladders and delivery audit.


**Development / Business Rules**

- **BR-162** — Notification failure never blocks the underlying business transaction.
- **BR-163** — Users may opt out of informational notifications but not of approval-required and security notifications.
- **BR-164** — Notification content respects the recipient's permissions; a notification shall not disclose data the recipient could not otherwise see.


**Dependencies**

M02, SMTP/SMS/WhatsApp providers.


**Expected Outputs**

Delivered notifications, delivery audit, escalation records.


**Priority**

**P1**


**Acceptance Criteria**

1. **Given** an email service outage, **when** a cost sheet is approved, **then** the approval commits and the notification is queued for retry.
2. **Given** a user who has muted informational notifications, **when** a sheet awaits their approval, **then** they are still notified.

---


### M39 — Integration Gateway *(Phase 5)*


**Purpose**

Exchange data with systems the company already runs.

Full specification in Section 22. Summary: outbound accounting export (Tally XML, SAP IDoc/OData, Dynamics), inbound master synchronisation, webhook publication of domain events, REST API with API-key authentication for partners, file-drop integration for legacy systems, printer and scanner integration.


**Development / Business Rules**

- **BR-165** — Integrations are idempotent; replaying a message must not duplicate data.
- **BR-166** — Every integration message is logged with payload, status and retry count.
- **BR-167** — Integration failures raise operational alerts and never silently discard data.


**Dependencies**

M32, M30, M04.


**Expected Outputs**

Export payloads, webhook deliveries, integration logs.


**Priority**

**P1 within Phase 5**


**Acceptance Criteria**

1. **Given** the same invoice export message sent twice, **when** processed, **then** only one accounting entry results.
2. **Given** an integration endpoint returning 500, **when** retried per policy, **then** exponential backoff is applied and an alert is raised after the final failure.


---



## 5. Technical Requirements


# 7. UI/UX Requirements

## 7.0 Global Design System

### 7.0.1 Design Principles

1. **The keyboard is the primary input device for costing.** The costing screen must be completable end-to-end without touching a mouse. Any interaction that forces a mouse is a defect.
2. **Numbers are the content.** Typography, alignment and spacing serve numerical legibility above decoration. Tabular figures, right-aligned numerics, consistent decimal places.
3. **State is always visible.** The user must never wonder whether something saved, whether a value was overridden, or whether a sheet is locked.
4. **Shop floor and desk are different products.** Desk screens are dense and keyboard-driven. Floor screens are sparse, high-contrast, large-target and glove-tolerant.
5. **Nothing conveys meaning by colour alone.** Every colour-coded state carries an icon or text label.

### 7.0.2 Visual Language

Loom-inspired, high-contrast natural textile theme with light and dark modes.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-app` | `#f4f1ea` (warm linen) | `#12171a` (slate dark) | Application background |
| `--bg-panel` | `#ffffff` | `#1a2125` | Cards, modals, top bar |
| `--bg-subtle` | `#faf8f3` | `#151b1f` | Alternating table rows |
| `--primary` | `#0e7c6b` (teal weave) | `#27b9a1` | Primary actions, active navigation |
| `--accent` | `#c2683f` (terracotta) | `#e08a5c` | Design numbers, highlights |
| `--border` | `#e6decf` (soft sand) | `#2a343a` | Separators, card edges |
| `--text` | `#1f1c17` (deep charcoal) | `#e9edec` | Primary text |
| `--text-muted` | `#6b6459` | `#95a0a3` | Secondary text, labels |
| `--success` | `#2f7d4f` | `#4caf7d` | Approved, in stock, pass |
| `--warning` | `#b07a12` | `#e0a93c` | Overrides, stale rates, thresholds |
| `--danger` | `#b23a34` | `#e06158` | Errors, rejections, blocks |
| `--info` | `#2a6f97` | `#5aa9d6` | Informational states |

**Typography:** IBM Plex Sans for UI and body; **IBM Plex Mono for all numeric cells, codes and technical metrics** — monospace numerals are non-negotiable in the costing grid because column-wise digit alignment is how users spot errors.

| Scale | Size / Line height | Usage |
|---|---|---|
| Display | 32 / 40 | Dashboard headline figures |
| H1 | 24 / 32 | Page titles |
| H2 | 20 / 28 | Section headings |
| H3 | 16 / 24 | Card titles |
| Body | 14 / 20 | Default |
| Small | 12 / 16 | Labels, helper text |
| Mono-grid | 13 / 20 | Data grid cells |

**Spacing:** 4 px base unit; 8 px component padding; 16 px card padding; 24 px section gaps.
**Radius:** 6 px controls, 10 px cards. **Elevation:** two levels only (card, modal).

### 7.0.3 Behaviours Common to Every Screen

Rather than repeating these on each screen, the following are **global contracts**. A screen specification below states only its deviations.

| Aspect | Global behaviour |
|---|---|
| **Loading** | Skeleton placeholders matching final layout (never spinners on full pages); inline spinner on buttons during submit; progressive rendering of grids as data arrives |
| **Empty** | Illustration + one-line explanation + primary action ("No cost sheets yet — Create your first cost sheet"). Never a bare empty table |
| **Error** | Inline, field-level, adjacent to the field, in plain language, stating what to do; page-level errors offer retry; error IDs shown for support |
| **Validation** | On blur for individual fields; on submit for cross-field; inline messages beneath fields; a summary banner listing all errors with anchor links when a submit fails |
| **Unsaved changes** | Navigation away with unsaved changes prompts confirmation; browser tab close triggers the native warning |
| **Destructive actions** | Always confirmed in a modal naming the specific record; "Delete" is never the default-focused button |
| **Toasts** | Success toasts auto-dismiss in 4 s, top-right; error toasts persist until dismissed |
| **Optimistic updates** | Only for low-risk, easily reversed actions (toggling a filter). Never for financial writes |
| **Pagination** | Server-side; 25 / 50 / 100 per page; total count displayed; page state preserved in the URL |
| **Sorting** | Multi-column; sort state in the URL; stable secondary sort by created date |
| **Filtering** | Filter chips shown above results with individual clear and a "clear all"; filter state in the URL so views are shareable |
| **Search** | Debounced 300 ms; minimum 2 characters; results highlight the matched substring |
| **Responsive** | Breakpoints 640 / 768 / 1024 / 1280 px. Tables become stacked cards below 768 px, except the costing grid which becomes horizontally scrollable with a frozen first column |
| **Accessibility** | WCAG 2.1 AA. Full keyboard operability, visible focus rings (2 px, `--primary`), semantic landmarks, ARIA labels on icon-only buttons, 4.5:1 text contrast, form labels always present (never placeholder-as-label), `aria-live` regions for calculation updates and toasts |
| **Motion** | 150–200 ms transitions; all animation suppressed under `prefers-reduced-motion` |
| **Dates & numbers** | Dates `DD-MMM-YYYY` (unambiguous); numbers grouped in the Indian system (₹1,23,456.78) `[A-39]`; time in 24-hour format |
| **Currency** | Symbol from settings, prefixed, non-breaking space |
| **Timeouts** | Idle warning modal 2 minutes before session expiry with an extend option |

`[ASSUMPTION A-39]` Indian digit grouping (lakh/crore) is assumed for an Indian textile manufacturer. Configurable per locale.

### 7.0.4 Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Global search |
| `Ctrl/Cmd + S` | Save current form |
| `Ctrl/Cmd + Enter` | Save and submit |
| `Ctrl/Cmd + P` | Print current document |
| `Ctrl/Cmd + /` | Show shortcut reference |
| `Esc` | Close modal / cancel cell edit |
| `G` then `D` | Go to Dashboard |
| `G` then `C` | Go to Cost Sheets |
| `G` then `M` | Go to Masters |
| `N` | New record in the current module |
| `?` | Help for the current screen |

---

## 7.1 Screen — Login

**Purpose:** Authenticate and route the user to their role's landing page.

| Aspect | Specification |
|---|---|
| **Components** | Company logo, product name, email field, password field with show/hide toggle, "Remember this device" checkbox, Sign In button, Forgot Password link, version number in footer |
| **Buttons** | Sign In (primary, full width); Forgot Password (text link) |
| **Validation** | Email format on blur; both fields required on submit; generic failure message |
| **Dialogs** | Forgot Password modal (email field, Send Reset Link) |
| **Alerts** | Lockout banner with remaining time; "Your password has expired" banner routing to change-password |
| **Empty / Loading** | Button shows inline spinner and disables during submit |
| **Error states** | Invalid credentials (generic); account locked (with countdown); account inactive (contact administrator); network error (retry) |
| **Responsive** | Single centred column, max 400 px; full-bleed below 640 px |
| **Keyboard** | `Enter` submits from either field; focus starts in email |
| **Accessibility** | Form landmark, labelled inputs, error announced via `aria-live`, password toggle labelled |

---

## 7.2 Screen — Dashboard

**Purpose:** Present each role with what needs attention now.

| Aspect | Specification |
|---|---|
| **Components** | Greeting with user name and date; global date-range selector; KPI summary cards; pending-action queue; charts; recent items; quick-action grid |
| **Buttons** | Quick actions (New Cost Sheet, New Design, Search, Reports); per-widget "View all" |
| **Tables** | Pending approvals (design, preparer, age, value); recent cost sheets |
| **Filters** | Date range (Today, This Week, This Month, This Quarter, Custom); applies to all widgets |
| **Dropdowns** | Date range preset; widget-level grouping where applicable |
| **Search** | Global search available in the top bar |
| **Sorting** | Queue tables sortable by age and value |
| **Pagination** | Queues show top 10 with "View all" |
| **Dialogs** | None |
| **Alerts** | System-level banners (backup failure, stale rates detected, licence/health warnings) |
| **Validation** | Not applicable |
| **Empty states** | Per widget: "No approvals pending — you're clear"; charts show an explicit "No data for this period" rather than an empty axis |
| **Loading** | Skeleton cards preserving final dimensions to prevent layout shift |
| **Error states** | Per-widget error with retry; one failing widget must not blank the page |
| **Responsive** | 4-column grid ≥1280 px, 2-column ≥768 px, single column below; Management view is mobile-first |
| **Keyboard** | `Tab` through widgets; `Enter` on a KPI card drills down |
| **Accessibility** | Charts carry a data-table alternative reachable from a "View as table" control |

---

## 7.3 Screen — Cost Sheet Entry (Primary Screen)

This is the most-used screen in the system and receives the most design attention.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Cost Sheets   │  DN-1042  v2  [DRAFT]        Saved 12s ago  ⟲ History  │
├──────────────────────────────────────────────────────────────────────────┤
│ HEADER  Design No | Version | Date | Customer | Item | Unit Basis | Notes │
├──────────────────────────────────────────────────────────────────────────┤
│ WARP                                                        [+ Add Row]  │
│ ┌────┬───────┬──────────┬──────┬───────┬────────┬────────┬──────┬──────┐ │
│ │ #  │ Label │ Yarn     │ Ends │Denier │ Length │   KG   │ Rate │ Cost │ │
│ ├────┼───────┼──────────┼──────┼───────┼────────┼────────┼──────┼──────┤ │
│ │ 1  │ Ground│ PV 150/48│ 8000 │  100  │  3675  │ 3.2667 │185.00│604.34│ │
│ │ 2  │ Extra │ Zari 60D │ 1200 │   60  │  3675  │ 0.0294 │340.00│ 10.06│ │
│ │ 3  │       │          │      │       │        │        │      │      │ │
│ ├────┴───────┴──────────┴──────┴───────┴────────┴────────┴──────┴──────┤ │
│ │ TOTAL              Ends 9,200        KG 3.2961         Cost   42.72  │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ WEFT  (same structure + Picks, Panna)                       [+ Add Row]  │
├──────────────────────────────────────────────────────────────────────────┤
│ WASTAGE 10%  │ PROCESS CHARGES grid │ CARD COST                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌── STICKY SUMMARY BAR ─────────────────────────────────────────────────┐│
│ │ Material 148.71 │ Wastage 14.87 │ Process 13.30 │ Card 175.02 │       ││
│ │ FINAL COST ₹351.90                       SALE RATE ₹351.90            ││
│ └───────────────────────────────────────────────────────────────────────┘│
│ [Save] [Save New Version] [Duplicate] [Submit for Approval] [Print] [⋯]  │
└──────────────────────────────────────────────────────────────────────────┘
```

| Aspect | Specification |
|---|---|
| **Purpose** | Capture construction and produce an exact, verifiable cost |
| **Components** | Breadcrumb + identity bar with status badge and autosave indicator; collapsible header block; warp grid; weft grid; wastage input; process charge grid; card cost block; collapsible pricing block; **sticky summary bar**; action bar |
| **Buttons** | Save, Save as New Version, Duplicate, Submit for Approval, Print, Export (PDF/Excel), Reset, Delete (Draft only); per-row: duplicate, delete, drag handle |
| **Tables** | Three editable grids. Numeric columns right-aligned, monospace, fixed decimals. Computed columns visually distinct (subtle grey background, non-editable, no focus ring) |
| **Filters** | Not applicable |
| **Dropdowns** | Yarn type-ahead (searchable by code, name, composition, showing denier and rate in the option row); Customer; Item; Unit Basis; Process Master on charge rows |
| **Search** | Yarn selector supports fuzzy search and keyboard selection without a mouse |
| **Sorting** | Rows are ordered by sequence and reorderable, not sortable |
| **Pagination** | None — the full sheet is always in view |
| **Dialogs** | Yarn selector (if opened full-screen on mobile); confirm delete row with data; unsaved-changes prompt; conflict-resolution modal; warning-acknowledgement modal on submit; paste-mapping preview |
| **Alerts** | Inline per-line warnings (stale rate, zero rate, missing denier, override applied); section-level warning for high wastage; banner for locked (Approved) sheets; conflict banner |
| **Validation** | Per-cell on blur (type, range, sign); cross-field on save (at least one material line for submit); blocking versus warning clearly distinguished by icon and colour plus text |
| **Empty states** | New sheet renders the configured minimum blank rows with placeholder hints in the first row only |
| **Loading** | Skeleton grid on open; inline spinner in the summary bar during recalculation (should be imperceptible at 150 ms debounce) |
| **Error states** | Save failure keeps all entered data and shows a retry banner — **data is never lost on a failed save**; calculation error shows the failing line |
| **Responsive** | ≥1280 px: full grid. 768–1279 px: horizontal scroll with frozen `#`, Label and Yarn columns. <768 px: read-only card view with an "Open on desktop to edit" notice `[A-40]` |
| **Keyboard** | `Tab`/`Shift+Tab` cell traversal; `Enter` moves down within column; `Ctrl+D` fill down; `Ctrl+Enter` add row; `Alt+↑/↓` move row; `Ctrl+S` save; `Esc` cancel cell edit; typing over a selected cell replaces its content |
| **Accessibility** | Grid uses `role="grid"` with proper row/column semantics; every recalculation announced in a polite `aria-live` region ("Final cost updated to 351 rupees 90 paise"); override markers have text alternatives; column headers programmatically associated |

`[ASSUMPTION A-40]` Full costing entry on a phone is deliberately not supported. The grid density required for accurate numeric work does not survive a 380 px viewport, and an error here is expensive. Mobile users get read-only access plus approval capability.

---

## 7.4 Screen — Cost Sheet Register (List)

| Aspect | Specification |
|---|---|
| **Purpose** | Find, filter and act on any cost sheet |
| **Components** | Filter panel (collapsible), results table, bulk-action bar, pagination |
| **Buttons** | New Cost Sheet; row actions (View, Edit, Duplicate, Print, Compare); bulk Export, bulk Archive |
| **Tables** | Design No, Version, Status, Date, Customer, Item, Final Cost, Sale Rate, Prepared By, Approved By, Modified |
| **Filters** | Status (multi), date range, customer, item, prepared by, approved by, final cost range, has-override, has-stale-rate |
| **Dropdowns** | Saved views; page size; column chooser |
| **Search** | Free text across design number, customer and notes |
| **Sorting** | All columns; default modified date descending |
| **Pagination** | Server-side with total count |
| **Dialogs** | Bulk action confirmation; column chooser; save-view dialog |
| **Alerts** | "Showing latest version only" toggle state made explicit |
| **Validation** | Date range start ≤ end |
| **Empty states** | No results: "No cost sheets match these filters" + Clear Filters. No data at all: onboarding empty state + Create |
| **Loading** | Skeleton rows; filter panel remains interactive |
| **Error states** | Query failure with retry; partial failures never show stale data silently |
| **Responsive** | Cards below 768 px showing design, status, customer, final cost |
| **Keyboard** | `↑/↓` row navigation, `Enter` opens, `Space` selects for bulk action |
| **Accessibility** | Sortable headers expose `aria-sort`; selection count announced |

---

## 7.5 Screen — Version Comparison

| Aspect | Specification |
|---|---|
| **Purpose** | Show precisely what changed between two versions |
| **Components** | Version selectors (left/right), difference summary strip, synchronised side-by-side tables, changed-only toggle |
| **Buttons** | Swap sides, Export Comparison PDF, Approve (if pending), Close |
| **Tables** | Mirrored warp, weft, charges and summary tables with a delta column |
| **Filters** | "Show changed only" toggle |
| **Alerts** | Banner when the two versions used different calculation constants |
| **Empty states** | "These versions are identical" |
| **Error states** | One version unavailable → explanatory message, comparison disabled |
| **Responsive** | Stacked above/below below 1024 px with change markers preserved |
| **Keyboard** | `←/→` cycle versions; `C` toggles changed-only |
| **Accessibility** | Changes marked with `<ins>`/`<del>` semantics, not colour alone |

---

## 7.6 Screen — Approval Queue

| Aspect | Specification |
|---|---|
| **Purpose** | Let an approver clear pending work quickly |
| **Components** | Queue table with ageing indicator, quick-preview panel, action bar |
| **Buttons** | Approve, Reject, Compare, Open Full, Delegate |
| **Tables** | Design No, Version, Customer, Final Cost, Prepared By, Submitted, Age (colour + text: On time / Due soon / Overdue) |
| **Filters** | Age bucket, preparer, customer, value range |
| **Dialogs** | Approve (optional remarks); Reject (**mandatory** remarks, ≥10 chars, live counter); Delegate (user + date range) |
| **Alerts** | "This sheet is 3 days overdue"; "You prepared this sheet — self-approval is disabled" |
| **Validation** | Reject remarks length enforced with the submit button disabled until satisfied |
| **Empty states** | "Nothing awaiting your approval" |
| **Error states** | Already-actioned conflict shows who actioned it and when |
| **Responsive** | Tablet-optimised; approve/reject reachable with one thumb |
| **Keyboard** | `A` approve, `R` reject, `C` compare, `J/K` next/previous |
| **Accessibility** | Age status conveyed as text as well as colour |

---

## 7.7 Screen — Master List & Master Form (Pattern)

Applies to all nine masters; only fields differ.

| Aspect | Specification |
|---|---|
| **Purpose** | Maintain authoritative reference data |
| **Components** | Toolbar (New, Import, Export, column chooser), filter bar, table, side-panel or full-page form |
| **Buttons** | New, Edit, Deactivate/Activate, Import, Export, View History, Save, Save & New, Cancel |
| **Tables** | Code, Name, key attributes, Active, Last Updated, Updated By |
| **Filters** | Active/Inactive/All (default Active), plus master-specific filters |
| **Dropdowns** | FK selectors with type-ahead; unit, tax, category |
| **Search** | Across code and name with fuzzy tolerance |
| **Sorting** | All columns; default by name |
| **Pagination** | Server-side |
| **Dialogs** | Duplicate-detected (lists candidates, Continue/Cancel); deactivate confirmation showing reference count; import wizard (3 steps: upload → preview → confirm) |
| **Alerts** | "This record is used in 47 cost sheets"; "Code cannot be changed after use" |
| **Validation** | Field-level per Section 18; conditional requirements (loom fields) shown/hidden dynamically with the requirement stated |
| **Empty states** | "No materials yet — Add your first or Import from Excel" |
| **Loading** | Skeleton rows; import preview shows a progress bar with row counts |
| **Error states** | Import errors listed per row with a downloadable error file |
| **Responsive** | Form becomes single-column below 768 px; table becomes cards |
| **Keyboard** | `N` new, `E` edit selected, `Ctrl+S` save, `Ctrl+Shift+S` save and new |
| **Accessibility** | Conditional field appearance announced; required fields marked in text, not only with an asterisk |

---

## 7.8 Screen — Yarn Rate Change

| Aspect | Specification |
|---|---|
| **Purpose** | Change a rate deliberately and traceably |
| **Components** | Current rate display, new rate input, computed delta and percentage, effective date, **mandatory reason**, impact note |
| **Buttons** | Apply Change, Cancel |
| **Alerts** | "This will not affect 128 existing cost sheets" — stated positively to reassure the user |
| **Validation** | New rate ≥ 0; reason ≥ 5 characters; new rate ≠ current rate |
| **Dialogs** | Bulk rate change preview table listing every affected material with old and new rates |
| **Error states** | Concurrency conflict shows the current rate and requires re-confirmation |
| **Keyboard** | Focus starts in the new rate field; `Ctrl+Enter` applies |
| **Accessibility** | Delta announced live as the user types |

---

## 7.9 Screen — Design Entry & Feeder Sequencer *(Phase 2)*

| Aspect | Specification |
|---|---|
| **Purpose** | Record a design and its feeder arrangement |
| **Components** | Two-column layout: specification fields left, feeder sequencer right; image upload strip at the foot; autosave indicator |
| **Buttons** | Save, Save & New, Add Feeder, Copy Feeders From…, Upload Image, Share, Print Design Card |
| **Tables** | Feeder list: #, swatch, colour, old number, yarn, remarks, reorder handle, delete |
| **Dropdowns** | Work type, colour (with swatch in each option), yarn |
| **Dialogs** | Colour picker; copy-feeders-from-design selector; image lightbox; unsaved-changes prompt |
| **Alerts** | "Draft restored from 14:32"; "Design number already exists" |
| **Validation** | Design number required and unique; feeder requires colour or colour name; feeder cap enforced |
| **Empty states** | "No feeders defined — Add the first feeder" |
| **Loading** | Image thumbnails load progressively with blurred placeholders |
| **Error states** | Upload failure per file with retry, other files unaffected |
| **Responsive** | Stacks to single column below 1024 px; feeder reordering switches from drag to explicit up/down buttons on touch |
| **Keyboard** | `Alt+↑/↓` move feeder; `Ctrl+Shift+F` add feeder |
| **Accessibility** | Colour swatches carry the colour name as text; drag reordering has a full keyboard equivalent |

---

## 7.10 Screen — Job Card Voucher *(Phase 3)*

| Aspect | Specification |
|---|---|
| **Purpose** | Generate, view and print the production card |
| **Components** | Header block, program matching table (FDR-1…FDR-10), footer block, print preview |
| **Buttons** | Generate, Issue to Loom, Print, Export PDF/Excel, Cancel Card, Reprint |
| **Tables** | Program matching grid with colour swatches; feeder columns fixed at 10 with continuation for more |
| **Alerts** | "REPRINT #2"; "This card is issued and cannot be edited" |
| **Validation** | Cannot generate without a released order and a loom allocation |
| **Empty states** | "Design has no feeders defined" with a link to fix it |
| **Responsive** | Print-first layout; tablet view enlarges the program table for floor reading |
| **Keyboard** | `Ctrl+P` print |
| **Accessibility** | High-contrast mode available for shop-floor displays; minimum 16 px text on the floor view |

---

## 7.11 Screen — Shop Floor Production Entry *(Phase 3)*

Designed against Persona 6's constraints: low technical comfort, gloves, poor light, noise.

| Aspect | Specification |
|---|---|
| **Purpose** | Capture shift output and downtime in seconds |
| **Components** | Large loom selector tiles; job card summary card; numeric keypad; downtime reason tiles; submit |
| **Buttons** | Minimum touch target 64 × 64 px; primary action full width at the bottom of the screen (thumb zone) |
| **Dropdowns** | Replaced by tile grids — no small dropdowns anywhere on this screen |
| **Validation** | Immediate, large, plain-language; downtime exceeding shift length rejected with the arithmetic displayed |
| **Alerts** | Offline banner: "Working offline — 3 entries will sync when connected" |
| **Empty states** | "No job card assigned to this loom" |
| **Loading** | Optimistic local write with a sync status indicator per entry |
| **Error states** | Sync conflicts surfaced for supervisor resolution, never silently discarded |
| **Responsive** | Tablet-first (1024 × 768 landscape); phone-capable |
| **Keyboard** | Not applicable — touch only |
| **Accessibility** | Minimum 18 px text; 7:1 contrast; Gujarati and Hindi labels; icon plus text on every action |

---

## 7.12 Screen — Settings

| Aspect | Specification |
|---|---|
| **Purpose** | Administer constants, branding, security and localisation |
| **Components** | Left tab rail (Calculation, Display, Company, Security, Localisation, Retention, Notifications); form panels; change-history drawer |
| **Buttons** | Save, Restore Defaults (per group), View History, Preview Impact |
| **Dialogs** | Impact preview showing the acceptance fixture computed before and after the change; mandatory-reason dialog for calculation constants |
| **Alerts** | "Changing this affects new cost sheets only — existing sheets are unaffected" shown persistently beside non-retroactive constants |
| **Validation** | Per-setting constraints displayed inline; atomic all-or-nothing save |
| **Error states** | Validation failures listed with anchor links to the offending fields |
| **Responsive** | Tab rail becomes a top dropdown below 768 px |
| **Keyboard** | `Ctrl+S` save |
| **Accessibility** | Each setting has a persistent description, not a tooltip-only explanation |

---

## 7.13 Screen — Reports

| Aspect | Specification |
|---|---|
| **Purpose** | Run, view, export and schedule reports |
| **Components** | Report catalogue (left), parameter panel (top), results grid, export bar |
| **Buttons** | Run, Reset, Export Excel, Export PDF, Print, Save Parameters, Schedule |
| **Tables** | Grouped grid with subtotals and grand total |
| **Filters** | Report-specific parameters with saved parameter sets |
| **Pagination** | Server-side; large reports queue asynchronously |
| **Dialogs** | Schedule (frequency, recipients, format); saved parameters |
| **Alerts** | "This report is being generated — you'll be notified when ready" |
| **Empty states** | "No data for the selected parameters" with a suggestion to widen the range |
| **Loading** | Progress indicator with row count for long-running reports |
| **Error states** | Timeout suggests narrowing the range or scheduling instead |
| **Responsive** | Horizontal scroll with a frozen first column; parameter panel collapses |
| **Keyboard** | `Ctrl+Enter` run; `Ctrl+E` export |
| **Accessibility** | Grouped rows expose expand/collapse state; totals labelled |

---

## 7.14 Screen — Audit History

| Aspect | Specification |
|---|---|
| **Purpose** | Investigate what changed, when, and by whom |
| **Components** | Filter bar, chronological timeline or table, expandable diff viewer |
| **Buttons** | Export Extract, Filter, Expand All / Collapse All |
| **Tables** | Timestamp, User, Module, Entity, Action, Correlation ID |
| **Filters** | User, module, entity, action type, date range, IP |
| **Dialogs** | Diff viewer showing before/after per field |
| **Alerts** | "Records older than 8 years are archived — request from Administrator" |
| **Empty states** | "No audit records match these filters" |
| **Responsive** | Timeline view below 768 px |
| **Keyboard** | `↑/↓` navigate, `Enter` expand |
| **Accessibility** | Diffs use insertion/deletion semantics with text labels |

---


# 8. Navigation Structure

## 8.1 Primary Sidebar

Collapsible, 236 px expanded / 64 px icon-only collapsed. Persists per user. Items render only where the user holds the relevant permission — a hidden item is genuinely absent, not disabled.

```
┌─ WeaveOne ──────────────────┐
│  🏠  Dashboard              │
│                             │
│  COSTING                    │
│  📄  Cost Sheets            │
│  ✅  Approvals        [3]   │   ← badge = pending count
│  🔀  Compare Versions       │
│                             │
│  DESIGN                     │   (Phase 2)
│  🎨  Designs                │
│  🖼️  Image Gallery          │
│  🧵  Feeder Cross-Reference │
│                             │
│  PRODUCTION                 │   (Phase 3)
│  📋  Production Orders      │
│  🏭  Loom Planning          │
│  🎫  Job Cards              │
│  📊  Daily Production       │
│                             │
│  INVENTORY                  │   (Phase 4)
│  📦  Yarn Store             │
│  🧶  Beam Store             │
│  🎞️  Grey / Finished        │
│                             │
│  SALES                      │   (Phase 5)
│  👥  Customers              │
│  💬  Quotations             │
│  🧾  Orders & Dispatch      │
│  💰  Outstanding            │
│                             │
│  QUALITY                    │   (Phase 6)
│  🔍  Inspection             │
│  🎯  Shade Approval         │
│                             │
│  MASTERS                    │
│  🧵  Yarn / Material        │
│  📦  Item                   │
│  🏢  Party                  │
│  🏭  Job Work Party         │
│  🧶  Beam                   │
│  ⚙️  Loom                   │
│  🤝  Broker                 │
│  👤  Salesman               │
│  🎨  Beam Colour            │
│                             │
│  INSIGHTS                   │
│  📈  Reports                │
│  📊  Analytics              │   (Phase 7)
│                             │
│  SYSTEM                     │
│  👥  Users & Roles          │
│  ⚙️  Settings               │
│  🕓  Audit History          │
│  💾  Backup & Restore       │
│                             │
│  ● Database connected       │   ← live status indicator
└─────────────────────────────┘
```

## 8.2 Top Application Bar

| Zone | Contents |
|---|---|
| Left | Sidebar toggle (hamburger on mobile); breadcrumb trail |
| Centre | Global search (`Ctrl/Cmd + K`), full width on desktop, icon-only below 768 px |
| Right | Quick Create (+) menu; notification bell with unread count; theme toggle (light/dark/system); user avatar menu |

**User avatar menu:** My Profile · My Sessions · Change Password · Notification Preferences · Keyboard Shortcuts · Help & Documentation · Sign Out.

**Quick Create (+) menu** (permission-filtered): New Cost Sheet · New Design · New Production Order · New Material · New Party.

## 8.3 Breadcrumbs

Always present below the top bar on any screen deeper than one level. Every ancestor is a link; the current page is plain text.

```
Home  ›  Cost Sheets  ›  DN-1042  ›  Version 2
Home  ›  Masters  ›  Yarn Master  ›  PV 150/48  ›  Rate History
Home  ›  Production  ›  Job Cards  ›  JC-2026-00418
```

Rules: maximum 4 visible levels; middle levels collapse to `…` with a dropdown when longer; breadcrumbs reflect navigational hierarchy, not browser history.

## 8.4 Quick Actions

| Location | Actions |
|---|---|
| Dashboard grid | New Cost Sheet · New Design · Search Designs · Reports · Backup · Settings |
| Top bar (+) | Permission-filtered create menu |
| List toolbars | New · Import · Export · Column chooser |
| Row hover / long-press | View · Edit · Duplicate · Print · More (⋯) |
| Keyboard | `N` new in current module; `G` + letter navigation |
| Floating action button (mobile) | Context-appropriate primary action, bottom-right, thumb-reachable |

## 8.5 Mobile Bottom Navigation

Below 768 px, a fixed bottom bar replaces the sidebar for the five highest-frequency destinations. The centre action is visually elevated.

```
┌──────┬──────┬────────┬────────┬──────┐
│ Home │ Cost │  ( + ) │ Design │ More │
│  🏠  │  📄  │   ➕   │   🎨   │  ☰   │
└──────┴──────┴────────┴────────┴──────┘
```

"More" opens a full-screen sheet containing the complete permission-filtered navigation tree. Safe-area inset padding is applied for devices with a home indicator.

## 8.6 Dashboard Navigation & Drill-Down Paths

| Widget | Click destination |
|---|---|
| Cost sheets today | Register filtered to today |
| Pending approvals | Approval queue |
| My drafts | Register filtered to status=Draft, preparer=me |
| Rejected sheets | Register filtered to status=Rejected, preparer=me |
| Average final cost | Register with the value column sorted |
| Stale rates detected | Yarn master filtered to rates older than threshold |
| Loom utilisation | Loom planning board |
| Production vs plan | Production order list filtered to behind-schedule |
| Stock below reorder | Yarn store filtered to below-reorder |
| Outstanding total | Receivables ageing report |
| Quality holds | Inspection list filtered to on-hold |

## 8.7 URL Structure

Deep-linkable, shareable, and reflecting filter state.

```
/dashboard
/costsheets                              ?status=draft&customer=abc&page=2&sort=-modified
/costsheets/new
/costsheets/{id}
/costsheets/{id}/edit
/costsheets/{id}/print
/costsheets/compare                      ?left={id}&right={id}
/approvals
/designs                                 ?work=jacquard&reed=72
/designs/{id}
/designs/{id}/feeders
/gallery
/production/orders
/production/looms
/production/jobcards/{id}
/inventory/yarn
/sales/quotations
/quality/inspection
/masters/{master}                        ?active=true
/masters/{master}/{id}
/masters/yarn/{id}/rate-history
/reports/{reportKey}                     ?from=2026-04-01&to=2026-06-30
/settings/{group}
/users
/audit                                   ?module=costsheet&user={id}
```

Rules: filter, sort and pagination state always encoded in the query string so any view can be shared or bookmarked; IDs are UUIDs, never sequential integers, to avoid enumeration; unauthorised deep links return the standard 403 page with a route to the dashboard, and unauthorised *record* access in external portals returns 404 to avoid disclosing existence.


---


# 9. Database Design

## 9.1 Design Standards

| Standard | Rule |
|---|---|
| **Engine** | PostgreSQL 15+ (required for `NUMERIC` exactness, JSONB, `pg_trgm`, partitioning, generated columns) |
| **Naming** | `snake_case`; tables plural; junction tables `parent_child`; indexes `idx_<table>_<cols>`; FKs `fk_<table>_<ref>`; checks `chk_<table>_<rule>`; uniques `uq_<table>_<cols>` |
| **Primary keys** | `UUID` (v7 where available, for index locality), never sequential integers exposed in URLs |
| **Money & quantity** | `NUMERIC(19,6)` universally. **`FLOAT`, `REAL`, `DOUBLE PRECISION` are prohibited across the entire schema** |
| **Timestamps** | `TIMESTAMPTZ`, stored UTC, rendered in the user's timezone |
| **Soft delete** | `deleted_at TIMESTAMPTZ NULL` on business tables; every query filters `deleted_at IS NULL` via a default scope |
| **Audit fields** | `created_at`, `created_by`, `updated_at`, `updated_by` on every business table |
| **Concurrency** | `row_version INTEGER NOT NULL DEFAULT 1`, incremented by trigger on update |
| **Normalisation** | 3NF, with deliberate denormalisation only where documented (snapshot columns on cost sheet lines) |
| **Referential integrity** | Enforced in the database, not only in the ORM. `ON DELETE RESTRICT` by default; `CASCADE` only for owned children (feeders, cost sheet lines) |
| **Enums** | PostgreSQL enum types for closed sets; lookup tables where the business may extend the set |
| **Multi-tenancy** | `company_id UUID NOT NULL` present on every business table from day one, defaulted to a single seeded company. Not enforced in Phase 1; makes future multi-entity support a policy change rather than a migration |

## 9.2 Entity Relationship Overview

```
                    ┌──────────┐
                    │ companies│
                    └────┬─────┘
                         │ (all tables)
   ┌─────────┐      ┌────┴─────┐      ┌──────────────┐
   │  roles  │──<───│  users   │───>──│   sessions   │
   └────┬────┘      └────┬─────┘      └──────────────┘
        │                │
   ┌────┴──────────┐     │ created_by / approved_by
   │role_permissions│    │
   └───────────────┘     │
                         │
  ┌──────────────────────┴───────────────────────────────┐
  │                                                       │
  │  ┌──────────────┐        ┌─────────────────────┐     │
  │  │  materials   │───<────│material_rate_history│     │
  │  └──────┬───────┘        └─────────────────────┘     │
  │         │ snapshot (by value, NOT FK-dependent)      │
  │         v                                             │
  │  ┌──────────────────┐                                │
  │  │ cost_sheet_headers│                               │
  │  └───┬───┬───┬───┬──┘                                │
  │      │   │   │   └──────< cost_sheet_approvals       │
  │      │   │   └──────────< process_charges            │
  │      │   └──────────────< weft_lines                 │
  │      └──────────────────< warp_lines                 │
  │              │                                        │
  │              │ parent_costsheet_id (self-ref)        │
  │              v                                        │
  │      ┌───────────────┐    ┌──────────┐               │
  │      │production_    │───>│ designs  │──<─ feeders   │
  │      │   orders      │    └────┬─────┘               │
  │      └───┬───────────┘         │                     │
  │          │                     └──<─ design_images   │
  │          ├──< loom_allocations >──── looms           │
  │          └──< job_cards ──< job_card_feeder_programs │
  │                   │                                   │
  │                   └──< production_entries ──< downtime│
  │                                                        │
  │  parties ──< quotations ──< sales_orders ──< dispatches│
  │  beams · brokers · salesmen · colours · items · taxes  │
  │  inventory_stock · stock_movements · inspections       │
  │                                                        │
  └────────────────── audit_history (all) ────────────────┘
```

## 9.3 Core Table Definitions (DDL — Phase 1)

### 9.3.1 Identity & Access

```sql
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    VARCHAR(200) NOT NULL,
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  pincode         VARCHAR(10),
  country         VARCHAR(100) DEFAULT 'India',
  gstin           VARCHAR(15),
  pan             VARCHAR(10),
  logo_file_id    UUID,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_companies_gstin CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

CREATE TABLE roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  role_code       VARCHAR(50)  NOT NULL,
  role_name       VARCHAR(100) NOT NULL,
  description     TEXT,
  is_system_role  BOOLEAN NOT NULL DEFAULT FALSE,   -- system roles cannot be deleted
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID,
  row_version     INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_roles_code UNIQUE (company_id, role_code)
);

CREATE TABLE permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key  VARCHAR(100) NOT NULL UNIQUE,   -- e.g. 'costsheet.approve'
  module          VARCHAR(50)  NOT NULL,
  description     TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id),
  name                  VARCHAR(100) NOT NULL,
  email                 VARCHAR(254) NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,       -- Argon2id
  role_id               UUID NOT NULL REFERENCES roles(id),
  employee_code         VARCHAR(30),
  department            VARCHAR(100),
  phone                 VARCHAR(20),
  locale                VARCHAR(10) NOT NULL DEFAULT 'en-IN',
  timezone              VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_count    SMALLINT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by            UUID,
  deleted_at            TIMESTAMPTZ,
  row_version           INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_email CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE INDEX idx_users_company_active ON users(company_id, active) WHERE deleted_at IS NULL;

CREATE TABLE user_permission_overrides (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted         BOOLEAN NOT NULL,        -- TRUE = grant, FALSE = explicit deny
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID NOT NULL,
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  VARCHAR(255) NOT NULL,
  token_family        UUID NOT NULL,
  ip_address          INET,
  user_agent          TEXT,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ
);
CREATE INDEX idx_sessions_user_active ON sessions(user_id) WHERE revoked_at IS NULL;
```

### 9.3.2 Settings

```sql
CREATE TABLE settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  setting_key     VARCHAR(100) NOT NULL,
  setting_value   TEXT NOT NULL,
  value_type      VARCHAR(20) NOT NULL,        -- STRING|INTEGER|DECIMAL|BOOLEAN|ENUM|JSON|FILE
  setting_group   VARCHAR(50) NOT NULL,        -- CALCULATION|DISPLAY|COMPANY|SECURITY|LOCALE|RETENTION
  is_retroactive  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID,
  CONSTRAINT uq_settings_key UNIQUE (company_id, setting_key)
);

CREATE TABLE settings_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  setting_key     VARCHAR(100) NOT NULL,
  old_value       TEXT,
  new_value       TEXT NOT NULL,
  reason          TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by      UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_settings_history_key ON settings_history(company_id, setting_key, changed_at DESC);
```

### 9.3.3 Materials & Rate History

```sql
CREATE TABLE materials (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies(id),
  material_code      VARCHAR(30)  NOT NULL,
  material_name      VARCHAR(150) NOT NULL,
  yarn_name          VARCHAR(150),
  yarn_type          VARCHAR(30),
  composition        VARCHAR(100),
  denier             NUMERIC(12,4) NOT NULL,
  count_ne           NUMERIC(12,4),
  count_tex          NUMERIC(12,4),
  twist_tpm          NUMERIC(10,2),
  twist_direction    CHAR(1),
  colour_id          UUID,
  lustre             VARCHAR(20),
  is_hydrophobic     BOOLEAN NOT NULL DEFAULT FALSE,
  rate_incl_gst      NUMERIC(19,6) NOT NULL,
  rate_excl_gst      NUMERIC(19,6),
  rate_unit          VARCHAR(20) NOT NULL DEFAULT 'PER_KG',
  supplier_id        UUID,
  supplier_lot       VARCHAR(50),
  min_order_qty      NUMERIC(12,3),
  reorder_level      NUMERIC(12,3),
  rate_updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by         UUID NOT NULL,
  deleted_at         TIMESTAMPTZ,
  row_version        INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_materials_code   UNIQUE (company_id, material_code),
  CONSTRAINT chk_materials_denier CHECK (denier > 0),
  CONSTRAINT chk_materials_rate   CHECK (rate_incl_gst >= 0),
  CONSTRAINT chk_materials_twist  CHECK (twist_direction IS NULL OR twist_direction IN ('S','Z'))
);
CREATE INDEX idx_materials_name_trgm ON materials USING gin (material_name gin_trgm_ops);
CREATE INDEX idx_materials_active    ON materials(company_id, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_materials_stale     ON materials(rate_updated_at) WHERE active = TRUE;

CREATE TABLE material_rate_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id     UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  old_rate        NUMERIC(19,6),
  new_rate        NUMERIC(19,6) NOT NULL,
  old_denier      NUMERIC(12,4),
  new_denier      NUMERIC(12,4),
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  reason          TEXT NOT NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by      UUID NOT NULL REFERENCES users(id),
  CONSTRAINT chk_mrh_rate   CHECK (new_rate >= 0),
  CONSTRAINT chk_mrh_reason CHECK (length(trim(reason)) >= 5)
);
CREATE INDEX idx_mrh_material_date ON material_rate_history(material_id, changed_at DESC);
```

### 9.3.4 Cost Sheet

```sql
CREATE TYPE costsheet_status AS ENUM
  ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','ARCHIVED');

CREATE TABLE cost_sheet_headers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  UUID NOT NULL REFERENCES companies(id),
  design_number               VARCHAR(50) NOT NULL,
  version                     INTEGER NOT NULL DEFAULT 1,
  revision_label              VARCHAR(20),
  costing_date                DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id                 UUID REFERENCES parties(id),
  customer_name_snapshot      VARCHAR(200),
  item_id                     UUID REFERENCES items(id),
  design_id                   UUID,                       -- FK added in Phase 2
  unit_basis                  VARCHAR(20) NOT NULL DEFAULT 'PER_METRE',
  quantity_basis              NUMERIC(12,4) NOT NULL DEFAULT 1,
  notes                       TEXT,
  status                      costsheet_status NOT NULL DEFAULT 'DRAFT',
  parent_costsheet_id         UUID REFERENCES cost_sheet_headers(id),

  -- constants snapshot: the mechanism guaranteeing historical reproducibility
  kg_divisor_snapshot         NUMERIC(19,6) NOT NULL,
  card_divisor_snapshot       NUMERIC(19,6) NOT NULL,
  internal_precision_snapshot SMALLINT      NOT NULL,
  rounding_mode_snapshot      VARCHAR(20)   NOT NULL,
  calc_engine_version         VARCHAR(20)   NOT NULL,

  -- costing inputs
  wastage_pct                 NUMERIC(7,4)  NOT NULL DEFAULT 10,
  card_rate                   NUMERIC(19,6) NOT NULL DEFAULT 0,
  number_of_cards             NUMERIC(19,6) NOT NULL DEFAULT 0,
  markup_pct                  NUMERIC(7,4),
  profit_amount               NUMERIC(19,6),
  manual_sale_rate            NUMERIC(19,6),

  -- computed outputs, persisted from the server-side engine
  warp_total_cost             NUMERIC(19,6) NOT NULL DEFAULT 0,
  warp_total_ends             NUMERIC(19,6) NOT NULL DEFAULT 0,
  warp_total_kg               NUMERIC(19,6) NOT NULL DEFAULT 0,
  weft_total_cost             NUMERIC(19,6) NOT NULL DEFAULT 0,
  weft_total_picks            NUMERIC(19,6) NOT NULL DEFAULT 0,
  weft_total_kg               NUMERIC(19,6) NOT NULL DEFAULT 0,
  total_material_kg           NUMERIC(19,6) NOT NULL DEFAULT 0,
  base_material_cost          NUMERIC(19,6) NOT NULL DEFAULT 0,
  wastage_cost                NUMERIC(19,6) NOT NULL DEFAULT 0,
  material_cost_with_wastage  NUMERIC(19,6) NOT NULL DEFAULT 0,
  additional_process_cost     NUMERIC(19,6) NOT NULL DEFAULT 0,
  card_cost                   NUMERIC(19,6) NOT NULL DEFAULT 0,
  final_cost                  NUMERIC(19,6) NOT NULL DEFAULT 0,
  suggested_sale_rate         NUMERIC(19,6) NOT NULL DEFAULT 0,
  effective_sale_rate         NUMERIC(19,6) NOT NULL DEFAULT 0,
  gross_profit                NUMERIC(19,6) NOT NULL DEFAULT 0,
  gross_margin_pct            NUMERIC(7,4)  NOT NULL DEFAULT 0,

  prepared_by                 UUID NOT NULL REFERENCES users(id),
  submitted_at                TIMESTAMPTZ,
  submitted_by                UUID REFERENCES users(id),
  approved_at                 TIMESTAMPTZ,
  approved_by                 UUID REFERENCES users(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID NOT NULL,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by                  UUID NOT NULL,
  deleted_at                  TIMESTAMPTZ,
  row_version                 INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT uq_costsheet_design_version UNIQUE (company_id, design_number, version),
  CONSTRAINT chk_costsheet_version  CHECK (version > 0),
  CONSTRAINT chk_costsheet_wastage  CHECK (wastage_pct >= 0 AND wastage_pct <= 100),
  CONSTRAINT chk_costsheet_date     CHECK (costing_date <= CURRENT_DATE),
  CONSTRAINT chk_costsheet_divisors CHECK (kg_divisor_snapshot > 0 AND card_divisor_snapshot > 0),
  CONSTRAINT chk_costsheet_cards    CHECK (number_of_cards >= 0 AND card_rate >= 0),
  CONSTRAINT chk_costsheet_approval CHECK (
    (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR status <> 'APPROVED'
  )
);
CREATE INDEX idx_costsheet_design   ON cost_sheet_headers(company_id, design_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_costsheet_status   ON cost_sheet_headers(company_id, status)        WHERE deleted_at IS NULL;
CREATE INDEX idx_costsheet_customer ON cost_sheet_headers(customer_id, costing_date DESC);
CREATE INDEX idx_costsheet_prepared ON cost_sheet_headers(prepared_by, status);
CREATE INDEX idx_costsheet_date     ON cost_sheet_headers(company_id, costing_date DESC);
CREATE INDEX idx_costsheet_design_trgm ON cost_sheet_headers USING gin (design_number gin_trgm_ops);

CREATE TABLE warp_lines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id        UUID NOT NULL REFERENCES cost_sheet_headers(id) ON DELETE CASCADE,
  sequence             SMALLINT NOT NULL,
  label                VARCHAR(50),
  material_id          UUID REFERENCES materials(id) ON DELETE RESTRICT,
  yarn_name_snapshot   VARCHAR(150),        -- copied by value
  ends                 NUMERIC(12,4)  NOT NULL DEFAULT 0,
  denier               NUMERIC(12,4)  NOT NULL DEFAULT 0,   -- copied by value
  length_metre         NUMERIC(14,4)  NOT NULL DEFAULT 0,
  width_panna_inch     NUMERIC(10,4),                        -- informational only (A-18)
  rate_per_kg          NUMERIC(19,6)  NOT NULL DEFAULT 0,   -- copied by value
  calculated_kg        NUMERIC(19,6)  NOT NULL DEFAULT 0,   -- computed
  cost                 NUMERIC(19,6)  NOT NULL DEFAULT 0,   -- computed
  is_denier_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  is_rate_overridden   BOOLEAN NOT NULL DEFAULT FALSE,
  master_denier_at_snapshot NUMERIC(12,4),
  master_rate_at_snapshot   NUMERIC(19,6),
  rate_snapshot_at     TIMESTAMPTZ,
  remarks              VARCHAR(200),
  CONSTRAINT uq_warp_seq  UNIQUE (cost_sheet_id, sequence),
  CONSTRAINT chk_warp_nonneg CHECK (ends >= 0 AND denier >= 0 AND length_metre >= 0 AND rate_per_kg >= 0)
);
CREATE INDEX idx_warp_costsheet ON warp_lines(cost_sheet_id);
CREATE INDEX idx_warp_material  ON warp_lines(material_id);

CREATE TABLE weft_lines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id        UUID NOT NULL REFERENCES cost_sheet_headers(id) ON DELETE CASCADE,
  sequence             SMALLINT NOT NULL,
  label                VARCHAR(50),
  material_id          UUID REFERENCES materials(id) ON DELETE RESTRICT,
  yarn_name_snapshot   VARCHAR(150),
  picks_per_inch       NUMERIC(12,4) NOT NULL DEFAULT 0,
  denier               NUMERIC(12,4) NOT NULL DEFAULT 0,
  length_metre         NUMERIC(14,4) NOT NULL DEFAULT 0,
  panna_inch           NUMERIC(10,4) NOT NULL DEFAULT 0,     -- participates in calculation
  rate_per_kg          NUMERIC(19,6) NOT NULL DEFAULT 0,
  calculated_kg        NUMERIC(19,6) NOT NULL DEFAULT 0,
  cost                 NUMERIC(19,6) NOT NULL DEFAULT 0,
  is_denier_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  is_rate_overridden   BOOLEAN NOT NULL DEFAULT FALSE,
  master_denier_at_snapshot NUMERIC(12,4),
  master_rate_at_snapshot   NUMERIC(19,6),
  rate_snapshot_at     TIMESTAMPTZ,
  remarks              VARCHAR(200),
  CONSTRAINT uq_weft_seq UNIQUE (cost_sheet_id, sequence),
  CONSTRAINT chk_weft_nonneg CHECK (picks_per_inch >= 0 AND denier >= 0 AND length_metre >= 0
                                    AND panna_inch >= 0 AND rate_per_kg >= 0)
);
CREATE INDEX idx_weft_costsheet ON weft_lines(cost_sheet_id);
CREATE INDEX idx_weft_material  ON weft_lines(material_id);

CREATE TABLE process_charges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id   UUID NOT NULL REFERENCES cost_sheet_headers(id) ON DELETE CASCADE,
  sequence        SMALLINT NOT NULL,
  charge_name     VARCHAR(100) NOT NULL,
  process_id      UUID REFERENCES processes(id),
  rate            NUMERIC(19,6) NOT NULL DEFAULT 0,
  quantity        NUMERIC(19,6) NOT NULL DEFAULT 0,
  amount          NUMERIC(19,6) NOT NULL DEFAULT 0,   -- computed
  remarks         VARCHAR(200),
  CONSTRAINT uq_charge_seq UNIQUE (cost_sheet_id, sequence),
  CONSTRAINT chk_charge_nonneg CHECK (rate >= 0 AND quantity >= 0)
);
CREATE INDEX idx_charges_costsheet ON process_charges(cost_sheet_id);

CREATE TABLE cost_sheet_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id   UUID NOT NULL REFERENCES cost_sheet_headers(id) ON DELETE RESTRICT,
  action          VARCHAR(20) NOT NULL,        -- SUBMITTED|APPROVED|REJECTED|RECALLED|ARCHIVED
  from_status     costsheet_status NOT NULL,
  to_status       costsheet_status NOT NULL,
  remarks         TEXT,
  approval_level  SMALLINT NOT NULL DEFAULT 1,
  acted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_by        UUID NOT NULL REFERENCES users(id),
  CONSTRAINT chk_approval_reject_remarks CHECK (
    action <> 'REJECTED' OR length(trim(coalesce(remarks,''))) >= 10
  )
);
CREATE INDEX idx_approvals_costsheet ON cost_sheet_approvals(cost_sheet_id, acted_at DESC);
```

### 9.3.5 Audit

```sql
CREATE TABLE audit_history (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL,
  correlation_id  UUID NOT NULL,
  user_id         UUID REFERENCES users(id),
  user_name       VARCHAR(100),          -- denormalised: survives user changes
  module          VARCHAR(50)  NOT NULL,
  entity_type     VARCHAR(50)  NOT NULL,
  entity_id       UUID,
  entity_label    VARCHAR(200),          -- human-readable, e.g. 'DN-1042 v2'
  action          VARCHAR(50)  NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  reason          TEXT,
  ip_address      INET,
  user_agent      TEXT,
  record_hash     VARCHAR(64),           -- SHA-256 chained to previous (A-27)
  previous_hash   VARCHAR(64),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (occurred_at);

-- monthly partitions created by a maintenance job
CREATE INDEX idx_audit_entity      ON audit_history(entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_user        ON audit_history(user_id, occurred_at DESC);
CREATE INDEX idx_audit_correlation ON audit_history(correlation_id);
CREATE INDEX idx_audit_module      ON audit_history(company_id, module, occurred_at DESC);

REVOKE UPDATE, DELETE ON audit_history FROM application_role;   -- append-only enforced at grant level
```

## 9.4 Master Tables (Abbreviated Definitions)

| Table | Primary Key | Unique | Key FKs | Key Indexes | Notable Constraints |
|---|---|---|---|---|---|
| `items` | id | (company_id, item_code) | uom_id, tax_id, category_id | name trigram, active | hsn_code required when billable |
| `parties` | id | (company_id, party_code); gstin where not null | broker_id, salesman_id, price_list_id | name trigram, type, active | GSTIN regex; credit_limit ≥ 0 |
| `job_work_parties` | id | (company_id, party_code) | party_id | active | rate_unit in enum; lead_time_days ≥ 0 |
| `beams` | id | (company_id, beam_no) | current_loom_id | status, active | current_loom_id NOT NULL when status='ON_LOOM' |
| `looms` | id | (company_id, loom_code) | — | type, status, active | jacquard_hooks NOT NULL when shedding='JACQUARD'; dobby_frames NOT NULL when shedding='DOBBY'; reed_width > 0 |
| `brokers` | id | (company_id, broker_code) | — | name, active | commission_pct 0–100 |
| `salesmen` | id | (company_id, salesman_code) | reporting_to, user_id | territory, active | no cyclic reporting_to |
| `colours` | id | (company_id, colour_code) | — | old_number, name trigram | hex matches `^#[0-9A-Fa-f]{6}$` |
| `units` | id | (company_id, uom_code) | base_unit_id | — | conversion_factor > 0 |
| `taxes` | id | (company_id, tax_name, effective_from) | — | hsn_code | percentages 0–100; effective_to > effective_from |
| `processes` | id | (company_id, process_code) | — | is_job_work | default_rate ≥ 0 |

## 9.5 Phase 2–6 Tables (Abbreviated)

| Table | Key columns | Relationships | Notable rules |
|---|---|---|---|
| `designs` | design_number (unique), design_name, dn, dn_code, reed, pick, cards, patti, total_dc, total_cut, work_id, blue_apt, primary_image_id, shareable, active | → items, → cost_sheet_headers | Parallel `*_numeric` columns for range filtering (A-28) |
| `feeders` | design_id, feeder_number, colour_id, colour_name, old_number, yarn_id | design_id `ON DELETE CASCADE` | Unique (design_id, feeder_number); contiguous from 1; `old_number` indexed |
| `files` | storage_key, original_name, mime_type, size_bytes, checksum, scan_status, entity_type, entity_id | polymorphic | Objects in storage, metadata here (BR-99) |
| `design_images` | design_id, file_id, is_primary, caption, sort_order | → designs, → files | One primary per design (partial unique index) |
| `production_orders` | production_order_no (unique), design_id, costsheet_id, planned_quantity, required_by_date, priority, status | → designs, → cost_sheet_headers, → parties | costsheet must be APPROVED (enforced by trigger + application) |
| `loom_allocations` | loom_id, production_order_id, start_datetime, end_datetime, status | → looms, → production_orders | Exclusion constraint prevents overlap per loom |
| `job_cards` | voucher_no (unique), card_no, production_order_id, loom_id, party_name, item, colour, order_no, pieces, metres, operator_name, checked_by, status, reprint_count | → production_orders, → looms | Immutable once ISSUED |
| `job_card_feeder_programs` | job_card_id, beam_colour_id, qty, fdr_1..fdr_10, sub_total, total_pick, weight_per_piece, repeat_value | job_card_id `ON DELETE CASCADE` | Feeder values copied by value at generation (BR-120) |
| `production_entries` | job_card_id, loom_id, operator_id, entry_date, shift, metres, pieces, picks, idempotency_key | → job_cards | Unique idempotency_key prevents duplicate offline sync |
| `downtime_entries` | production_entry_id, reason_code, minutes, remarks | → production_entries | Sum of minutes ≤ shift duration |
| `inventory_stock` | item_type, item_id, lot_no, roll_id, location_id, quantity, uom, status | → locations | Quantity ≥ 0 enforced (BR-134) |
| `stock_movements` | stock_id, movement_type, quantity, reference_type, reference_id, moved_at, moved_by | → inventory_stock | Every movement references a document (BR-135) |
| `inspections` | roll_id, inspection_type, total_points, points_per_100sqyd, grade, status | → inventory_stock | Grade computed; override requires reason (BR-152) |
| `inspection_defects` | inspection_id, defect_type, length_inch, points, position_x, position_y | inspection_id `ON DELETE CASCADE` | Points derived from length band; 4-per-yard cap |
| `quotations` / `sales_orders` / `dispatches` / `invoices` | standard commercial columns | → parties, → cost_sheet_headers | Quotation lines reference APPROVED costings only (BR-141) |

## 9.6 Views & Materialised Views

```sql
-- Latest version of each design's cost sheet (used by registers and pickers)
CREATE VIEW v_costsheet_latest AS
SELECT DISTINCT ON (company_id, design_number) *
FROM cost_sheet_headers
WHERE deleted_at IS NULL
ORDER BY company_id, design_number, version DESC;

-- Currently approved costing per design
CREATE VIEW v_costsheet_approved_current AS
SELECT DISTINCT ON (company_id, design_number) *
FROM cost_sheet_headers
WHERE status = 'APPROVED' AND deleted_at IS NULL
ORDER BY company_id, design_number, version DESC;

-- Dashboard aggregates, refreshed every 5 minutes
CREATE MATERIALIZED VIEW mv_costing_daily_summary AS
SELECT company_id,
       costing_date,
       count(*)                          AS sheets_created,
       count(*) FILTER (WHERE status='APPROVED')          AS sheets_approved,
       count(*) FILTER (WHERE status='PENDING_APPROVAL')  AS sheets_pending,
       sum(final_cost)                   AS total_final_cost,
       avg(final_cost)                   AS avg_final_cost,
       avg(gross_margin_pct) FILTER (WHERE gross_margin_pct <> 0) AS avg_margin
FROM cost_sheet_headers
WHERE deleted_at IS NULL
GROUP BY company_id, costing_date;
CREATE UNIQUE INDEX ON mv_costing_daily_summary (company_id, costing_date);
```

## 9.7 Triggers

| Trigger | Table | Timing | Purpose |
|---|---|---|---|
| `trg_row_version` | all business tables | BEFORE UPDATE | Increment `row_version`, set `updated_at` |
| `trg_costsheet_immutable` | cost_sheet_headers, warp_lines, weft_lines, process_charges | BEFORE UPDATE/DELETE | Raise exception if parent status is APPROVED or ARCHIVED (BR-62) — a database-level guarantee, not only an application check |
| `trg_material_rate_history` | materials | AFTER UPDATE | Write a rate history row whenever `rate_incl_gst` or `denier` changes |
| `trg_feeder_renumber` | feeders | AFTER DELETE | Renumber remaining feeders contiguously (BR-95) |
| `trg_audit_hash` | audit_history | BEFORE INSERT | Compute `record_hash` chained to `previous_hash` |
| `trg_last_admin_guard` | users | BEFORE UPDATE/DELETE | Prevent removal of the final active Administrator (BR-06) |
| `trg_loom_allocation_overlap` | loom_allocations | BEFORE INSERT/UPDATE | Enforce non-overlap (also backed by a GiST exclusion constraint) |
| `trg_stock_nonnegative` | inventory_stock | BEFORE UPDATE | Reject a resulting negative balance (BR-134) |

## 9.8 Indexing Strategy

| Category | Approach |
|---|---|
| Primary access paths | Composite indexes on `(company_id, <business key>)` for every list screen |
| Foreign keys | Every FK column indexed — PostgreSQL does not create these automatically |
| Full-text | GIN indexes on `to_tsvector` of notes, remarks and descriptions |
| Fuzzy matching | `pg_trgm` GIN indexes on all name and code columns used in search and duplicate detection |
| Partial indexes | `WHERE deleted_at IS NULL` and `WHERE active = TRUE` to keep hot indexes small |
| Covering indexes | `INCLUDE` clauses on register queries to enable index-only scans |
| Partitioning | `audit_history` by month; `production_entries` by month from Phase 3; `stock_movements` by quarter from Phase 4 |
| Maintenance | Weekly `ANALYZE`; monthly index bloat check; `pg_stat_statements` reviewed each sprint |

## 9.9 Data Volume Projections

| Table | Year 1 | Year 5 | Growth driver |
|---|---|---|---|
| cost_sheet_headers | 5,000 | 40,000 | ~20 sheets/week × versions |
| warp_lines + weft_lines | 60,000 | 500,000 | ~12 lines per sheet |
| materials | 2,000 | 5,000 | Catalogue growth |
| material_rate_history | 10,000 | 80,000 | Weekly rate updates |
| designs | 15,000 | 100,000 | Target of SC-11 |
| feeders | 120,000 | 900,000 | ~9 per design |
| job_cards | 8,000 | 60,000 | Order volume |
| production_entries | 100,000 | 1,500,000 | Looms × shifts × days |
| stock_movements | 200,000 | 3,000,000 | Receipt/issue frequency |
| audit_history | 2,000,000 | 20,000,000 | All modules; partitioned |

Total projected size at year 5: approximately **80–120 GB** including indexes, excluding object storage for images (estimated separately at 300–800 GB for 100,000 designs at 3 images each).

---


# 10. API Requirements

## 10.1 API Standards

| Aspect | Standard |
|---|---|
| Style | REST over HTTPS; JSON request and response bodies |
| Base URL | `https://{host}/api/v1` |
| Versioning | URL path version; a breaking change requires `v2`; additive changes do not |
| Authentication | `Authorization: Bearer <access_token>` on every endpoint except `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/health` |
| Content type | `application/json; charset=utf-8`; `multipart/form-data` for uploads |
| **Monetary values** | **Always strings** (`"351.896510"`), never JSON numbers — this prevents float coercion in any client |
| Dates | ISO 8601. Dates `YYYY-MM-DD`; timestamps `YYYY-MM-DDTHH:mm:ss.sssZ` in UTC |
| Identifiers | UUID strings |
| Naming | `camelCase` in JSON payloads; `snake_case` in the database |
| Idempotency | `Idempotency-Key` header supported on all POST endpoints; replay returns the original response |
| Concurrency | `If-Match: <rowVersion>` on PUT; mismatch returns 409 |
| Correlation | `X-Correlation-Id` accepted and echoed; generated if absent; appears in logs and audit |
| Pagination | `?page=1&pageSize=25`; response envelope carries `page`, `pageSize`, `totalCount`, `totalPages` |
| Sorting | `?sort=-modifiedAt,designNumber` (leading `-` = descending) |
| Filtering | `?status=DRAFT,APPROVED&customerId={uuid}&costingDateFrom=2026-04-01` |
| Sparse fields | `?fields=id,designNumber,finalCost` |
| Rate limiting | Per-user and per-IP; `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers |
| Compression | gzip / brotli |
| CORS | Explicit allow-list of origins; credentials permitted only for the first-party application |

### Standard Response Envelope

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "pageSize": 25, "totalCount": 143, "totalPages": 6 },
  "warnings": [
    { "code": "STALE_RATE", "message": "Rate for PV 150/48 is 45 days old", "field": "warpLines[0].ratePerKg" }
  ]
}
```

### Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "COSTSHEET_LOCKED",
    "message": "Approved cost sheet cannot be modified.",
    "details": [
      { "field": "status", "issue": "Current status is APPROVED", "rule": "BR-62" }
    ],
    "correlationId": "3f2a...",
    "timestamp": "2026-08-08T09:14:22.417Z"
  }
}
```

## 10.2 HTTP Status Code Usage

| Code | Meaning in WeaveOne |
|---|---|
| 200 | Successful GET, PUT, PATCH |
| 201 | Resource created (POST); `Location` header set |
| 202 | Accepted for asynchronous processing (bulk PDF, large report) |
| 204 | Successful delete with no body |
| 400 | Malformed request or failed schema validation |
| 401 | Missing, expired or invalid token |
| 403 | Authenticated but lacking the required permission |
| 404 | Resource not found, **or** existence deliberately concealed (external portals) |
| 409 | State conflict: locked document, concurrency mismatch, already-actioned |
| 413 | Upload exceeds size limit |
| 422 | Business-rule violation (distinct from 400 schema failure) |
| 429 | Rate limit exceeded; `Retry-After` header set |
| 500 | Unhandled server error; correlation ID returned, no internal detail leaked |
| 503 | Dependency unavailable or maintenance mode |

## 10.3 Endpoint Catalogue

### 10.3.1 Authentication

| Method | URL | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | None | Authenticate; returns access token + sets refresh cookie |
| POST | `/auth/refresh` | Refresh cookie | Rotate tokens |
| POST | `/auth/logout` | Bearer | Revoke current session |
| POST | `/auth/logout-all` | Bearer | Revoke all sessions |
| GET | `/auth/profile` | Bearer | Identity, role, effective permissions, preferences |
| POST | `/auth/change-password` | Bearer | Change own password |
| POST | `/auth/forgot-password` | None | Send reset link (always 200, regardless of email existence) |
| POST | `/auth/reset-password` | Reset token | Complete reset |
| GET | `/auth/sessions` | Bearer | List own active sessions |
| DELETE | `/auth/sessions/{id}` | Bearer | Terminate a specific session |

**Example — POST /auth/login**

Request:
```json
{ "email": "meena@example.com", "password": "••••••••••", "rememberDevice": true }
```

Response 200:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "user": {
      "id": "8f1c...",
      "name": "Meena Patel",
      "email": "meena@example.com",
      "role": { "code": "COSTING_USER", "name": "Costing User" },
      "permissions": ["costsheet.create","costsheet.edit","costsheet.submit","costsheet.print"],
      "mustChangePassword": false,
      "locale": "en-IN"
    }
  }
}
```

Errors: `401 INVALID_CREDENTIALS` · `423 ACCOUNT_LOCKED` (with `retryAfterSeconds`) · `403 ACCOUNT_INACTIVE` · `429 RATE_LIMITED`.

---

### 10.3.2 Materials

| Method | URL | Permission | Purpose |
|---|---|---|---|
| GET | `/materials` | `master.yarn.read` | List with pagination, filter, search |
| GET | `/materials/{id}` | `master.yarn.read` | Single material |
| POST | `/materials` | `master.yarn.create` | Create |
| PUT | `/materials/{id}` | `master.yarn.update` | Update (non-rate fields) |
| POST | `/materials/{id}/rate-change` | `master.yarn.update` | Change rate with mandatory reason |
| POST | `/materials/bulk-rate-change` | `master.yarn.update` | Bulk rate change with preview token |
| PATCH | `/materials/{id}/status` | `master.yarn.update` | Activate / deactivate |
| GET | `/materials/{id}/rate-history` | `master.yarn.read` | Rate history |
| GET | `/materials/{id}/usage` | `master.yarn.read` | Referencing documents |
| POST | `/materials/import/preview` | `master.yarn.import` | Dry-run validation, returns preview token |
| POST | `/materials/import/commit` | `master.yarn.import` | Commit a previewed import |
| GET | `/materials/export` | `master.yarn.read` | XLSX download honouring filters |

**Example — POST /materials/{id}/rate-change**

Request (headers: `If-Match: 7`, `Idempotency-Key: 2b91...`):
```json
{ "newRate": "195.000000", "effectiveFrom": "2026-08-08", "reason": "Supplier price revision Aug-26 circular" }
```

Response 200:
```json
{
  "success": true,
  "data": {
    "materialId": "a41c...",
    "oldRate": "185.000000",
    "newRate": "195.000000",
    "deltaAmount": "10.000000",
    "deltaPct": "5.4054",
    "historyId": "9d3e...",
    "affectedFutureCostSheets": 0,
    "unaffectedExistingCostSheets": 128
  }
}
```

Errors: `422 REASON_REQUIRED` · `422 RATE_NEGATIVE` · `422 RATE_UNCHANGED` · `409 CONCURRENCY_CONFLICT` · `403 PERMISSION_DENIED`.

---

### 10.3.3 Cost Sheets

| Method | URL | Permission | Purpose |
|---|---|---|---|
| GET | `/costsheets` | `costsheet.read` | Register, filtered and paginated |
| GET | `/costsheets/{id}` | `costsheet.read` | Full sheet with lines and charges |
| POST | `/costsheets` | `costsheet.create` | Create draft (snapshots constants) |
| PUT | `/costsheets/{id}` | `costsheet.edit` | Update draft; server recomputes |
| DELETE | `/costsheets/{id}` | `costsheet.delete` | Soft delete (Draft only) |
| POST | `/costsheets/{id}/calculate` | `costsheet.read` | Stateless recalculation preview (does not persist) |
| POST | `/costsheets/{id}/duplicate` | `costsheet.create` | New version of the same design |
| POST | `/costsheets/{id}/copy-to-design` | `costsheet.create` | Copy under a new design number |
| POST | `/costsheets/{id}/submit` | `costsheet.submit` | Submit for approval |
| POST | `/costsheets/{id}/recall` | `costsheet.submit` | Withdraw a pending submission |
| POST | `/costsheets/{id}/approve` | `costsheet.approve` | Approve and lock |
| POST | `/costsheets/{id}/reject` | `costsheet.approve` | Reject with mandatory remarks |
| POST | `/costsheets/{id}/archive` | `costsheet.archive` | Archive |
| GET | `/costsheets/{id}/versions` | `costsheet.read` | All versions of the design |
| GET | `/costsheets/compare` | `costsheet.read` | `?left={id}&right={id}` diff |
| GET | `/costsheets/{id}/audit` | `audit.read` | Entity timeline |
| GET | `/costsheets/{id}/pdf` | `costsheet.print` | PDF binary |
| GET | `/costsheets/{id}/excel` | `costsheet.export` | XLSX binary |
| POST | `/costsheets/{id}/autosave` | `costsheet.edit` | Store a draft snapshot |
| GET | `/costsheets/{id}/autosave` | `costsheet.edit` | Retrieve an unrecovered snapshot |

**Example — POST /costsheets**

Request:
```json
{
  "designNumber": "DN-1042",
  "costingDate": "2026-08-08",
  "customerId": "b7d2...",
  "itemId": "c19a...",
  "unitBasis": "PER_METRE",
  "quantityBasis": "1",
  "notes": "Sample costing for Aarav Retail enquiry #4471"
}
```

Response 201 (abridged):
```json
{
  "success": true,
  "data": {
    "id": "e8f4...",
    "designNumber": "DN-1042",
    "version": 1,
    "status": "DRAFT",
    "constants": {
      "kgDivisor": "9000000.000000",
      "cardDivisor": "39.370000",
      "internalPrecision": 12,
      "roundingMode": "HALF_UP",
      "calcEngineVersion": "1.0.0"
    },
    "wastagePct": "10.0000",
    "warpLines": [ { "sequence": 1 }, { "sequence": 2 }, { "sequence": 3 } ],
    "weftLines": [ { "sequence": 1 }, { "sequence": 2 }, { "sequence": 3 },
                   { "sequence": 4 }, { "sequence": 5 }, { "sequence": 6 } ],
    "processCharges": [
      { "sequence": 1, "chargeName": "Butta", "rate": "0", "quantity": "0", "amount": "0" },
      { "sequence": 2, "chargeName": "RFD",   "rate": "0", "quantity": "0", "amount": "0" }
    ],
    "rowVersion": 1
  }
}
```

**Example — PUT /costsheets/{id}** (abridged request)

```json
{
  "warpLines": [
    { "sequence": 1, "label": "Ground", "materialId": "a41c...",
      "ends": "8000", "denier": "100", "lengthMetre": "3675", "ratePerKg": "185.000000" }
  ],
  "weftLines": [
    { "sequence": 1, "label": "Base", "materialId": "f22b...",
      "picksPerInch": "96", "denier": "150", "lengthMetre": "3675",
      "pannaInch": "44", "ratePerKg": "142.500000" }
  ],
  "wastagePct": "10",
  "processCharges": [
    { "sequence": 1, "chargeName": "Butta", "rate": "6.65", "quantity": "2" },
    { "sequence": 2, "chargeName": "RFD",   "rate": "7",    "quantity": "0" }
  ],
  "cardRate": "0.4",
  "numberOfCards": "17226"
}
```

Response 200 (computed section):
```json
{
  "success": true,
  "data": {
    "id": "e8f4...",
    "rowVersion": 2,
    "computed": {
      "warpTotalCost": "42.720000",
      "weftTotalCost": "105.990000",
      "totalMaterialKg": "1.234560",
      "baseMaterialCost": "148.710000",
      "wastageCost": "14.870000",
      "materialCostWithWastage": "163.580000",
      "additionalProcessCost": "13.300000",
      "cardCost": "175.016510033020",
      "finalCost": "351.896510033020",
      "effectiveSaleRate": "351.896510033020",
      "grossProfit": "0.000000",
      "grossMarginPct": "0.0000",
      "display": { "finalCost": "₹351.90", "finalCostRounded": "₹352" }
    },
    "warnings": []
  }
}
```

> Note the deliberate asymmetry: the client may send computed values, and the server ignores them entirely. The `computed` block in the response is authoritative (FR-M10-06).

**Example — POST /costsheets/{id}/approve**

Request: `{ "remarks": "Verified against enquiry 4471. Rates current." }`

Response 200:
```json
{
  "success": true,
  "data": {
    "id": "e8f4...",
    "status": "APPROVED",
    "approvedBy": { "id": "5a2f...", "name": "Sanjay Mehta" },
    "approvedAt": "2026-08-08T11:42:07.221Z",
    "supersededVersion": { "version": 1, "newStatus": "ARCHIVED" }
  }
}
```

Errors: `403 SELF_APPROVAL_FORBIDDEN` · `409 ALREADY_ACTIONED` · `409 INVALID_STATE_TRANSITION` · `422 VALIDATION_FAILED`.

---

### 10.3.4 Remaining Endpoint Groups (Summary)

| Group | Base path | Representative endpoints |
|---|---|---|
| Users & Roles | `/users`, `/roles`, `/permissions` | CRUD, `PATCH /users/{id}/status`, `POST /users/{id}/reset-password`, `GET /roles/{id}/permissions` |
| Settings | `/settings` | `GET /settings`, `PUT /settings` (atomic batch), `GET /settings/{key}/history`, `POST /settings/preview-impact` |
| Masters (generic) | `/masters/{master}` | Consistent CRUD, `/import/preview`, `/import/commit`, `/export`, `/{id}/history`, `/{id}/usage` |
| Designs | `/designs` | CRUD, `/{id}/feeders` (GET/PUT full set), `/{id}/images`, `/{id}/share`, `/compare`, `/cross-reference?oldNumber=5831` |
| Files | `/files` | `POST /files` (multipart), `GET /files/{id}` (signed redirect), `DELETE /files/{id}` |
| Production | `/production/orders`, `/production/allocations`, `/production/jobcards`, `/production/entries` | CRUD plus `/allocations/check-compatibility`, `/jobcards/{id}/issue`, `/jobcards/{id}/print` |
| Inventory | `/inventory/stock`, `/inventory/movements` | `POST /movements` (receipt/issue/transfer/adjustment), `GET /stock/ledger`, `GET /stock/{rollId}/genealogy` |
| Sales | `/sales/quotations`, `/sales/orders`, `/sales/dispatches`, `/sales/invoices` | CRUD plus `/quotations/{id}/convert`, `/invoices/{id}/credit-note` |
| Quality | `/quality/inspections` | CRUD plus `/{id}/defects`, `/{id}/grade`, `/{rollId}/hold`, `/{rollId}/release` |
| Reports | `/reports/{reportKey}` | `POST /reports/{key}/run`, `GET /reports/{key}/export`, `POST /reports/{key}/schedule` |
| Search | `/search` | `GET /search?q=&types=costsheet,design,material` |
| Audit | `/audit` | `GET /audit`, `GET /audit/entity/{type}/{id}`, `GET /audit/export` |
| Notifications | `/notifications` | `GET /notifications`, `PATCH /notifications/{id}/read`, `PUT /notifications/preferences` |
| System | `/health`, `/system/backups` | `GET /health` (liveness/readiness), `POST /system/backups`, `POST /system/restore` (two-person) |
| Webhooks | `/webhooks` | `POST /webhooks` (register), event publication to subscribers |

## 10.4 Error Code Registry (Extract)

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Request failed schema validation; `details` lists fields |
| `INVALID_CREDENTIALS` | 401 | Authentication failed |
| `TOKEN_EXPIRED` | 401 | Access token expired; refresh required |
| `TOKEN_REUSE_DETECTED` | 401 | Refresh replay; entire family revoked |
| `PERMISSION_DENIED` | 403 | Lacks the required capability |
| `SELF_APPROVAL_FORBIDDEN` | 403 | Approver is the preparer and self-approval is disabled |
| `ACCOUNT_INACTIVE` | 403 | Account deactivated |
| `RESOURCE_NOT_FOUND` | 404 | Not found, or existence concealed |
| `CONCURRENCY_CONFLICT` | 409 | `If-Match` row version mismatch |
| `COSTSHEET_LOCKED` | 409 | Approved or archived sheet cannot be modified |
| `INVALID_STATE_TRANSITION` | 409 | Transition not permitted from the current state |
| `ALREADY_ACTIONED` | 409 | Another user already actioned this item |
| `DUPLICATE_RECORD` | 409 | Unique constraint violated |
| `REFERENCED_RECORD` | 409 | Cannot delete; references exist |
| `FILE_TOO_LARGE` | 413 | Upload exceeds the limit |
| `REASON_REQUIRED` | 422 | A mandatory reason was not supplied |
| `RATE_NEGATIVE` | 422 | Negative rate rejected |
| `NO_MATERIAL_LINES` | 422 | Submit attempted with no material lines |
| `LOOM_INCOMPATIBLE` | 422 | Allocation blocked by a compatibility rule; `details` gives the numeric comparison |
| `INSUFFICIENT_STOCK` | 422 | Issue exceeds available quantity |
| `CREDIT_LIMIT_EXCEEDED` | 422 | Order confirmation blocked |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected failure; correlation ID supplied |
| `SERVICE_UNAVAILABLE` | 503 | Dependency down or maintenance mode |


---


# 11. Security

## 11.1 Authentication

| Control | Specification |
|---|---|
| Primary mechanism | Email + password, Argon2id hashing (memory 64 MB, iterations 3, parallelism 4) |
| Access token | JWT, RS256, 15-minute lifetime, carries `sub`, `companyId`, `roleCode`, `permissions[]`, `jti` |
| Refresh token | Opaque 256-bit random value, hashed at rest, 7-day lifetime, HttpOnly + Secure + SameSite=Strict cookie |
| Rotation | Every refresh issues a new pair; the old token is immediately invalidated |
| Replay detection | Reuse of a consumed refresh token revokes the entire token family and forces re-authentication |
| Token revocation | `jti` deny-list in Redis for the remaining access-token lifetime after logout or permission change |
| Multi-factor | TOTP, Phase 2; schema provisioned in Phase 1; mandatory for Administrator role once available `[A-41]` |
| Machine access | API keys for integration partners, scoped to specific endpoints, rotatable, never granted user permissions |
| Password reset | Single-use token, 30-minute expiry, invalidated on use or password change; response is always 200 to prevent enumeration |

## 11.2 Authorisation

**Model:** capability-based RBAC with per-user overrides. Roles aggregate permissions; a user has one role plus optional grants and explicit denies. An explicit deny always wins.

```
effective_permissions =
      role_permissions
   ∪  user_overrides WHERE granted = TRUE
   ∖  user_overrides WHERE granted = FALSE
```

**Enforcement layers — all four are required; none alone is sufficient:**

1. **UI** — controls the user cannot use are not rendered. This is usability, not security.
2. **API middleware** — every route declares its required capability; the middleware rejects before the handler runs.
3. **Service layer** — row-level scoping applied inside queries (a Salesman's query is filtered, not filtered-after-fetch).
4. **Database** — the application role holds no `UPDATE`/`DELETE` grant on `audit_history`; triggers block modification of approved documents.

**Row-level scoping rules**

| Role | Scope |
|---|---|
| Costing User | Own drafts for edit; all sheets readable `[A-42]` |
| Salesman | Parties where `salesman_id` = self, or within assigned territory |
| Operator | Job cards allocated to their loom and shift |
| Job Work Party | Challans where `job_work_party_id` = self |
| Customer | Orders, quotations, invoices where `customer_id` = self |
| Management, Admin | Unrestricted within the company |

`[ASSUMPTION A-41]` Mandatory 2FA for Administrators is recommended; it may be relaxed if the deployment is entirely on a private LAN.

`[ASSUMPTION A-42]` Costing Users can read all cost sheets (needed to find and clone similar work) but edit only their own. If the business requires stricter separation, set `costsheet.read` to scoped.

## 11.3 Password Policy

| Rule | Value | Configurable |
|---|---|---|
| Minimum length | 10 characters | Yes |
| Composition | ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 symbol | Yes |
| Deny list | Top 10,000 common passwords; company name; user's own name or email local-part | No |
| History | Last 5 passwords may not be reused | Yes |
| Maximum age | 180 days for Administrators; not enforced for other roles `[A-43]` | Yes |
| Minimum age | 1 day (prevents cycling through history) | Yes |
| Lockout | 5 failures → 15-minute lock; exponential thereafter | Yes |
| Strength feedback | Live zxcvbn-style meter during entry | — |
| Storage | Argon2id only; never logged, never in audit, never in error messages | No |

`[ASSUMPTION A-43]` Forced rotation for ordinary users is deliberately omitted: current guidance (NIST SP 800-63B) finds routine expiry counterproductive. Administrators rotate because their compromise is catastrophic.

## 11.4 Session Handling

| Control | Specification |
|---|---|
| Idle timeout | 30 minutes, configurable; warning modal at 28 minutes with an extend action |
| Absolute timeout | 12 hours regardless of activity |
| Concurrent sessions | Permitted; visible to the user; individually terminable |
| Session binding | Refresh tokens bound to a device fingerprint; a mismatch forces re-authentication |
| Termination triggers | Logout, password change, role change, deactivation, admin force-logout, replay detection |
| Portal sessions | External portals (customer, job work) use 15-minute idle and 4-hour absolute timeouts |
| Cookie flags | `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth` |

## 11.5 Audit Trail

Specified in full in M14. Security-relevant summary: append-only, transaction-coupled, hash-chained, retained per policy, never editable through the application, and covering authentication, authorisation, data change, configuration change, and document export events.

## 11.6 Encryption

| Layer | Control |
|---|---|
| In transit | TLS 1.3 (1.2 minimum); HSTS with a 1-year max-age and preload; internal service traffic also TLS |
| At rest — database | Full-disk or tablespace encryption (AES-256); PostgreSQL TDE or encrypted volume |
| At rest — files | Server-side encryption on the object store (SSE-S3 or SSE-KMS) |
| At rest — backups | AES-256; keys stored separately from backup media |
| Application-level | Password hashes (Argon2id); refresh tokens (SHA-256); API keys (hashed); reset tokens (hashed) |
| Key management | Rotation every 12 months; envelope encryption; keys never in source control or environment files committed to a repository |
| Secrets | Managed via the platform's secret store; `.env` files only for local development; `.env.example` contains no real values |

## 11.7 Data Privacy

| Category | Data held | Control |
|---|---|---|
| Employee | Name, email, phone, employee code, department | Access limited to Administrators and the individual; not exported in general reports |
| Customer contact | Name, phone, email, address, GSTIN | Business-necessary; access by role; excluded from shop-floor screens |
| Commercial | Rates, costs, margins | Strictly role-gated; never on job cards, never in external shares, never in customer portal |
| Operational | Operator performance | Visible to the individual, their supervisor and management only (BR-131) |
| Logs | Correlation IDs, IP addresses | Retained 90 days; personal data minimised; passwords and tokens never logged |

**Principles applied:** data minimisation (collect only what a workflow needs); purpose limitation (commercial data does not reach production screens); access on a need-to-know basis; export of personal data restricted and audited.

## 11.8 Rate Limiting

| Endpoint class | Limit | Window | Response on breach |
|---|---|---|---|
| `/auth/login` | 5 per account, 20 per IP | 15 minutes | 429 + `Retry-After`; account lock after 5 |
| `/auth/forgot-password` | 3 per email, 10 per IP | 1 hour | 429 (response body still generic) |
| Read endpoints | 300 | 1 minute per user | 429 |
| Write endpoints | 60 | 1 minute per user | 429 |
| Export / PDF generation | 20 | 1 hour per user | 429 with a suggestion to schedule |
| Import commit | 5 | 1 hour per user | 429 |
| Global search | 60 | 1 minute per user | 429 |
| Public portal | 30 | 1 minute per IP | 429 + CAPTCHA challenge |
| Public enquiry form | 3 | 1 hour per IP | CAPTCHA required |

## 11.9 Application Security Controls

| Threat | Control |
|---|---|
| SQL injection | Parameterised queries only via Prisma; raw SQL requires review and parameter binding |
| XSS | React's default escaping; `dangerouslySetInnerHTML` prohibited by lint rule; strict Content-Security-Policy with nonces |
| CSRF | SameSite=Strict cookies plus a double-submit token on cookie-authenticated state-changing requests |
| Clickjacking | `X-Frame-Options: DENY`; `frame-ancestors 'none'` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| Mass assignment | Explicit Zod schemas per endpoint; unknown properties rejected, not ignored |
| IDOR | UUID identifiers; every fetch scope-checked server-side; external portals return 404 rather than 403 |
| File upload | Extension and magic-byte validation, size cap, virus scan, EXIF stripping, storage outside the web root, signed time-limited URLs, no execution permission |
| Dependency risk | Automated vulnerability scanning in CI; build fails on high/critical; monthly dependency review |
| Secrets in code | Pre-commit secret scanning; CI secret scanning |
| Denial of service | Rate limiting, request size caps, query timeouts, connection pool limits, async offload for heavy reports |
| Enumeration | Uniform error messages on authentication; 404 for concealed resources |
| Insecure deserialisation | JSON only; no `eval`; no dynamic code paths from user input |

## 11.10 Backup & Recovery (Security View)

| Control | Specification |
|---|---|
| RPO | ≤ 15 minutes (continuous WAL archiving) |
| RTO | ≤ 4 hours |
| Backup frequency | Full nightly; WAL continuous; monthly archival copy |
| Retention | 10 rolling full backups; 12 monthly archives; 7 annual archives `[A-44]` |
| Off-site | Encrypted replication to a geographically separate location |
| Restore authorisation | Two persons holding `system.restore`; staging-first; fully audited |
| Verification | Automated weekly restore to an isolated environment, with the acceptance fixture recomputed as the correctness check |
| Ransomware resilience | Immutable / write-once backup storage for at least 30 days |
| Documentation | Runbook maintained; quarterly drill with a written report |

`[ASSUMPTION A-44]` Retention tiers align with the assumed 8-year statutory period (A-05).

## 11.11 Compliance & Governance

| Item | Approach |
|---|---|
| Penetration test | Before Phase 1 go-live and annually thereafter |
| Security review | Threat model refreshed each phase; design review for any new external interface |
| Incident response | Documented plan with severity levels, notification chain, and a post-incident review requirement |
| Access review | Quarterly review of users, roles and overrides by the Administrator, signed off by Management |
| Segregation of duties | Preparer ≠ approver; restore requires two people; Admin actions on locked records require a reason |
| Vendor risk | Third-party services assessed before integration; data-processing terms recorded |

---


# 12. Dashboard Requirements

## 12.1 Dashboard Architecture

Every dashboard is composed from a shared widget library. A widget declares: its required permission, its data source, its refresh interval, its drill-down target, and its empty state. Layouts are per-role defaults that users may rearrange; the arrangement persists per user.

## 12.2 KPI Catalogue

### 12.2.1 Costing KPIs (Phase 1)

| KPI | Definition | Format | Drill-down |
|---|---|---|---|
| Cost sheets created | Count in period | Integer + sparkline | Register filtered to period |
| Cost sheets approved | Count with status APPROVED in period | Integer + % of created | Register, status=Approved |
| Pending approvals | Count in PENDING_APPROVAL | Integer + oldest age | Approval queue |
| Average approval latency | Mean hours submit → approve | Duration | Approval history |
| Rejection rate | Rejected ÷ submitted | Percentage | Register, status=Rejected |
| Average final cost | Mean `final_cost` in period | Currency | Register sorted by value |
| Average gross margin | Mean margin where markup applied | Percentage | Register with margin column |
| Costing throughput per user | Sheets per preparer | Bar chart | Register grouped by preparer |
| Average preparation time | Mean create → submit | Duration | Detail list |
| Stale rates in use | Count of active materials past threshold | Integer, warning styling | Yarn master filtered |
| Overrides applied | Count of lines with an override in period | Integer | Register, hasOverride=true |
| Sheets below cost | Count where sale rate < final cost | Integer, danger styling | Register filtered |

### 12.2.2 Design KPIs (Phase 2)

Total designs · Designs added this period · Designs with images (% coverage) · Designs missing feeders · Total feeders recorded · Work-type distribution · Most-referenced designs · Designs shared with buyers.

### 12.2.3 Production KPIs (Phase 3)

Looms running / idle / down · Overall loom utilisation % · Production vs plan (metres) · Orders behind schedule · Job cards issued / completed · Downtime hours by reason · Efficiency % by loom · Yarn consumption variance vs costing · Output per operator.

### 12.2.4 Inventory KPIs (Phase 4)

Yarn stock value · Items below reorder level · Grey stock (metres) · Finished stock (metres) · Stock ageing buckets · Slow-moving value · Stock with third parties · Cycle count accuracy %.

### 12.2.5 Sales KPIs (Phase 5)

Enquiries received · Quotations issued · Quote-to-order conversion % · Order book value · Dispatch vs commitment · Invoiced value · Outstanding total and ageing · Top customers · Salesman performance vs target.

### 12.2.6 Quality KPIs (Phase 6)

First-pass yield % · Average points per 100 sq yd · Grade distribution (A/B/C) · Top 5 defects (Pareto) · Rolls on hold · Defect rate by loom and by design · Shade approval turnaround.

## 12.3 Charts

| Chart | Type | Data | Interaction |
|---|---|---|---|
| Costing trend | Line | Sheets created and approved per day | Hover tooltip; click a point to filter the register |
| Cost composition | Stacked bar | Material / wastage / process / card per sheet | Click a segment to open that section |
| Rate movement | Line | Material rate over time | Multi-material overlay |
| Work-type distribution | Horizontal bar | Design count by work type | Click to filter designs |
| Loom utilisation | Heat map | Loom × day, coloured by utilisation | Click a cell to open the allocation |
| Downtime Pareto | Bar + cumulative line | Downtime hours by reason | Click a bar to list incidents |
| Defect Pareto | Bar + cumulative line | Defect points by type | Click to list inspections |
| Stock ageing | Stacked bar | Value by age bucket | Click to list items |
| Receivables ageing | Stacked bar | Amount by bucket | Click to list invoices |
| Margin distribution | Histogram | Sheets by margin band | Click a band to filter |

Chart requirements: every chart offers a "View as table" alternative for accessibility; no chart uses colour alone to distinguish series (patterns or direct labels required); axis units always stated; empty periods rendered as an explicit gap rather than zero.

## 12.4 Widgets

| Widget | Content | Default roles |
|---|---|---|
| Greeting bar | Name, date, quick stats | All |
| Action queue | Items requiring the viewer's action, ordered by age | All |
| My drafts | Own unsubmitted sheets | Costing |
| Recently viewed | Last 8 records opened | All |
| Quick actions | Permission-filtered create shortcuts | All |
| Alerts panel | System warnings (backup failure, stale rates, stock alerts) | Admin, Management |
| Approval ageing | Pending items bucketed by age | Approver, Management |
| Top designs | Most-costed or most-produced designs | Management, Sales |
| Loom status wall | Live tile per loom | Planner, Production, Management |
| Shift summary | Current-shift output and downtime | Production |
| Outstanding summary | Receivables total with ageing | Finance, Management, Sales |

## 12.5 Reports Access from Dashboard

Each dashboard section carries a "Full report" link to the corresponding report in Section 13, pre-filtered to the dashboard's active date range — the filter context carries through so the user never re-enters parameters.

## 12.6 Summary Cards

Standard anatomy: label · primary value (large, monospace) · comparison to the previous period with direction indicator (arrow + text, never colour alone) · sparkline where a trend exists · click-through to source records. Cards show an explicit "No data" state rather than zero when the period contains no records, because zero and absence mean different things.

## 12.7 Alerts

| Alert | Trigger | Severity | Recipients |
|---|---|---|---|
| Backup failed | Nightly job failure | Critical | Admin |
| Restore verification failed | Weekly drill failure | Critical | Admin |
| Calculation divergence detected | Client/server mismatch logged | Critical | Admin, engineering |
| Approval overdue | Pending > SLA | High | Approver, Management |
| Stale rates in use | Material past threshold used in a draft | Medium | Costing |
| Sale below cost | Sheet submitted with negative margin | High | Approver, Management |
| Stock below reorder | Perpetual stock crosses level | Medium | Store, Purchase |
| Loom down > threshold | Downtime exceeds configured minutes | High | Planner, Production |
| Quality hold placed | Roll placed on hold | High | Production, Sales |
| Credit limit breach | Order confirmation attempt over limit | High | Sales, Finance, Management |
| Security event | Lockout, permission change, forced logout | High | Admin |

## 12.8 Export & Drill-Down

Every widget supports: export of its underlying rows to Excel; copy-value-to-clipboard on the KPI figure; drill-down to a pre-filtered list view whose URL encodes the filter, so the drilled view is shareable. Drill-down always lands on real records — never on another aggregate.

---


# 13. Reports

## 13.1 Report Framework Standards

Every report specification below shares these behaviours: parameters persist as named sets; results are permission- and scope-filtered; totals aggregate at full stored precision then round for display (BR-76); Excel export preserves grouping and includes a parameter header block; PDF export uses landscape where the column count requires it; reports over 5,000 rows queue asynchronously; every report is drillable to source documents.

## 13.2 Phase 1 Report Specifications

### R-01 Cost Sheet Register

| Aspect | Specification |
|---|---|
| **Purpose** | The primary operational listing of all costings |
| **Columns** | Design No, Version, Status, Costing Date, Customer, Item, Unit Basis, Warp Cost, Weft Cost, Base Material, Wastage %, Wastage Amount, Process Cost, Card Cost, **Final Cost**, Sale Rate, Margin %, Prepared By, Approved By, Approved Date |
| **Filters** | Date range, status (multi), customer, item, prepared by, approved by, final cost range, margin range, has override, has stale rate, latest-version-only toggle |
| **Grouping** | None / Customer / Month / Status / Prepared By |
| **Sorting** | Any column; default costing date descending |
| **Totals** | Count, sum of final cost, average final cost, average margin — per group and grand |
| **Export** | Excel, PDF, CSV |
| **Printing** | Landscape A4, repeated headers, group breaks |
| **Scheduling** | Weekly Monday 08:00 to Management |
| **Drill-down** | Row → cost sheet detail |

### R-02 Material Rate History

| Aspect | Specification |
|---|---|
| **Purpose** | Prove what a rate was on any date and who changed it |
| **Columns** | Material Code, Material Name, Composition, Denier, Old Rate, New Rate, Change Amount, Change %, Effective From, Changed By, Changed At, Reason |
| **Filters** | Material (multi), date range, changed by, change magnitude threshold, direction (increase/decrease) |
| **Grouping** | None / Material / Month / Changed By |
| **Sorting** | Changed at descending by default |
| **Totals** | Count of changes, average change %, materials affected |
| **Export** | Excel, PDF |
| **Scheduling** | Monthly to Purchase and Costing |
| **Drill-down** | Row → material detail with full history chart |

### R-03 Version Comparison Report

| Aspect | Specification |
|---|---|
| **Purpose** | Document what changed between two versions, for approval evidence |
| **Columns** | Field / Line, Version A Value, Version B Value, Delta, Delta % |
| **Filters** | Design number, version A, version B, changed-only toggle |
| **Grouping** | Section (Header / Warp / Weft / Charges / Summary) |
| **Totals** | Net change in final cost, count of changed fields |
| **Export** | PDF (primary), Excel |
| **Printing** | Portrait A4 |
| **Scheduling** | Not applicable |

### R-04 Customer-wise Costing Summary

| Aspect | Specification |
|---|---|
| **Purpose** | Understand costing activity and pricing by buyer |
| **Columns** | Customer, Sheets Count, Designs Count, Avg Final Cost, Min, Max, Avg Sale Rate, Avg Margin %, Last Costing Date |
| **Filters** | Date range, customer group, salesman, broker, minimum sheet count |
| **Grouping** | Customer / Salesman / Broker |
| **Sorting** | Sheets count descending |
| **Totals** | Grand totals and weighted average margin |
| **Export** | Excel, PDF |
| **Scheduling** | Monthly to Sales and Management |
| **Drill-down** | Customer → their cost sheets |

### R-05 Date-wise Costing Register

| Aspect | Specification |
|---|---|
| **Purpose** | Daily and monthly costing throughput |
| **Columns** | Date, Sheets Created, Submitted, Approved, Rejected, Avg Final Cost, Total Value, Avg Turnaround Hours |
| **Filters** | Date range, prepared by, granularity (day/week/month) |
| **Grouping** | Day / Week / Month |
| **Totals** | Period totals and averages |
| **Export** | Excel, PDF |
| **Scheduling** | Daily 18:00 to Costing Manager |

### R-06 Status Report

| Aspect | Specification |
|---|---|
| **Purpose** | Pipeline visibility and bottleneck identification |
| **Columns** | Status, Count, Total Value, Oldest Item Age, Average Age |
| **Filters** | Date range, prepared by, customer |
| **Grouping** | Status |
| **Totals** | Overall count and value |
| **Export** | Excel, PDF |
| **Scheduling** | Daily to Management |
| **Drill-down** | Status → filtered register |

### R-07 Audit Extract

| Aspect | Specification |
|---|---|
| **Purpose** | Supply evidence to internal or external auditors |
| **Columns** | Timestamp, User, Role, Module, Entity Type, Entity, Action, Old Value, New Value, Reason, IP, Correlation ID |
| **Filters** | Date range, user, module, entity type, action |
| **Grouping** | Date / User / Module |
| **Export** | Excel, CSV (PDF impractical for volume) |
| **Access** | `audit.export` permission only; the export itself is audited |

### R-08 Material Usage Report

| Aspect | Specification |
|---|---|
| **Purpose** | Identify which yarns drive cost and where they are used |
| **Columns** | Material, Composition, Denier, Current Rate, Sheets Using, Total KG Costed, Total Value Costed, Avg Rate Used, Last Used Date |
| **Filters** | Date range, material, supplier, active state |
| **Grouping** | Material / Supplier / Composition |
| **Totals** | Total KG, total value |
| **Export** | Excel, PDF |
| **Drill-down** | Material → cost sheets using it |

## 13.3 Phase 2–7 Report Register (Specification Summary)

| ID | Report | Key columns | Primary filters | Phase |
|---|---|---|---|---|
| R-09 | Design Register | Design No, Name, DN, Reed, Pick, Cards, Work, Feeder Count, Image Count, Created | Work type, reed, pick, date | 2 |
| R-10 | Feeder Cross-Reference | Old Number, Colour, Designs Using, Feeder Positions | Colour, old number | 2 |
| R-11 | Design Sharing Log | Design, Shared With, Channel, Shared By, Date | Date, user, channel | 2 |
| R-12 | Production Order Status | Order No, Design, Customer, Planned, Produced, Balance, % Complete, Due, Status | Status, date, customer | 3 |
| R-13 | Daily Production Report | Date, Shift, Loom, Job Card, Design, Metres, Picks, Efficiency %, Downtime | Date, loom, shift, operator | 3 |
| R-14 | Loom Efficiency Report | Loom, Type, Running Hours, Downtime Hours, Efficiency %, Output, Output/Hour | Date, loom type, shed | 3 |
| R-15 | Downtime Analysis | Reason, Incidents, Total Hours, % of Total, Cumulative % | Date, loom, reason | 3 |
| R-16 | Yarn Consumption Report | Yarn, Planned KG, Actual KG, Variance KG, Variance %, Value Impact | Date, design, yarn | 3 |
| R-17 | Wastage Analysis | Design, Costed Wastage %, Actual Wastage %, Variance, Value Impact | Date, design, loom | 3 |
| R-18 | Operator Performance | Operator, Shifts, Output, Avg Efficiency, Attributable Downtime, Defect Rate | Date, operator, loom | 3 |
| R-19 | Job Card Register | Voucher No, Card No, Party, Design, Loom, Pieces, Metres, Status, Issued, Completed | Date, status, loom, party | 3 |
| R-20 | Yarn Stock Report | Yarn, Lot, Location, Quantity, Value, Age Days, Reorder Level, Status | Location, yarn, below-reorder | 4 |
| R-21 | Stock Ledger | Date, Document, Type, In, Out, Balance, Value | Item, date, location | 4 |
| R-22 | Stock Ageing | Item, 0–30, 31–60, 61–90, 91–180, 180+ | Item type, location | 4 |
| R-23 | Roll Genealogy | Roll, Parent, Job Card, Loom, Beam, Yarn Lot, Supplier, Dates | Roll ID | 4 |
| R-24 | Quotation Register | Quote No, Customer, Design, Qty, Rate, Value, Valid Until, Status | Date, customer, salesman, status | 5 |
| R-25 | Sales Order Book | Order No, Customer, Design, Qty, Value, Delivery Date, Produced, Dispatched, Balance | Date, customer, status | 5 |
| R-26 | Dispatch Register | Dispatch No, Date, Customer, Rolls, Metres, Vehicle, Invoice | Date, customer | 5 |
| R-27 | Party Ledger | Date, Document, Debit, Credit, Balance | Party, date range | 5 |
| R-28 | Outstanding / Ageing | Customer, Invoice, Date, Amount, Paid, Balance, Days Overdue, Bucket | Customer, bucket, salesman | 5 |
| R-29 | Broker Commission | Broker, Invoices, Value, Commission %, Commission Amount, Paid, Payable | Date, broker | 5 |
| R-30 | Job Work Reconciliation | Party, Challan, Sent, Received, Wastage, Shortage, Pending, Days | Party, date, status | 5 |
| R-31 | Profitability Analysis | Design/Customer, Revenue, Costed Cost, Actual Cost, Gross Profit, Margin % | Date, customer, design | 5 |
| R-32 | Cost vs Actual Variance | Design, Costed, Actual, Variance, Variance %, Root Cause | Date, design | 5 |
| R-33 | Inspection Report | Roll, Design, Loom, Length, Points, Points/100sqyd, Grade, Defects, Inspector | Date, grade, loom | 6 |
| R-34 | Defect Pareto | Defect Type, Occurrences, Points, % of Total, Cumulative % | Date, loom, design | 6 |
| R-35 | Shade Approval Register | Design, Colour, Standard, Result, Approved By, Date | Date, customer | 6 |
| R-36 | First Pass Yield | Period, Rolls Inspected, A-Grade, B-Grade, Rejected, FPY % | Date, loom, design | 6 |
| R-37 | Energy Consumption | Loom, Units Consumed, Output, Units per Metre, Cost per Metre | Date, loom | 7 |
| R-38 | Maintenance History | Loom, Type, Date, Downtime, Parts, Cost, Next Due | Loom, date | 7 |

## 13.4 Report Scheduling

| Aspect | Specification |
|---|---|
| Frequencies | Daily, weekly (day selectable), monthly (date selectable), quarterly |
| Delivery time | User-specified, timezone-aware |
| Recipients | Individual users, roles, or explicit email addresses |
| Formats | Excel, PDF, or both |
| Parameters | Relative date ranges resolve at run time ("last 7 days", "previous month") |
| Failure handling | Retry three times; notify the schedule owner on final failure; never silently skip |
| Management | Schedule list with pause, resume, edit, delete, and run-now; last run status shown |
| Audit | Every scheduled dispatch recorded with recipients and delivery outcome |

---


# 14. Search Requirements

## 14.1 Global Search

| Aspect | Specification |
|---|---|
| Invocation | Persistent top-bar field; `Ctrl/Cmd + K` from anywhere |
| Scope | Cost sheets, designs, materials, parties, looms, beams, job cards, production orders — permission-filtered |
| Behaviour | Debounced 300 ms; minimum 2 characters; results grouped by entity type with counts |
| Ranking | Exact code match → prefix match → fuzzy name match → full-text body match; recency and the user's own access frequency break ties |
| Presentation | Grouped list with the matched substring highlighted, plus a secondary line of context (status, customer, date) |
| Keyboard | `↑/↓` navigate, `Enter` open, `Tab` cycle groups, `Esc` dismiss |
| Recents | Last 5 searches and last 8 opened records shown before typing |
| Performance | < 2 seconds at 100,000 designs (SC-05); target p95 < 500 ms |
| Security | Scope filtering applied in the query, never post-fetch; counts never reveal inaccessible records (BR-86) |

**Separator tolerance:** search normalises `-`, `/`, `_`, `.` and whitespace, so "DN 1042", "DN-1042" and "dn1042" all match the same record. This matters because the same design is written differently by different departments.

## 14.2 Advanced Search

Per-module structured search with field-level operators.

| Operator | Applies to | Example |
|---|---|---|
| equals / not equals | all | `status = APPROVED` |
| contains / starts with / ends with | text | `designNumber startsWith "DN-10"` |
| in / not in | enums, references | `status in (DRAFT, REJECTED)` |
| between | numeric, date | `finalCost between 300 and 500` |
| greater / less than | numeric, date | `wastagePct > 15` |
| is null / is not null | optional fields | `customerId is null` |
| has any / has none | collections | `warpLines hasAny (material = "Zari 60D")` |
| matches | pattern | `notes matches "urgent"` |

Conditions combine with AND/OR and one level of grouping. The builder shows a plain-language summary of the constructed query ("Approved cost sheets for Aarav Retail costing more than ₹300, created since 1 April") so the user can verify intent before running.

## 14.3 Quick Filters

Single-click chips above every list, contextual to the module and the user's role.

| Module | Chips |
|---|---|
| Cost Sheets | My Drafts · Pending My Approval · Approved This Month · Rejected · Has Override · Stale Rates · Below Cost |
| Designs | Recently Added · Missing Images · Missing Feeders · Jacquard · Dobby · Shareable |
| Materials | Active · Below Reorder · Rate Stale · Recently Changed · Unused |
| Production Orders | Behind Schedule · Due This Week · On Hold · Unallocated |
| Inventory | Below Reorder · Ageing > 90 Days · With Third Party · On Hold |
| Approvals | Overdue · Due Today · High Value |

## 14.4 Saved Filters

| Aspect | Specification |
|---|---|
| Creation | Save the current filter, sort, column selection and page size as a named view |
| Visibility | Private by default; may be shared to a role or to all users by an Administrator |
| Default view | A user may set one saved view per module as their landing default |
| Portability | Saved views are URL-encodable and shareable as links |
| Management | Rename, duplicate, delete, reorder; shared views show their owner |
| Limits | 25 saved views per user per module |
| Evaluation | Relative dates resolve at run time, so "This Month" stays correct next month |

## 14.5 Search Infrastructure

| Concern | Implementation |
|---|---|
| Exact and prefix | B-tree indexes on code and number columns |
| Fuzzy | `pg_trgm` GIN indexes with a similarity threshold of 0.3 for search and 0.85 for duplicate detection |
| Full-text | `tsvector` generated columns with GIN indexes over notes, remarks and descriptions, using the `simple` configuration plus an Indian-textile synonym dictionary `[A-45]` |
| Cross-entity | A single federated query per entity type executed in parallel, results merged and ranked in the service layer |
| Caching | Recent query results cached 60 seconds per user; invalidated on write to the affected entity |
| Scaling | If PostgreSQL search performance degrades beyond 500,000 designs, a dedicated search index (OpenSearch) is introduced behind the same service interface — no API change |

`[ASSUMPTION A-45]` A synonym dictionary mapping textile terminology ("panna"/"width", "patti", "butta", "RFD") improves recall materially. Terms will be gathered from the company during Phase 1.

---


# 15. Notification System

## 15.1 Architecture

An event-driven engine. Business modules publish domain events; the notification service resolves subscribers, applies preferences and quiet hours, renders templates per channel, and dispatches through pluggable providers with retry. **A notification failure never affects the business transaction** (BR-162) — publication is asynchronous and outside the transaction boundary.

```
Domain event ─> Event bus ─> Subscriber resolution ─> Preference filter
   ─> Quiet-hours / digest batching ─> Template render ─> Channel dispatch
   ─> Delivery tracking ─> Retry with backoff ─> Escalation on failure
```

## 15.2 Channels

| Channel | Phase | Use | Constraints |
|---|---|---|---|
| **In-app** | 1 | All notifications; the authoritative record | Bell with unread count; notification centre; never lost |
| **Email** | 1 | Approvals, rejections, escalations, reports, security | Requires SMTP (A-12); HTML + plain-text alternative |
| **WhatsApp** | 2 (manual) / 5 (API) | Buyer design cards, order status, payment reminders | Business API requires approved templates and per-message cost (A-31) |
| **SMS** | 5 | Critical alerts only, where email is impractical | Per-message cost; 160-character discipline |
| **Push (web)** | 5 | Approval requests, floor alerts | Requires user opt-in via the browser |
| **Push (mobile)** | 5 | Same as web, on the mobile app | Requires the mobile app |
| **Shop-floor display** | 3 | Job card issued, quality hold, downtime alert | Wall-mounted screens; no personal data displayed |

## 15.3 Event Catalogue

| Event | Default recipients | Default channels | Opt-out permitted |
|---|---|---|---|
| `costsheet.submitted` | Assigned approver(s) | In-app, Email | No |
| `costsheet.approved` | Preparer, requesting salesman | In-app, Email | Yes |
| `costsheet.rejected` | Preparer | In-app, Email | No |
| `costsheet.approval_overdue` | Approver | In-app, Email | No |
| `costsheet.approval_escalated` | Approver's manager | Email | No |
| `material.rate_changed` | Costing team | In-app (daily digest) | Yes |
| `material.stale_rate_used` | Preparer | In-app inline | Yes |
| `design.shared` | Sharer (confirmation) | In-app | Yes |
| `jobcard.issued` | Operator, supervisor | In-app, Floor display | No |
| `jobcard.completed` | Planner | In-app | Yes |
| `production.variance_exceeded` | Planner, costing manager | In-app, Email | Yes |
| `production.loom_down` | Planner, maintenance | In-app, Email, Floor display | No |
| `inventory.below_reorder` | Store keeper, purchase | In-app, Email (daily) | Yes |
| `quality.hold_placed` | Production manager, sales | In-app, Email | No |
| `sales.credit_limit_breach` | Sales, finance, management | In-app, Email | No |
| `sales.payment_overdue` | Customer, salesman | Email, WhatsApp | Customer: yes |
| `system.backup_failed` | Administrator | Email, SMS | No |
| `system.restore_performed` | Administrator, management | Email | No |
| `security.account_locked` | Administrator, affected user | Email | No |
| `security.permission_changed` | Administrator | Email | No |
| `report.scheduled_ready` | Subscribers | Email | Yes |

## 15.4 Escalation Logic

```
Event requiring action
   │
   ├─ t = 0            notify primary recipient
   ├─ t = SLA          reminder to primary recipient          (e.g. 24h for approvals)
   ├─ t = SLA × 1.5    notify delegate if configured
   ├─ t = SLA × 2      escalate to the recipient's manager
   └─ t = SLA × 3      escalate to management, flag on dashboard
```

Escalation stops immediately when the action is taken. Every escalation step is recorded. SLAs are configurable per event type. Escalation never fires outside working hours unless the event severity is Critical.

## 15.5 Reminder Logic

| Reminder | Schedule | Recipients |
|---|---|---|
| Pending approvals digest | Daily 09:00 | Approvers with open items |
| Draft sheets untouched > 7 days | Weekly Monday | Preparer |
| Rejected sheets not revised > 3 days | Every 3 days | Preparer |
| Orders due within 7 days | Daily 08:00 | Planner |
| Payments due in 3 days / overdue | Daily 10:00 | Customer, salesman |
| Job work material pending > lead time | Weekly | Planner, job work party |
| Maintenance due within 7 days | Weekly | Maintenance |
| Stale rate review | Monthly | Purchase, costing manager |

## 15.6 User Preferences

Per user, per event category: channel selection (in-app always on and non-disableable), immediate versus digest, digest frequency (daily/weekly) and delivery time, quiet hours (default 21:00–07:00, suppressing non-critical notifications), and a global "pause all non-critical" switch with an expiry date.

**Non-suppressible categories:** approval-required, security, and system-critical events. A user may choose the channel but not silence them entirely (BR-163).

## 15.7 Templates & Content Rules

Templates are stored as data, versioned, and editable by an Administrator with a preview. Merge fields are validated at save time so a malformed template cannot reach a recipient.

Content rules:
- **Permission-aware rendering (BR-164):** a notification never discloses a value the recipient could not see in the application. Cost figures are omitted from notifications to roles without cost visibility.
- Subject lines lead with the action required, not the system name.
- Every actionable notification carries a deep link to the exact record.
- Plain-text alternatives are mandatory for email.
- Localisation per the recipient's locale (en-IN, gu-IN, hi-IN).

## 15.8 Delivery Tracking & Reliability

| Concern | Approach |
|---|---|
| Queue | Durable queue; notifications survive a service restart |
| Retry | Exponential backoff: 1 min, 5 min, 15 min, 1 h, 4 h; six attempts total |
| Dead letter | After final failure, moved to a dead-letter queue and an operational alert raised |
| Delivery status | Queued / Sent / Delivered / Failed / Bounced, per recipient per channel |
| Bounce handling | Hard bounces mark the address invalid and notify the Administrator |
| Audit | Every dispatch and its outcome recorded |
| Deduplication | Identical event + recipient + channel within 60 seconds is collapsed |

---


# 16. File Management

## 16.1 Supported Formats

| Category | Formats | Max size | Notes |
|---|---|---|---|
| Fabric images | JPG, PNG, WEBP, HEIC→JPG on upload | 20 MB | Derivatives generated automatically |
| Documents | PDF | 25 MB | Certificates, TDS, buyer specifications |
| Spreadsheets | XLSX, CSV | 10 MB | Import only; 10,000-row cap |
| Design pattern files | JC5, DAT, EP, CDR, AI | 50 MB | Stored and versioned; **not parsed or rendered** (out of scope, Section 2.5.3) |
| Company branding | PNG, SVG | 2 MB | Logo for printed documents |
| Lab reports | PDF, JPG | 25 MB | Phase 6 |
| Signatures | PNG (transparent) | 500 KB | Approval blocks on printed documents |

**Explicitly rejected:** executables, archives containing executables, macro-enabled Office formats (`.xlsm`, `.docm`), and any file whose magic bytes contradict its extension.

## 16.2 Upload

| Aspect | Specification |
|---|---|
| Methods | Drag-and-drop zone, file picker, paste from clipboard, camera capture on mobile/tablet |
| Multi-file | Up to 20 files per operation with individual progress and individual failure |
| Validation order | Extension → declared MIME → **magic bytes** → size → virus scan → dimension/page checks |
| Chunking | Files over 5 MB upload in chunks with resume support on network interruption |
| Progress | Per-file percentage, cancellable; a failure on one file never aborts the others |
| Processing | Asynchronous derivative generation; the record is usable immediately with a "processing" placeholder |
| EXIF | Stripped on upload (privacy: fabric photographs taken on personal phones carry GPS coordinates) |
| Deduplication | SHA-256 checksum; an identical file already stored is referenced rather than duplicated |
| Naming | Original filename retained as metadata; storage key is a generated UUID path — user-supplied names never touch the filesystem |

## 16.3 Download

| Aspect | Specification |
|---|---|
| Access | Signed, time-limited URLs (15-minute expiry); direct object access denied |
| Authorisation | Every download re-checks permission at request time, not only at link generation |
| Single file | Original or a named derivative size |
| Bulk | ZIP generated asynchronously with a notification when ready |
| Content-Disposition | `attachment` with the original filename sanitised |
| Audit | Downloads of commercially sensitive documents (cost sheet PDFs, price lists) are audited |
| Bandwidth | Large downloads streamed, never buffered in application memory |

## 16.4 Preview

| Type | Preview |
|---|---|
| Images | Inline thumbnail; lightbox with zoom, pan, rotate, and a metadata overlay (design, date, uploader) |
| PDF | Embedded viewer with page navigation; no download required to read |
| Excel/CSV | First 100 rows rendered as a table |
| Pattern files | Icon and metadata only — no rendering; a clear message explains that pattern files are stored for reference and must be opened in the CAD system |
| Unsupported | Icon, filename, size, and a download action |

## 16.5 Versioning

| Aspect | Specification |
|---|---|
| Model | Replacing a file creates a new version; prior versions are retained |
| Retention | Last 10 versions per file, or all versions within `file_retention_days`, whichever is greater |
| Access | Version history listing with uploader, timestamp, size and a restore action |
| Restore | Restoring an old version creates a new version whose content matches the old one — history is never rewritten |
| Primary image | Changing which image is primary is versioned metadata, not a file version |
| Audit | Upload, replace, restore and delete are all audited |

## 16.6 Permissions

| Operation | Rule |
|---|---|
| Upload | Requires write permission on the parent entity |
| View | Requires read permission on the parent entity |
| Download | Same as view, plus audit for sensitive documents |
| Replace | Requires write permission on the parent entity |
| Delete | Requires delete permission; soft delete only |
| Share externally | Requires the entity's share permission **and** `shareable = true` on the entity (BR-105) |
| Portal access | External users see only files attached to their own records, via signed URLs with shorter expiry |

## 16.7 Storage Architecture

| Concern | Approach |
|---|---|
| Backend | S3-compatible object storage — MinIO for on-premise, S3 for cloud; identical application interface |
| Structure | `{companyId}/{entityType}/{entityId}/{fileId}/{derivative}.{ext}` |
| Database | Metadata only: key, original name, MIME type, size, checksum, scan status, dimensions, uploader, timestamps (BR-99) |
| Derivatives | thumbnail 200 px, medium 800 px, large 1600 px, original preserved |
| CDN | Optional signed-URL CDN for cloud deployments |
| Lifecycle | Soft-deleted objects purged after `file_retention_days` (default 90); versions beyond retention archived to cold storage |
| Backup | Object store replicated per M17; backup includes files, not only the database |
| Quota | Per-company storage quota with warnings at 80% and 95% |
| Integrity | Checksums verified on write and periodically thereafter; mismatches raise an operational alert |


---


# 17. Business Rules

This section consolidates every rule stated in Section 4 into a single authoritative register, plus additional cross-cutting rules (BR-168 onward) that belong to no single module. Each rule is testable and carries an owning module.

## 17.1 Authentication & Access (BR-01 – BR-11)

| ID | Rule | Module | Severity |
|---|---|---|---|
| BR-01 | Inactive users cannot authenticate regardless of credential validity | M01 | Blocking |
| BR-02 | Passwords stored only as Argon2id hashes; plain text or reversible encryption prohibited | M01 | Blocking |
| BR-03 | Refresh tokens are single-use; reuse revokes the entire token family | M01 | Blocking |
| BR-04 | All authentication events written to audit | M01 | Blocking |
| BR-05 | Unknown-email and wrong-password errors are identical | M01 | Blocking |
| BR-06 | At least one active Administrator must always exist | M02 | Blocking |
| BR-07 | A user cannot modify their own role or permission overrides | M02 | Blocking |
| BR-08 | A user cannot deactivate their own account | M02 | Blocking |
| BR-09 | Email is unique across all users, active or inactive | M02 | Blocking |
| BR-10 | Users are never hard-deleted where references exist; deactivate only | M02 | Blocking |
| BR-11 | Permission changes take effect at next token refresh or on forced logout | M02 | Informational |

## 17.2 Settings & Constants (BR-12 – BR-16)

| ID | Rule | Module | Severity |
|---|---|---|---|
| BR-12 | Non-retroactive constants are snapshotted per cost sheet at creation | M03 | **Critical** |
| BR-13 | Calculation constant changes require a reason ≥ 10 characters | M03 | Blocking |
| BR-14 | Display-only settings apply immediately everywhere | M03 | Informational |
| BR-15 | `internal_precision` may never fall below 12 | M03 | Blocking |
| BR-16 | Only `settings.manage` holders may write settings | M03 | Blocking |

## 17.3 Master Data (BR-17 – BR-23)

| ID | Rule | Module | Severity |
|---|---|---|---|
| BR-17 | Codes are unique per master, case-insensitive, immutable after first transactional use | M04 | Blocking |
| BR-18 | Referenced master records cannot be hard-deleted; deactivate only | M04 | Blocking |
| BR-19 | Deactivation never alters any existing document | M04 | **Critical** |
| BR-20 | Imports are all-or-nothing; no partial commit | M04 | Blocking |
| BR-21 | GSTIN, where present, must match the structural format and be unique among active parties | M04 | Blocking |
| BR-22 | Loom capability fields are conditionally mandatory per shedding and loom type | M04 | Blocking |
| BR-23 | A beam with status On Loom must carry a loom reference | M04 | Blocking |

## 17.4 Materials & Rates (BR-24 – BR-30)

| ID | Rule | Module | Severity |
|---|---|---|---|
| BR-24 | **Denier and rate are copied by value into cost sheet lines; master changes never alter existing sheets** | M05 | **Critical** |
| BR-25 | Every rate change writes a history row with a mandatory reason (≥ 5 chars) | M05 | Blocking |
| BR-26 | Rate may not be negative; zero is permitted but warns | M05 | Blocking |
| BR-27 | `material_code` is immutable once used in a cost sheet | M05 | Blocking |
| BR-28 | Deactivation removes a material from selection lists only | M05 | Informational |
| BR-29 | Only `master.yarn.update` holders may change master rates | M05 | Blocking |
| BR-30 | Line-level overrides require `costsheet.override_rate`, are flagged, printed and audited | M05 | Blocking |

## 17.5 Cost Sheet Identity & Lifecycle (BR-31 – BR-37, BR-62 – BR-68)

| ID | Rule | Module | Severity |
|---|---|---|---|
| BR-31 | Identity is `design_number + version`, unique together | M06 | Blocking |
| BR-32 | `design_number` is immutable after first save | M06 | Blocking |
| BR-33 | Constants snapshot is taken at creation and never refreshed | M06 | **Critical** |
| BR-34 | Only the creator or `costsheet.edit_any` may edit a Draft | M06 | Blocking |
| BR-35 | Approved and Archived sheets are read-only for all roles including Admin | M06 | **Critical** |
| BR-36 | `costing_date` may not be in the future | M06 | Blocking |
| BR-37 | Deletion permitted only in Draft, soft only, audited | M06 | Blocking |
| BR-62 | An Approved cost sheet is immutable; only Archive, Print/Export and New Version are permitted | M11 | **Critical** |
| BR-63 | Approver must differ from preparer unless self-approval is enabled | M11 | Blocking |
| BR-64 | Rejection remarks are mandatory, ≥ 10 characters | M11 | Blocking |
| BR-65 | Approving version N archives an existing Approved version N−1 | M11 | Blocking |
| BR-66 | Version numbers strictly increase and are never reused | M11 | Blocking |
| BR-67 | Every state transition writes an audit record | M11 | Blocking |
| BR-68 | A sheet cannot be submitted with zero material lines | M11 | Blocking |

## 17.6 Calculation (BR-38 – BR-61)

| ID | Rule | Module | Severity |
|---|---|---|---|
| BR-38 | A row participates in calculation if it has a material or any non-zero numeric value | M07/M08 | Blocking |
| BR-39 | Missing rate, zero rate or missing denier warns, never blocks | M07/M08 | Warning |
| BR-40 | Negative values in ends, denier, length, picks, panna or rate are rejected | M07/M08 | Blocking |
| BR-41 | Recalculation always uses the header's constants snapshot, not live settings | M07/M08 | **Critical** |
| BR-42 | A section may legitimately contain zero material lines | M07/M08 | Informational |
| BR-43 | Warp rules apply identically to weft | M08 | Blocking |
| BR-44 | Panna is required for a material weft row; zero panna warns | M08 | Warning |
| BR-45 | Weft total picks carries forward to the job card | M08 | Informational |
| BR-46 | Wastage default is copied at creation and not refreshed | M09 | Blocking |
| BR-47 | Wastage above threshold warns and requires acknowledgement | M09 | Warning |
| BR-48 | Zero-quantity charge rows are retained and printed | M09 | Blocking |
| BR-49 | Charge names need not be unique within a sheet | M09 | Informational |
| BR-50 | Default charge rows apply to new sheets only | M09 | Blocking |
| BR-51 | Card divisor is configurable and snapshotted; the literal 39.37 appears nowhere in code | M09 | **Critical** |
| BR-52 | Card cost is **not** rounded before the final sum | M09 | **Critical** |
| BR-53 | With no markup or override, Sale Rate equals Final Cost exactly | M09 | **Critical** |
| BR-54 | The pricing block never alters any workbook-equivalent figure | M09 | **Critical** |
| BR-55 | Sale below cost triggers the configured WARN / BLOCK / ALLOW behaviour | M09 | Configurable |
| BR-56 | Division by zero in margin returns 0 and displays a dash | M09 | Blocking |
| BR-57 | Float arithmetic on monetary values is prohibited | M10 | **Critical** |
| BR-58 | Monetary values cross the API as strings | M10 | **Critical** |
| BR-59 | No FLOAT/REAL/DOUBLE PRECISION column exists in the schema | M10 | **Critical** |
| BR-60 | The engine reads constants only from its input | M10 | Blocking |
| BR-61 | Engine changes require the full golden-file suite to pass unmodified | M10 | **Critical** |

## 17.7 Documents, Reporting & Audit (BR-69 – BR-91)

| ID | Rule | Severity |
|---|---|---|
| BR-69 | Draft and Rejected sheets print with a watermark | Blocking |
| BR-70 | Exports perform no arithmetic; they reflect stored values | Blocking |
| BR-71 | Excel exports carry full precision in hidden columns | Blocking |
| BR-72 | Imports are transactional and previewed | Blocking |
| BR-73 | Import files retained for the configured period | Informational |
| BR-74 | Legacy report engines (RDLC, Crystal, Jasper, FastReport) are not supported | Design decision |
| BR-75 | Reports are read-only | Blocking |
| BR-76 | Aggregate at stored precision, then round for display | **Critical** |
| BR-77 | Reports respect the caller's row-level scope, including in exports | **Critical** |
| BR-78 | Reports over 5,000 rows are generated asynchronously | Informational |
| BR-79 | Audit writes participate in the business transaction; audit failure rolls back the change | **Critical** |
| BR-80 | No user may edit or delete an audit record through the application | **Critical** |
| BR-81 | Secrets are never written to audit | **Critical** |
| BR-82 | Audit records survive deletion of the entity they describe | Blocking |
| BR-83 | Widgets respect permission and scope; unpermitted widgets are absent, not disabled | Blocking |
| BR-84 | Dashboard queries must not degrade transactional performance | Blocking |
| BR-85 | Every KPI is drillable to source records | Blocking |
| BR-86 | Search filters by permission before returning; counts never leak | **Critical** |
| BR-87 | Search returns within 2 seconds at target volumes | Performance |
| BR-88 | Search is read-only | Blocking |
| BR-89 | An untested backup is not a backup; weekly verification is mandatory | **Critical** |
| BR-90 | Production restore requires two authorisers and is audited | **Critical** |
| BR-91 | Backups are encrypted with keys stored separately | **Critical** |

## 17.8 Design, Feeder & Files (BR-92 – BR-107)

| ID | Rule | Severity |
|---|---|---|
| BR-92 | Design number unique, case-insensitive | Blocking |
| BR-93 | Referenced designs cannot be hard-deleted | Blocking |
| BR-94 | Auto-saved drafts are per-user and cleared on successful save | Informational |
| BR-95 | Feeder numbers are unique per design and contiguous from 1 | Blocking |
| BR-96 | Deleting a design cascades to feeders; deleting a feeder renumbers the rest | Blocking |
| BR-97 | A feeder requires either a colour reference or a colour name | Blocking |
| BR-98 | Feeder count capped per design; job card prints FDR-1..10 with continuation | Blocking |
| BR-99 | Files live in object storage; the database holds metadata only | Blocking |
| BR-100 | Every upload is virus-scanned before becoming retrievable | **Critical** |
| BR-101 | File deletion is soft, with a retention period before purge | Blocking |
| BR-102 | File URLs are signed and time-limited | **Critical** |
| BR-103 | Externally shared content never contains cost, rate or margin data | **Critical** |
| BR-104 | Every external share is audited | Blocking |
| BR-105 | Only designs flagged shareable may be shared externally | Blocking |
| BR-106 | Comparison is read-only | Blocking |
| BR-107 | Similarity scoring is advisory and must be labelled | Informational |

## 17.9 Production, Inventory, Sales & Quality (BR-108 – BR-158)

| ID | Rule | Severity |
|---|---|---|
| BR-108 | Production orders may reference only Approved cost sheets | **Critical** |
| BR-109 | Planned quantity must exceed zero | Blocking |
| BR-110 | An order with recorded production cannot be cancelled, only short-closed | Blocking |
| BR-111 | Design or costing reference cannot change after release | Blocking |
| BR-112 | Loom compatibility failures cannot be overridden by any role | **Critical** |
| BR-113 | Loom allocations may not overlap | Blocking |
| BR-114 | Reallocating in-progress work requires a reason and notifies the supervisor | Blocking |
| BR-115 | A beam serves one loom at a time | Blocking |
| BR-116 | Warp length planned includes the wastage allowance | Blocking |
| BR-117 | A beam cannot be On Loom without a loom allocation | Blocking |
| BR-118 | Voucher numbers are unique and never reused | Blocking |
| BR-119 | Job cards issue only for released orders with a valid allocation | Blocking |
| BR-120 | Feeder values are copied by value at job card generation | **Critical** |
| BR-121 | Issued job cards are immutable; correction is cancel-and-reissue | Blocking |
| BR-122 | Reprints are counted and marked | Blocking |
| BR-123 | Job cards display no rate, cost or margin | **Critical** |
| BR-124 | Production is recorded only against an issued job card | Blocking |
| BR-125 | Overproduction beyond tolerance requires supervisor authorisation | Blocking |
| BR-126 | Shift downtime cannot exceed shift duration | Blocking |
| BR-127 | Entries beyond the lock window need supervisor correction with a reason | Blocking |
| BR-128 | Planned consumption derives from the approved cost sheet snapshot | **Critical** |
| BR-129 | Consumption variance beyond threshold raises an exception | Warning |
| BR-130 | The system suggests wastage revisions but never alters a cost sheet automatically | **Critical** |
| BR-131 | Performance data visible to the individual, supervisor and management only | Blocking |
| BR-132 | Non-attributable downtime is excluded from operator efficiency | Blocking |
| BR-133 | Performance data is not a sole basis for disciplinary action; reports state this | Policy |
| BR-134 | Negative stock is prohibited | **Critical** |
| BR-135 | Every stock movement carries a document reference | Blocking |
| BR-136 | Roll identity is immutable; splits create parented children | Blocking |
| BR-137 | Valuation method cannot change mid-financial-year | Blocking |
| BR-138 | Roll and beam identifiers are never reused | Blocking |
| BR-139 | Scan transactions record device, user, time and location | Blocking |
| BR-140 | Genealogy must be reconstructible within retention | Blocking |
| BR-141 | Quotation lines price only from Approved cost sheets | **Critical** |
| BR-142 | Order confirmation blocked above credit limit without audited override | Blocking |
| BR-143 | Dispatch reserves then consumes specific roll identities | Blocking |
| BR-144 | Issued invoices cannot be edited; credit note required | **Critical** |
| BR-145 | Ageing computed from invoice date and credit days | Blocking |
| BR-146 | Job work shortage = sent − received − agreed wastage; beyond threshold requires explanation | Blocking |
| BR-147 | A job work party sees only its own challans | **Critical** |
| BR-148 | Material on job work remains company stock | Blocking |
| BR-149 | Portal queries are scope-filtered server-side | **Critical** |
| BR-150 | Portals expose no cost, margin, internal design number or other customer's data | **Critical** |
| BR-151 | Portal sessions have independent, shorter timeouts | Blocking |
| BR-152 | Grade is system-computed; override requires authorisation and a reason | Blocking |
| BR-153 | A roll on hold cannot be dispatched | **Critical** |
| BR-154 | Verified inspections are immutable; correction is re-inspection | Blocking |
| BR-155 | Defect points capped at 4 per linear yard | Blocking |
| BR-156 | IoT ingestion is read-only; the system never writes to loom controllers | **Critical** |
| BR-157 | Telemetry gaps are shown as gaps, never interpolated | **Critical** |
| BR-158 | Manual entry is authoritative where telemetry conflicts, until reconciled | Blocking |

## 17.10 AI, Notifications & Integration (BR-159 – BR-167)

| ID | Rule | Severity |
|---|---|---|
| BR-159 | AI outputs are advisory; no AI output automatically alters a cost sheet, price or production instruction | **Critical** |
| BR-160 | Every AI suggestion displays its basis and confidence | Blocking |
| BR-161 | Model training data and versions are recorded | Blocking |
| BR-162 | Notification failure never blocks a business transaction | **Critical** |
| BR-163 | Approval-required and security notifications cannot be silenced | Blocking |
| BR-164 | Notification content respects the recipient's permissions | **Critical** |
| BR-165 | Integrations are idempotent | **Critical** |
| BR-166 | Every integration message is logged with payload, status and retry count | Blocking |
| BR-167 | Integration failures alert; data is never silently discarded | **Critical** |

## 17.11 Cross-Cutting Rules (BR-168 – BR-180)

| ID | Rule | Severity |
|---|---|---|
| BR-168 | Every mutating operation records actor, timestamp and correlation ID | **Critical** |
| BR-169 | Soft-deleted records are excluded from all default queries but remain in audit and referenced documents | Blocking |
| BR-170 | Optimistic concurrency applies to every editable entity; silent overwrite is never permitted | **Critical** |
| BR-171 | All timestamps are stored UTC and displayed in the user's timezone | Blocking |
| BR-172 | All monetary display honours the configured currency symbol and precision | Blocking |
| BR-173 | Any operation that could take more than 5 seconds runs asynchronously with progress feedback | Blocking |
| BR-174 | No business data is deleted by a retention policy; it is archived | **Critical** |
| BR-175 | Every document that leaves the system (print, PDF, share, export) is audited | Blocking |
| BR-176 | A user's own actions are always visible to them in their activity view | Blocking |
| BR-177 | Every list respecting scope shows a scope indicator so a user knows the view is filtered | Informational |
| BR-178 | Where a rule is configurable, the current configuration is discoverable in the UI, not hidden in code | Blocking |
| BR-179 | System-generated numbers (voucher, order, invoice) use gapless configurable series and are never reused | Blocking |
| BR-180 | Any override of a system decision requires a stated reason, which is stored and printed where relevant | **Critical** |

---


# 18. Validation Rules

## 18.1 Validation Philosophy

Three tiers, applied in order. **Client validation is a convenience; server validation is the contract; database constraints are the guarantee.** No rule exists only at one tier where data integrity depends on it.

| Tier | Purpose | Failure mode |
|---|---|---|
| Client (Zod schemas, shared with the server) | Immediate feedback, reduce round trips | Inline field message |
| Server (same Zod schemas + business rules) | Authoritative enforcement | 400 or 422 with structured `details` |
| Database (CHECK, UNIQUE, FK, triggers) | Last-resort integrity | Constraint violation mapped to a friendly error |

**Blocking vs warning.** A *blocking* validation prevents save or submit. A *warning* is displayed, may require acknowledgement, and permits the action. The workbook tolerates incomplete rows, so incompleteness warns rather than blocks (BR-39).

## 18.2 Required Fields by Entity

| Entity | Required | Conditionally required |
|---|---|---|
| User | name, email, role | employee_code (if HR integration enabled) |
| Material | material_code, material_name, denier, rate_incl_gst, rate_unit | reason (on rate change) |
| Item | item_code, item_name, category, uom | hsn_code (if billable) |
| Party | party_code, party_name, party_type, address_line1, city, state | gstin (if registered); phone or email (at least one) |
| Loom | loom_code, loom_type, shedding_type, reed_width_inch, status | no_of_feeds (Rapier/AirJet); dobby_frames (Dobby); jacquard_hooks (Jacquard) |
| Beam | beam_no, beam_type, barrel_width_inch, current_status | current_loom_id (when status = On Loom) |
| Colour | colour_code, colour_name | hex_value (to render a swatch) |
| Cost Sheet Header | design_number, costing_date, unit_basis | customer_id (if configured required) |
| Warp Line | — (blank rows permitted) | ends, denier, length, rate — all required once a material is selected |
| Weft Line | — | picks, denier, length, panna, rate — required once a material is selected |
| Process Charge | charge_name | rate and quantity (both, if either supplied) |
| Design | design_number | — |
| Feeder | feeder_number, and one of colour_id / colour_name | — |
| Production Order | production_order_no, design_id, costsheet_id, planned_quantity, required_by_date | — |
| Job Card | voucher_no, production_order_id, loom_id | operator_name (at issue) |

## 18.3 Number Format Validation

| Field class | Type | Min | Max | Decimals | On violation |
|---|---|---|---|---|---|
| Ends | Decimal | 0 | 1,000,000 | 4 | Block |
| Picks per inch | Decimal | 0 | 10,000 | 4 | Block |
| Denier | Decimal | 0 (master: > 0) | 100,000 | 4 | Block |
| Length (metre) | Decimal | 0 | 1,000,000 | 4 | Block |
| Panna (inch) | Decimal | 0 | 1,000 | 4 | Block |
| Rate per KG | Decimal | 0 | 9,999,999 | 6 | Block |
| Wastage % | Decimal | 0 | 100 | 4 | Block (> threshold: warn) |
| Markup % | Decimal | −100 | 1,000 | 4 | Block |
| Number of cards | Decimal | 0 | 1,000,000 | 6 | Block |
| Card rate | Decimal | 0 | 999,999 | 6 | Block |
| Charge rate / quantity | Decimal | 0 | 9,999,999 | 6 | Block |
| Commission % | Decimal | 0 | 100 | 2 | Block |
| Credit limit | Decimal | 0 | 999,999,999 | 2 | Block |
| Reed width (inch) | Decimal | 1 | 600 | 2 | Block |
| Jacquard hooks | Integer | 1 | 30,000 | 0 | Block |
| Dobby frames | Integer | 1 | 40 | 0 | Block |
| No. of feeds | Integer | 1 | 32 | 0 | Block |
| Feeder number | Integer | 1 | 32 | 0 | Block |
| Pieces | Integer | 1 | 100,000 | 0 | Block |
| Quantity basis | Decimal | > 0 | 1,000,000 | 4 | Block |

Universal numeric rules: thousand separators accepted on input and stripped; leading `+` accepted; scientific notation rejected; a lone `-` or `.` rejected; empty treated as zero in calculations but distinguished from zero in the UI (an untouched cell renders blank, an entered zero renders `0`).

## 18.4 Text & Format Validation

| Field | Rule |
|---|---|
| Email | RFC 5322 subset; ≤ 254 chars; lowercased; MX check optional |
| Phone | 7–15 digits, optional leading `+`, separators stripped |
| GSTIN | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`, with checksum digit verification |
| PAN | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` |
| Pincode (India) | Exactly 6 digits, not starting with 0 |
| HSN | 4, 6 or 8 digits |
| Hex colour | `^#[0-9A-Fa-f]{6}$` |
| Design number | 1–50 chars, `[A-Za-z0-9\-_/ ]`, trimmed, no consecutive spaces |
| Codes (all masters) | 1–30 chars, `[A-Za-z0-9\-_]`, uppercase-normalised |
| Names | 2–200 chars; leading/trailing whitespace trimmed; control characters rejected |
| Notes / remarks | ≤ 2,000 chars; HTML stripped; emoji permitted |
| Reasons | ≥ 5 chars (rate change), ≥ 10 chars (rejection, constant change) |
| Passwords | Per Section 11.3 |
| URLs | `https` only for externally rendered links |
| File names | Sanitised; path separators and null bytes rejected |

## 18.5 Date Validation

| Field | Rule |
|---|---|
| Costing date | Not in the future; not more than `backdate_limit_days` (default 90) in the past without authorisation `[A-46]` |
| Effective from (rate) | Not more than 30 days in the future |
| Required-by date | Not in the past at creation |
| Production entry date | Within the last `production_entry_lock_days` unless supervisor-authorised |
| Delegation range | Start ≤ end; end not more than 90 days ahead |
| Tax effective range | `effective_to` > `effective_from`; no overlapping ranges for the same tax and HSN |
| Report date range | Start ≤ end; span capped at 5 years for interactive runs |
| Any date | Valid calendar date; leap years handled; timezone-aware comparison against the user's local date, not UTC midnight |

`[ASSUMPTION A-46]` A backdating limit prevents accidental entry of a wrong year, which is a common data-entry error, while allowing genuine catch-up entry.

## 18.6 Duplicate Prevention

| Entity | Exact-match rule | Fuzzy detection |
|---|---|---|
| User | Email unique (case-insensitive) | Name similarity ≥ 0.9 warns |
| Material | Code unique | Name trigram ≥ 0.85 warns with candidates |
| Item | Code unique | Name similarity warns |
| Party | Code unique; GSTIN unique where present | Name similarity ≥ 0.85 warns |
| Design | Design number unique (case-insensitive) | Similar number warns ("DN-1042" vs "DN1042") |
| Cost Sheet | (design_number, version) unique | Same design costed within 24 hours warns |
| Loom / Beam / Broker / Salesman / Colour | Code unique | Name similarity warns |
| Voucher / Order / Invoice numbers | Unique, gapless series, never reused | — |
| Import files | Duplicate keys within one file reject the whole file | — |
| Files | SHA-256 checksum deduplication | — |

Fuzzy detection never blocks. It presents candidates and requires explicit confirmation, because legitimate near-duplicates exist ("PV 150/48 Bright" and "PV 150/48 Dull").

## 18.7 Cross-Field Validation

| Rule | Entities | Behaviour |
|---|---|---|
| Material selected ⇒ denier and rate must be present | Warp/weft line | Block on submit, warn on save |
| Material weft line ⇒ panna required | Weft line | Warn (zero panna yields zero cost) |
| Sale rate < final cost | Cost sheet | Configurable WARN / BLOCK / ALLOW |
| Markup and manual sale rate both supplied | Cost sheet | Manual override wins; a notice explains the precedence |
| Wastage > threshold | Cost sheet | Warn, acknowledgement required |
| Submit ⇒ at least one material line | Cost sheet | Block |
| Approve ⇒ approver ≠ preparer | Cost sheet | Block unless configured otherwise |
| Beam status On Loom ⇒ loom reference present | Beam | Block |
| Shedding = Jacquard ⇒ hooks present | Loom | Block |
| Shedding = Dobby ⇒ frames present | Loom | Block |
| Loom type = WaterJet ⇒ all yarns hydrophobic | Allocation | Block |
| Fabric width ≤ loom reed width | Allocation | Block |
| Distinct weft colours ≤ loom feeds | Allocation | Block |
| Allocation period non-overlapping per loom | Allocation | Block |
| Shift downtime ≤ shift duration | Production entry | Block |
| Cumulative production ≤ plan × (1 + tolerance) | Production entry | Block without authorisation |
| Issue quantity ≤ available stock | Stock movement | Block |
| Order value ≤ remaining credit | Sales order | Block without authorised override |
| Quotation line ⇒ referenced cost sheet is Approved | Quotation | Block |
| Roll on hold ⇒ cannot dispatch | Dispatch | Block |
| Tax effective ranges non-overlapping | Tax master | Block |
| Reporting-to chain acyclic | Salesman | Block |
| Feeder ⇒ colour reference or colour name | Feeder | Block |

## 18.8 Maximum & Minimum Limits

| Limit | Value | Rationale |
|---|---|---|
| Warp lines per sheet | 100 | Practical ceiling; grid performance |
| Weft lines per sheet | 100 | Same |
| Process charge rows | 50 | Same |
| Feeders per design | 32 | Loom capability ceiling (A-29) |
| Images per design | 20 | Storage and page weight |
| Versions per design number | 999 | Practical ceiling; warns at 100 |
| Import rows per file | 10,000 | Transaction size and preview usability |
| Upload size | 20 MB image / 25 MB PDF / 50 MB pattern file | Storage and scan time |
| Bulk selection | 500 records | Transaction duration |
| Report rows (interactive) | 5,000 | Beyond this, queue asynchronously |
| Report date span (interactive) | 5 years | Query performance |
| Saved views per user per module | 25 | UI usability |
| Concurrent sessions per user | 10 | Security and resource use |
| API page size | 100 | Response size |
| Search query length | 200 chars | Abuse prevention |
| Notes / remarks | 2,000 chars | Storage and UI |
| Password | 10–128 chars | Security and hashing cost |

## 18.9 Validation Message Standards

Messages state **what is wrong**, **why**, and **what to do** — in that order, in plain language, without jargon or error codes in the primary text.

| Poor | Required |
|---|---|
| "Invalid input" | "Ends cannot be negative. Enter 0 or a positive number." |
| "Error 422" | "This cost sheet is already approved and cannot be changed. Create a new version to make changes." |
| "Constraint violation" | "Material code PV150 already exists. Codes must be unique — try PV150-B." |
| "Field required" | "Select a yarn before entering ends and length." |
| "Value out of range" | "Wastage of 40% is unusually high (typical is under 25%). Confirm to continue." |
| "FK violation" | "This yarn is used in 47 cost sheets and cannot be deleted. You can deactivate it instead." |

Additional standards: messages appear adjacent to the offending field; a submit failure also renders a summary banner with anchor links; messages are localised; error codes appear in a secondary line for support purposes; warnings are visually distinct from errors and state that the action may proceed.


---


# 19. Error Handling

## 19.1 Error Handling Philosophy

Four principles govern every error path in WeaveOne:

1. **Never lose the user's work.** A failed save keeps every entered value on screen. The user retries; they do not re-type.
2. **Say what happened and what to do next.** An error that only reports failure has done half its job.
3. **Fail closed on integrity, fail open on convenience.** A calculation or authorisation doubt blocks. A notification or thumbnail failure degrades quietly.
4. **Every error is traceable.** A correlation ID links what the user saw to what the logs recorded.

## 19.2 Validation Errors

| Aspect | Handling |
|---|---|
| Detection | Client on blur; server on submit; database as backstop |
| Presentation | Inline beneath the field, with the field border in `--danger` and an icon (never colour alone) |
| Multiple errors | Summary banner at the top listing every error as an anchor link; focus moves to the first |
| Persistence | Entered values retained; the form is never cleared |
| Grid cells | Cell-level message on hover/focus; the row is marked; totals recompute excluding the invalid cell but the error is not hidden |
| Warnings | Distinct amber styling with an "acknowledge and continue" affordance |
| Recovery | Correcting the field clears the message immediately without re-submitting |

**Example**

```
Ends
┌─────────────────┐
│ -500            │  ⚠
└─────────────────┘
  Ends cannot be negative. Enter 0 or a positive number.
```

## 19.3 Business Rule Errors

Distinct from validation: the input is well-formed, but the operation is not permitted in the current state.

| Scenario | HTTP | User experience |
|---|---|---|
| Editing an approved sheet | 409 `COSTSHEET_LOCKED` | Modal: "This cost sheet was approved by Sanjay Mehta on 8 Aug 2026 and cannot be changed. Create a new version?" with a **Create New Version** action |
| Self-approval blocked | 403 `SELF_APPROVAL_FORBIDDEN` | Inline notice on the approve button explaining the segregation-of-duties rule and naming who can approve |
| Already actioned by another user | 409 `ALREADY_ACTIONED` | "Meena Patel approved this 4 minutes ago." with a Refresh action |
| Deleting a referenced master | 409 `REFERENCED_RECORD` | Dialog showing the reference count with a **View references** link and a **Deactivate instead** action |
| Loom incompatibility | 422 `LOOM_INCOMPATIBLE` | "Fabric width 60 inch exceeds loom L-12 reed width 54 inch." with **Choose another loom** and **Edit loom master** actions |
| Insufficient stock | 422 `INSUFFICIENT_STOCK` | States available quantity and offers to reduce the issue quantity |
| Credit limit breach | 422 `CREDIT_LIMIT_EXCEEDED` | States limit, outstanding, and this order's value; offers **Request override** |
| Submit with no lines | 422 `NO_MATERIAL_LINES` | Highlights both grids and explains what is needed |

Every business rule error names the rule (e.g. "BR-62") in a secondary line so support can trace it to this document.

## 19.4 System & API Errors

| Class | Detection | Behaviour |
|---|---|---|
| 400 malformed | Schema validation | Field-level detail returned; client maps to the form |
| 401 expired token | Middleware | Silent refresh attempted once; if it fails, the session-expired modal appears and the current form state is preserved in local storage for restoration after re-login |
| 403 forbidden | Middleware | Explains which permission is required and who to ask; never a bare "Forbidden" |
| 404 not found | Handler | "This cost sheet no longer exists or you don't have access." with a route back to the register |
| 409 conflict | Handler | Conflict modal listing the fields another user changed, with **Reload** and (with permission) **Overwrite** |
| 413 too large | Middleware | States the limit and the file's actual size |
| 429 rate limited | Middleware | States when to retry; for exports, suggests scheduling instead |
| 500 unhandled | Global handler | Generic message plus correlation ID; **no stack trace, no SQL, no internal path ever reaches the client**; full detail logged server-side |
| 502/504 gateway | Reverse proxy | Retry with backoff; after three failures, the connectivity banner appears |
| 503 maintenance | Health check | Maintenance page with expected duration |

**Retry policy:** idempotent GETs retry automatically three times with jittered backoff. Non-idempotent writes never auto-retry; the user is offered a retry action, and the `Idempotency-Key` from the original attempt is reused so a duplicate is impossible.

## 19.5 Network Errors

| Scenario | Behaviour |
|---|---|
| Request timeout | 30-second client timeout; message distinguishes "taking longer than expected" from failure; offers retry |
| Connection lost | Persistent offline banner; writes queued where the module supports offline (shop floor); read-only modules show cached data marked as stale with its age |
| Reconnection | Automatic; queued writes replay in order with idempotency keys; a summary reports what synced |
| Partial failure in a batch | Per-item status reported; successful items are not re-sent |
| Slow connection | Progressive rendering; skeletons; a "still loading" message after 5 seconds rather than an indefinite spinner |
| Offline sync conflict | Surfaced to a supervisor for resolution with both versions shown; never silently discarded (BR-167) |

## 19.6 Database Errors

| Error | Mapping | User message |
|---|---|---|
| Unique violation | 409 `DUPLICATE_RECORD` | Names the field and the conflicting value |
| FK violation on delete | 409 `REFERENCED_RECORD` | Reference count and a deactivate alternative |
| FK violation on insert | 400 `INVALID_REFERENCE` | "The selected item no longer exists. Refresh and try again." |
| CHECK violation | 422 | Mapped to the corresponding business rule message |
| Trigger exception (locked document) | 409 `COSTSHEET_LOCKED` | As Section 19.3 |
| Deadlock | Retried automatically up to 3 times with backoff; if still failing, 409 with a retry action | "The system was busy. Please try again." |
| Connection pool exhausted | 503 | "The system is under heavy load. Please retry in a moment." — and an operational alert fires |
| Query timeout | 504 | Suggests narrowing filters or scheduling the report |
| Constraint on audit write | Transaction rollback (BR-79) | The business operation fails; the user is told the change was not saved |

Raw database messages are never surfaced. A mapping layer converts every constraint name to a user-facing message; an unmapped constraint yields the generic message plus a correlation ID and raises an engineering alert, because an unmapped constraint is a defect.

## 19.7 Logging & Observability

| Level | Content | Retention |
|---|---|---|
| ERROR | Unhandled exceptions, integration failures, calculation divergence, audit write failures | 1 year |
| WARN | Business rule violations, rate limiting, retries, slow queries (> 1 s) | 90 days |
| INFO | Authentication events, state transitions, imports, exports, scheduled jobs | 90 days |
| DEBUG | Request/response traces — enabled per-request via a header, never globally in production | 7 days |

Every log line carries: timestamp, level, correlation ID, user ID (never name or email), module, message, and structured context. **Never logged:** passwords, tokens, API keys, full payment details, or full request bodies containing personal data.

**Alerting thresholds:** any calculation divergence (immediate); error rate > 1% over 5 minutes; p95 latency > 3× baseline for 10 minutes; failed backup; failed audit write; integration dead-letter arrival; disk above 80%.

---


# 20. Performance Requirements

## 20.1 Response Time Targets

Measured at the 95th percentile under expected concurrent load, excluding network latency outside the application's control.

| Operation | Target (p95) | Maximum acceptable | Notes |
|---|---|---|---|
| Page shell load (first contentful paint) | 1.0 s | 2.0 s | Cached assets |
| Full page interactive (TTI) | 2.0 s | 3.5 s | |
| Dashboard load | 1.5 s | 2.5 s | 8 widgets, materialised views |
| Cost sheet open (existing) | 1.0 s | 2.0 s | Including all lines |
| **Live recalculation on keystroke** | **50 ms** | **150 ms** | Client-side engine; must feel instantaneous |
| Cost sheet save | 800 ms | 2.0 s | Server recompute + persist + audit |
| Yarn type-ahead response | 200 ms | 500 ms | 2,000 materials |
| Global search | 500 ms | **2.0 s** | SC-05 hard requirement at 100,000 designs |
| Master list load (50 rows) | 500 ms | 1.5 s | |
| Report — interactive (≤ 5,000 rows) | 3.0 s | 10 s | Beyond this, queue |
| PDF generation (single sheet) | 2.0 s | 5.0 s | Server-side |
| Excel export (1,000 rows) | 3.0 s | 8.0 s | |
| Import preview (1,000 rows) | 5.0 s | 15 s | |
| Import commit (1,000 rows) | 8.0 s | 20 s | Single transaction |
| Image upload (5 MB) | 4.0 s | 10 s | Excluding derivative generation |
| Login | 800 ms | 2.0 s | Argon2id is deliberately slow |
| API simple GET | 200 ms | 500 ms | |
| API write | 500 ms | 1.5 s | |
| Shop-floor production entry submit | 500 ms | 2.0 s | Optimistic local write first |

## 20.2 Concurrent User Targets

| Deployment stage | Concurrent users | Peak concurrent | Requests/second |
|---|---|---|---|
| Phase 1 (costing team) | 10 | 25 | 20 |
| Phase 3 (with shop floor) | 40 | 80 | 60 |
| Phase 5 (full ERP + portals) | 100 | 200 | 150 |
| Design target (headroom) | 250 | 500 | 400 |

The system shall degrade gracefully beyond target: queueing rather than erroring, with a visible "system busy" state, and no data loss under load.

## 20.3 Data Volume Targets

Performance targets hold at the Year-5 volumes projected in Section 9.9: 40,000 cost sheets, 500,000 cost sheet lines, 100,000 designs, 900,000 feeders, 1.5 million production entries, and 20 million audit records. Load testing shall be conducted against synthetic data at **1.5× these volumes**.

## 20.4 Caching Strategy

| Layer | What | TTL | Invalidation |
|---|---|---|---|
| Browser | Static assets (hashed filenames) | 1 year | Filename hash change |
| Browser | Settings, permissions, master picklists | Session | On token refresh; on settings write via a version stamp |
| CDN | Static assets, public images | 1 year | Purge on deploy |
| Application (Redis) | Effective permissions per user | 15 min | On role or override change |
| Application (Redis) | Settings per company | 5 min | On settings write |
| Application (Redis) | Master picklists (materials, items, parties) | 10 min | On master write |
| Application (Redis) | Search results per user per query | 60 s | On write to the affected entity type |
| Application (Redis) | Dashboard aggregates | 5 min | Scheduled refresh |
| Database | Materialised views for dashboards and reports | 5 min | Scheduled `REFRESH CONCURRENTLY` |
| Database | Query plan cache, prepared statements | — | PostgreSQL-managed |

**Never cached:** cost sheet content, approval state, stock balances, audit records. These must always be read fresh, because a stale value here causes a wrong business decision.

## 20.5 Pagination

| Context | Approach |
|---|---|
| Lists | Server-side offset pagination with total count; 25 default, 50/100 options |
| Large datasets (audit, stock ledger, production entries) | **Cursor pagination** — offset pagination degrades badly past ~10,000 rows |
| Infinite scroll | Used only on the image gallery, with a "load more" fallback for accessibility |
| Cost sheet lines | Never paginated — the full sheet is always in view |
| Exports | Streamed in chunks; never fully materialised in memory |
| API | `pageSize` capped at 100 |

## 20.6 Lazy Loading

| Asset | Strategy |
|---|---|
| Route bundles | Code-split per route; Phase 2–7 modules never load for a Phase 1 user |
| Charts | Recharts loaded only when a chart enters the viewport |
| PDF viewer | Loaded on first preview |
| Excel library | Loaded on first import or export action |
| Images | `loading="lazy"`, blurred low-quality placeholder, responsive `srcset` |
| Audit timeline | First 50 events, then load-on-scroll |
| Version history | Loaded on tab activation, not with the sheet |
| Master picklists | Fetched on first focus of the selector, then cached |

## 20.7 Optimisation Requirements

| Area | Requirement |
|---|---|
| Bundle size | Initial JS ≤ 250 KB gzipped; total route bundle ≤ 500 KB |
| Database | Every list query must use an index; a sequential scan on a table over 10,000 rows in a hot path is a defect |
| N+1 queries | Prohibited; verified by query-count assertions in integration tests |
| Aggregations | Computed in the database, never by fetching rows and summing in application code |
| Grid rendering | Virtualised beyond 50 rows; no full re-render on a single cell change |
| Calculation debounce | 150 ms on keystroke; immediate on blur |
| Images | WebP with JPEG fallback; derivatives generated once, never on request |
| Compression | Brotli for text responses |
| Connection pooling | PgBouncer in transaction mode; pool sized to CPU cores × 2 + effective spindle count |
| Background jobs | Heavy work (PDF batches, large reports, imports, derivative generation) runs on a worker, never in the request thread |
| Monitoring | `pg_stat_statements` reviewed each sprint; the ten slowest queries triaged |
| Budget enforcement | Performance budgets asserted in CI; a regression beyond 20% fails the build |

---


# 21. Scalability

## 21.1 Design for Growth

The Phase 1 architecture is a well-structured modular monolith, deliberately. A distributed system would add operational complexity that a 10-user costing rollout cannot justify. What matters is that the monolith is *decomposable*: module boundaries are explicit, cross-module calls go through service interfaces rather than direct database access, and no module reads another module's tables.

| Dimension | Phase 1 | Growth path |
|---|---|---|
| Users | 25 concurrent | Horizontal application scaling behind a load balancer; sessions already stateless (JWT) |
| Data | ~5 GB | Read replicas for reporting; partitioning already in place for the largest tables |
| Throughput | 20 req/s | Application instances scale horizontally; PgBouncer absorbs connection growth |
| Geography | Single site | CDN for assets; regional read replicas if a second site opens |
| Tenancy | Single company | `company_id` present on every table from day one; multi-tenancy becomes a policy change |
| Modules | Costing | Phases 2–7 add modules within the same deployable, or extract as services if a module's load justifies it |

## 21.2 Future Feature Support

The following are explicitly *not* built in Phase 1 but are *not blocked* by Phase 1 decisions:

| Future capability | Enabling decision taken now |
|---|---|
| Multi-company / multi-plant | `company_id` on every table; queries always scoped |
| Multi-currency | Currency code in settings; money stored as `NUMERIC(19,6)` with a currency field reserved on commercial tables |
| Multi-language UI | All user-facing strings externalised from day one; no hardcoded English in components |
| Additional approval levels | `approval_level` column on the approvals table; chain configuration is data |
| Alternative costing methods (Ne, Tex, GSM-based) | Count fields already captured; the engine takes constants as input, so a new formula variant is a new engine function, not a rewrite |
| Loom types not yet in the catalogue | Loom capability is data, not code branches (Section 4.M04.1(f)) |
| Customer-specific pricing rules | Price list table reserved; quotation already references a pricing source |
| Mobile applications | API-first design; no server-rendered coupling |
| Offline desktop mode | Calculation engine is a pure package usable outside a browser |

## 21.3 Plugin & Extension Support

| Extension point | Mechanism | Phase |
|---|---|---|
| Custom fields | JSONB `custom_attributes` column on master and document tables, with an admin-defined field registry driving validation and display | 3 |
| Custom reports | Report definitions stored as data (columns, filters, joins from a whitelisted set); no code deployment required | 3 |
| Custom validation | Rule expressions stored as configuration, evaluated by a sandboxed expression engine | 5 |
| Custom document templates | Print templates stored as data with a preview; company can rebrand without a release | 2 |
| Webhooks | Subscribe to any domain event; delivery with retry and signature verification | 5 |
| Workflow configuration | Approval chains, thresholds, SLAs and escalation ladders all configured, never coded | 1 (single level) / 3 (chains) |
| Calculation variants | Named formula sets selectable per item category, each with its own golden-file suite | 5 |

**Explicitly not supported:** arbitrary user-supplied code execution. Extension is configuration-driven. This is a deliberate security boundary.

## 21.4 Integration Support

Every integration goes through the Integration Gateway (M39) rather than being wired directly into a module. This means a new integration is a new adapter, not a change to business logic. Adapters implement a common interface: `transform`, `dispatch`, `handleResponse`, `retry`, `log`.

## 21.5 Microservice Readiness

The monolith is structured so that extraction is mechanical rather than archaeological:

| Practice | Effect on extraction |
|---|---|
| Module-owned tables; no cross-module SQL | A module's data moves with it |
| Service interfaces for all cross-module calls | Interfaces become network calls without changing callers |
| Domain events already published on an internal bus | The bus becomes a message broker without changing publishers |
| Stateless application tier | Instances scale and split freely |
| The calculation engine is already a standalone package | It can become a service, a Lambda, or stay embedded |
| Correlation IDs threaded through every call | Distributed tracing works from day one |
| Per-module permission declarations | Authorisation survives the split |

**Extraction candidates, in likely order:** (1) PDF/report generation — bursty, CPU-heavy, isolated; (2) the notification engine — I/O-bound, independently scalable; (3) IoT telemetry ingestion (Phase 7) — high-volume, different write profile; (4) the search service, if PostgreSQL search is outgrown.

**Extraction is a response to measured pressure, not a goal.** A single well-partitioned PostgreSQL instance comfortably serves the projected Year-5 volumes; splitting prematurely would add distributed-transaction problems to a domain that genuinely requires transactional integrity across modules (a cost sheet approval that must atomically write audit).

---


# 22. Integration Requirements

## 22.1 Integration Principles

Every integration is: **idempotent** (BR-165), **logged** (BR-166), **alerting on failure** (BR-167), **versioned**, and **replayable**. No integration is permitted to be the sole store of any business fact.

## 22.2 ERP & Accounting Integration

| Target | Method | Direction | Data | Phase |
|---|---|---|---|---|
| **Tally Prime / ERP 9** | XML over HTTP to the Tally listener, or XML file drop | Outbound | Sales invoices, credit notes, purchase entries, party masters, receipts | 5 |
| **SAP Business One / S/4** | OData v4 service layer, or IDoc for classic landscapes | Bidirectional | Masters inbound; invoices, GRNs, stock movements outbound | 5+ |
| **Microsoft Dynamics 365 BC** | REST API with OAuth 2.0 | Bidirectional | Same as SAP | 5+ |
| **Marg / Busy / other Indian SME packages** | CSV/XLSX file exchange over a watched folder | Outbound | Invoices and party ledgers | 5 |
| **Generic** | Webhook + REST pull | Outbound | Any domain event | 5 |

**Tally specifics** (the most likely first integration for an Indian textile SME): envelope-wrapped XML `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>…`, voucher-type mapping configured per company, ledger auto-creation disabled by default (a missing ledger raises an exception rather than silently creating), GST breakup mapped to the company's ledger structure, and a reconciliation report comparing WeaveOne invoices to accepted Tally vouchers.

**Non-negotiable rule:** WeaveOne is the system of record for costing, production and stock. The accounting system is the system of record for the general ledger. Neither overwrites the other's domain, and the reconciliation report makes any divergence visible.

## 22.3 Communication Integrations

| Service | Provider options | Use | Phase |
|---|---|---|---|
| **Email (SMTP)** | Company relay, SendGrid, Amazon SES, Postmark | Approvals, reports, password reset, buyer documents | 1 |
| **WhatsApp — manual** | `wa.me` deep link | Design card sharing from the user's own WhatsApp | 2 |
| **WhatsApp — Business API** | Meta Cloud API, Gupshup, Twilio | Automated order status, payment reminders, design cards | 5 |
| **SMS** | MSG91, Twilio, TextLocal | Critical alerts only; DLT-registered templates (mandatory in India) | 5 |
| **Push notifications** | Web Push (VAPID), FCM | Approval requests, floor alerts | 5 |

Email requirements: SPF, DKIM and DMARC configured for deliverability; bounce and complaint webhooks processed; unsubscribe honoured for informational categories only; plain-text alternative always present.

WhatsApp Business API requirements: message templates pre-approved by Meta; the 24-hour customer service window respected; per-message cost tracked and reported; opt-in recorded before any business-initiated message.

## 22.4 Payment Gateway

| Aspect | Specification |
|---|---|
| Providers | Razorpay, PayU, Cashfree (configurable) |
| Scope | Customer portal payment against invoices; payment links in reminder messages |
| Flow | Server-initiated order creation → hosted checkout → **server-side webhook verification** → receipt recorded |
| Security | **No card data ever touches WeaveOne servers.** Signature verification mandatory on every webhook; verification failure discards the message and alerts |
| Idempotency | Provider payment ID is unique-constrained; replay produces no duplicate receipt |
| Reconciliation | Daily settlement report matched against recorded receipts; unmatched entries flagged |
| Refunds | Initiated in the provider's console; ingested via webhook and recorded as a credit |
| Phase | 5 |

## 22.5 Barcode & QR

| Aspect | Specification |
|---|---|
| Symbologies | Code 128 (alphanumeric, roll and beam IDs), QR (genealogy URL + payload), EAN-13 where retail packing requires it |
| Generation | Server-side, embedded in labels and printed documents |
| Content | Roll: `{companyPrefix}-R-{rollId}`; Beam: `{companyPrefix}-B-{beamId}`; QR encodes a signed deep link to the genealogy view |
| Printers | Zebra ZPL and TSC TSPL command generation; also a plain PDF label sheet fallback for any printer |
| Scanning | USB/Bluetooth HID scanners (keyboard wedge — no integration needed) and the mobile camera via the browser's `BarcodeDetector` API with a JS fallback |
| Validation | Checksum digit; unknown codes produce a clear error and create no transaction |
| Reprint | Permitted, counted, marked and audited |
| Phase | 4 |

## 22.6 Excel Import & Export

| Aspect | Specification |
|---|---|
| Library | ExcelJS (server), SheetJS (client preview) |
| Export | Typed cells (numbers as numbers, dates as dates — never as text), frozen header row, auto-filter, column widths, a parameter header block, and hidden full-precision columns (BR-71) |
| Import templates | Downloadable per master with a data-dictionary sheet, example rows and dropdown validation on enum columns |
| Import pipeline | Upload → parse → schema validate → business validate → **dry-run preview** → confirm → transactional commit → result report |
| Error reporting | Downloadable workbook of rejected rows with a reason column appended |
| Limits | 10 MB, 10,000 rows |
| Encoding | UTF-8 with BOM for CSV, so Gujarati and Hindi text opens correctly in Excel |
| Formulas | Import ignores formulas and reads computed values; export writes values, not formulas, so figures cannot drift |

## 22.7 PDF Generation

| Aspect | Specification |
|---|---|
| Engine | Headless Chromium (Puppeteer/Playwright) rendering the same React print component used by browser print — **one layout source of truth** (Section 2.4) |
| Fonts | Embedded; IBM Plex Sans/Mono plus Noto Sans Gujarati and Devanagari for multilingual content |
| Metadata | Title, author (company), subject (document type), creation date; no user personal data in metadata |
| Security | Optional password protection and print/copy restrictions on externally shared documents |
| Digital signature | PAdES signing reserved for a future phase; the document hash in the footer (A-24) serves the interim verification need |
| Performance | Generated on a worker; a pool of browser instances is reused rather than launched per request |
| Bulk | Queued, ZIP-delivered, notified on completion |
| Accessibility | Tagged PDF with a logical reading order where the generator supports it |

## 22.8 Printer Integration

| Type | Approach |
|---|---|
| Office printers (A4 documents) | Browser print against `@media print` stylesheets; no driver integration |
| Thermal label printers | ZPL/TSPL byte streams sent via a local print agent or direct network socket to the printer's port 9100 |
| Dot-matrix (legacy challan printing, still common) | Plain-text output with form-feed control characters, fixed 80/132 column layouts |
| Print server | Optional CUPS/IPP integration for centralised queues |
| Fallback | Every printable document is downloadable as PDF, so no workflow depends on a working printer integration |

## 22.9 Third-Party API Surface (Outbound)

WeaveOne exposes a partner API so the company's customers or agents can integrate.

| Aspect | Specification |
|---|---|
| Authentication | API key + secret, HMAC-signed requests, per-key scopes and rate limits |
| Endpoints | Read-only subset: order status, dispatch status, invoice list, design catalogue (non-commercial fields only) |
| Webhooks | Subscribable domain events with HMAC signature, timestamp, and replay protection |
| Documentation | OpenAPI 3.1 specification published; interactive documentation |
| Versioning | Path-versioned; a deprecated version is supported for 12 months after its successor ships |
| Sandbox | A separate environment with synthetic data for partner development |
| SLA | Documented rate limits and availability commitment |

## 22.10 Integration Monitoring

Every integration reports: last successful run, last failure with reason, message counts by status, retry queue depth, and dead-letter count. These surface on an Administrator dashboard, and any dead-letter arrival raises an alert. An integration that has not run within 1.5× its expected interval is reported as stalled — silence is treated as failure, not success.

---


# 24. Testing Requirements

## 24.1 Testing Strategy

The testing pyramid is deliberately weighted toward the calculation engine. A UI defect is embarrassing; a calculation defect is a wrong price sent to a buyer.

```
                    ┌───────────────┐
                    │   UAT (30)    │   real users, real workbooks
                  ┌─┴───────────────┴─┐
                  │   E2E  (60)       │   critical journeys, Playwright
                ┌─┴───────────────────┴─┐
                │  Integration (250)     │  API + database, real Postgres
              ┌─┴────────────────────────┴─┐
              │      Unit (1,200+)          │  of which ~400 are engine tests
              └─────────────────────────────┘
                 ┌──────────────────────┐
                 │ Golden files (30+1)  │  ← the acceptance fixture + regression corpus
                 └──────────────────────┘
```

| Level | Scope | Tooling | Gate |
|---|---|---|---|
| Unit | Pure functions, engine, validators, formatters | Vitest | Must pass; engine coverage 100% |
| Golden file | Full-sheet computations against known-correct outputs | Vitest snapshot with exact string comparison | **Any mismatch fails the build** |
| Property-based | Randomised inputs asserting invariants | fast-check | Must pass |
| Integration | API + service + real PostgreSQL (Testcontainers) | Vitest + Supertest | Must pass |
| Component | React components in isolation | Testing Library | Must pass |
| E2E | Critical user journeys in a real browser | Playwright | Must pass on Chrome; smoke on Firefox/Safari |
| Visual regression | Print layouts and key screens | Playwright screenshots | Reviewed, not auto-failing |
| Accessibility | Automated axe scan per screen | axe-core | Zero critical violations |
| Performance | Load and soak | k6 | Must meet Section 20 targets |
| Security | SAST, dependency scan, DAST | CodeQL, Snyk/Dependabot, OWASP ZAP | Zero Critical/High |
| UAT | Real users, real data | Manual, scripted | Sign-off required for release |

## 24.2 Unit Testing

| Area | Requirement |
|---|---|
| Calculation engine | **100% statement and branch coverage.** Every formula, every rounding point, every warning condition |
| Validators | Every rule in Section 18 has a passing and a failing case |
| Formatters | Currency, date, number grouping, precision, locale variants |
| Permission resolution | Role ∪ grants ∖ denies, including precedence of explicit deny |
| State machine | Every legal transition, and every illegal transition asserted to be refused |
| Mocking | External dependencies mocked; the engine is tested with no mocks at all, since it has no dependencies |
| Determinism | No test depends on the system clock, randomness, or execution order |

## 24.3 Integration Testing

| Area | Requirement |
|---|---|
| Database | Real PostgreSQL via Testcontainers; never an in-memory substitute, because CHECK constraints, triggers and `NUMERIC` semantics are exactly what is being verified |
| Transactions | Rollback verified on audit-write failure (BR-79) |
| Triggers | Approved-document immutability trigger verified by attempting a direct SQL update |
| Concurrency | Two simultaneous updates asserted to produce one success and one 409 |
| Idempotency | Duplicate POST with the same key returns the original response and creates one record |
| Authorisation | Every endpoint tested with a permitted role, a denied role, and no token |
| Scoping | Scoped roles verified to receive filtered results in both list and export paths |
| N+1 detection | Query counts asserted on list endpoints |
| Import | Full pipeline with valid, partially invalid and wholly invalid files |

## 24.4 System / End-to-End Testing

Critical journeys covered end-to-end:

| ID | Journey |
|---|---|
| E2E-01 | Login → create cost sheet → enter warp and weft → verify final cost → save → submit |
| E2E-02 | Approver logs in → reviews → compares versions → approves → sheet becomes read-only |
| E2E-03 | Rejection with remarks → preparer revises → resubmits → approves |
| E2E-04 | Change a yarn rate → verify an existing sheet is unchanged → verify a new sheet uses the new rate |
| E2E-05 | Create a new version → both versions coexist → comparison shows deltas |
| E2E-06 | Print preview → PDF export → Excel export → verify figures match across all three |
| E2E-07 | Master import with errors → preview blocks → corrected file commits |
| E2E-08 | Permission denied paths: costing user attempts approval, settings, user management |
| E2E-09 | Session expiry mid-edit → re-login → work restored |
| E2E-10 | Global search finds a design, a material and a cost sheet |
| E2E-11 | (Phase 2) Create design → add feeders → reorder → share → verify no cost data in the share |
| E2E-12 | (Phase 3) Production order → incompatible loom blocked → compatible loom allocated → job card issued → production recorded |
| E2E-13 | (Phase 4) Receipt → issue → roll creation → genealogy traced to the yarn lot |
| E2E-14 | (Phase 5) Quotation from approved costing → order → dispatch → invoice → receipt |
| E2E-15 | (Phase 6) Inspection with defects → grade computed → hold → dispatch blocked |

## 24.5 User Acceptance Testing

| Aspect | Specification |
|---|---|
| Participants | 2 costing executives, 1 costing manager, 1 designer, 1 planner, 1 administrator, plus the business owner |
| Duration | 2 weeks per phase, in parallel with defect fixing |
| Environment | Staging, loaded with anonymised real data |
| **Primary test** | Recompute 30 real historical cost sheets from the company's actual Excel workbooks and compare every figure to the workbook, to the last decimal |
| Scripted scenarios | 40 scripted tasks covering the workflows in Section 6 |
| Exploratory | 2 dedicated exploratory sessions with no script |
| Defect triage | Daily during UAT; P0 fixed same day, P1 within the UAT window |
| **Exit criteria** | Zero P0 defects; zero open P1 defects; all 30 workbooks match exactly; SUS score ≥ 75; business owner sign-off |

## 24.6 Regression Testing

| Aspect | Specification |
|---|---|
| Automated suite | Full unit, integration and E2E suite runs on every pull request and every merge to main |
| Golden files | The 30-workbook corpus plus the acceptance fixture run on every commit that touches the engine, and nightly regardless |
| Changing a golden file | Requires documented business sign-off recorded in the pull request (BR-61); a silent golden-file update is a process violation |
| Visual regression | Print layouts captured and diffed each release |
| Data migration | Every migration tested forward on a production-sized snapshot, and its rollback path verified |
| Cross-browser | Full suite on Chrome; smoke suite on Edge, Firefox and Safari each release |
| Duration | Full suite must complete in under 20 minutes, or developers will stop running it |

## 24.7 Performance Testing

| Test | Method | Pass criteria |
|---|---|---|
| Load | k6, ramp to target concurrent users for 30 minutes | All Section 20 p95 targets met |
| Stress | Ramp until failure | Graceful degradation; no data loss; recovery without restart |
| Soak | Target load for 8 hours | No memory growth trend; no connection leak |
| Spike | 10× load for 60 seconds | Rate limiting engages; no 5xx beyond the rate-limit responses |
| Volume | Full suite against 1.5× Year-5 data volumes | Targets met |
| Search | 100,000 designs, varied queries | p95 < 2 s (SC-05) |
| Grid | 100-line cost sheet, rapid typing | Recalculation < 150 ms; no dropped keystrokes |
| Report | Largest report at full volume | Completes or correctly queues |
| PDF | 100 concurrent generations | Queue drains; no timeout |

## 24.8 Security Testing

| Test | Method | Frequency |
|---|---|---|
| SAST | CodeQL in CI | Every PR |
| Dependency vulnerabilities | Automated scanning | Every PR + daily |
| Secret detection | Pre-commit + CI | Every commit |
| DAST | OWASP ZAP against staging | Each release |
| Authentication | Brute force, lockout, token replay, session fixation | Each release |
| Authorisation | Every endpoint against every role; IDOR attempts with another user's UUIDs | Each release |
| Injection | SQL, XSS, command, template | Each release |
| File upload | Polyglot files, oversized, mismatched magic bytes, embedded scripts | Each release |
| Rate limiting | Verified per endpoint class | Each release |
| Penetration test | Independent third party | Pre-launch, then annual |
| Data leakage | Verify no cost data in job cards, shares or portal responses (BR-103, BR-123, BR-150) | Each release |

## 24.9 Test Case Register — Calculation (Extract)

These are binding. `TC-CALC-001` and `TC-HIST-001` are referenced from Sections 1 and 4.

| ID | Description | Input | Expected | Priority |
|---|---|---|---|---|
| **TC-CALC-001** | **Acceptance fixture — full sheet** | Appendix 31.4 | **Final Cost = `351.89651003302`** exactly; display ₹351.90 / ₹352 | **P0** |
| TC-CALC-002 | Warp KG formula | Ends 8000, Denier 100, Length 3675, divisor 9,000,000 | `3.266666666667` at 12 dp | P0 |
| TC-CALC-003 | Weft KG formula | Picks 96, Denier 150, Length 3675, Panna 44, divisor 9,000,000 | Exact decimal, no float drift | P0 |
| TC-CALC-004 | Warp line cost rounding | KG × Rate rounded to 2 dp | 32.66 and 10.06; total 42.72 | P0 |
| TC-CALC-005 | Weft line costs | Fixture weft lines | 69.21, 18.92, 17.86; total 105.99 | P0 |
| TC-CALC-006 | Base material cost | 42.72 + 105.99 | 148.71 | P0 |
| TC-CALC-007 | Wastage at 10% | 148.71 × 10% rounded | 14.87 | P0 |
| TC-CALC-008 | Material with wastage | 148.71 + 14.87 | 163.58 | P0 |
| TC-CALC-009 | Process charges | Butta 6.65 × 2; RFD 7 × 0 | 13.30 and 0.00; total 13.30 | P0 |
| TC-CALC-010 | **Card cost unrounded** | 17226 × 0.4 ÷ 39.37 | `175.01651003302` — **not** 175.02 in the sum | **P0** |
| TC-CALC-011 | Final cost assembly | 163.58 + 13.30 + 0 + 175.01651003302 | `351.89651003302` | P0 |
| TC-CALC-012 | Sale rate default | No markup, no override | Equals final cost exactly | P0 |
| TC-CALC-013 | Display rounding — 2 decimals | 351.89651003302 | ₹351.90 | P0 |
| TC-CALC-014 | Display rounding — nearest rupee | 351.89651003302 | ₹352 | P0 |
| TC-CALC-015 | Zero rate line | Rate 0 | Cost 0.00, warning raised, no error | P1 |
| TC-CALC-016 | Zero panna weft line | Panna 0 | KG 0, warning raised | P1 |
| TC-CALC-017 | Blank rows ignored | 3 blank warp rows | Not persisted, excluded from totals | P1 |
| TC-CALC-018 | Negative input rejected | Ends −500 | Validation error, value not accepted | P0 |
| TC-CALC-019 | Very large values | Ends 999,999 × Denier 100,000 × Length 1,000,000 | Computed without overflow or precision loss | P1 |
| TC-CALC-020 | Very small values | Denier 0.0001 | Precision retained to 12 dp | P1 |
| TC-CALC-021 | Markup applied | 15% markup on fixture | Sale 404.681…, profit 52.784…, margin 13.0435%; **final cost unchanged** | P0 |
| TC-CALC-022 | Manual sale rate override | Manual 400 | Effective rate 400; suggested rate still computed and shown | P1 |
| TC-CALC-023 | Margin divide-by-zero | Sale rate 0 | Margin 0, displays "—", no error | P0 |
| TC-CALC-024 | Custom divisor | `kg_divisor` = 9,500,000 on a new sheet | All KG values recomputed against the new divisor | P0 |
| TC-CALC-025 | Determinism | Same input × 1,000 runs | Bit-identical output every time | P0 |
| TC-CALC-026 | Cross-tier parity | Same input in Node and browser | Identical to the last digit | P0 |
| TC-CALC-027 | Server authority | Client sends a tampered final cost | Server value persisted; divergence logged | P0 |
| TC-CALC-028 | Property — monotonicity | Increasing any rate | Final cost never decreases | P1 |
| TC-CALC-029 | Property — non-negativity | Any valid non-negative input | No output is negative | P1 |
| TC-CALC-030 | Regression corpus | 30 real workbooks | All match golden files exactly | P0 |

## 24.10 Test Case Register — Behaviour (Extract)

| ID | Description | Expected | Priority |
|---|---|---|---|
| **TC-HIST-001** | **Rate change does not affect existing sheets** | Sheet saved at ₹185; master changed to ₹195; reopened sheet shows ₹185 and identical final cost to full precision | **P0** |
| TC-HIST-002 | Divisor change does not affect existing sheets | Existing sheet recomputes with its snapshot; new sheet uses the new value | P0 |
| TC-HIST-003 | Deactivated material still renders on historical sheets | Displays with an inactive indicator | P1 |
| TC-LOCK-001 | Approved sheet cannot be edited via API | 409 `COSTSHEET_LOCKED` | P0 |
| TC-LOCK-002 | Approved sheet cannot be edited via direct SQL | Trigger raises an exception | P0 |
| TC-AUTH-001 | Account lockout after 5 failures | Locked 15 minutes; identical message for unknown email | P0 |
| TC-AUTH-002 | Refresh token replay | Entire family revoked | P0 |
| TC-AUTH-003 | Last admin cannot be removed | Operation refused | P0 |
| TC-AUTHZ-001 | Costing user cannot approve | 403 + audit entry | P0 |
| TC-AUTHZ-002 | Self-approval blocked | 403 `SELF_APPROVAL_FORBIDDEN` | P0 |
| TC-AUDIT-001 | Rate change writes an audit record | Old, new, actor, timestamp, reason present | P0 |
| TC-AUDIT-002 | Audit write failure rolls back the business change | Nothing persisted | P0 |
| TC-AUDIT-003 | No audit update/delete endpoint exists | API surface scan finds none | P0 |
| TC-CONC-001 | Concurrent edit | Second write receives 409 with a changed-field list | P0 |
| TC-VER-001 | New version copies frozen rates | Version 2 lines carry version 1's rates | P0 |
| TC-VER-002 | Approving v2 archives v1 | Both transitions audited | P1 |
| TC-PRINT-001 | Draft prints with watermark | Watermark on every page | P1 |
| TC-PRINT-002 | PDF and browser print identical | Figures and layout match | P1 |
| TC-PRINT-003 | 60-line sheet pagination | Headers repeat; no split rows | P1 |
| TC-IMP-001 | Import with errors does not commit | Zero rows written; errors listed by row number | P0 |
| TC-SEC-001 | IDOR on another user's cost sheet | 403 (internal) / 404 (portal) | P0 |
| TC-SEC-002 | Job card contains no cost data | Verified across all fields | P0 |
| TC-SEC-003 | Design share contains no cost data | Verified | P0 |
| TC-PERF-001 | Search at 100,000 designs | p95 < 2 s | P0 |
| TC-PERF-002 | Recalculation latency | < 150 ms on a 100-line sheet | P0 |
| TC-A11Y-001 | Costing workflow keyboard-only | Completable without a mouse | P0 |
| TC-A11Y-002 | axe scan per screen | Zero critical violations | P1 |
| TC-LOOM-001 | Width incompatibility blocked | Numeric reason stated | P0 |
| TC-LOOM-002 | Feed count incompatibility blocked | Numeric reason stated | P0 |
| TC-LOOM-003 | Water Jet with non-hydrophobic yarn blocked | Reason stated | P0 |
| TC-STOCK-001 | Negative stock prevented | Issue refused, available quantity stated | P0 |
| TC-QUAL-001 | 4-point scoring with per-yard cap | 4 points maximum per linear yard | P0 |
| TC-BKP-001 | Restore verification | Acceptance fixture reproduces exactly after restore | P0 |

## 24.11 Defect Severity Definitions

| Severity | Definition | Response | Release impact |
|---|---|---|---|
| **P0 Critical** | Wrong calculation, data loss, security breach, system unusable, historical data altered | Fix immediately; hotfix if in production | Blocks release |
| **P1 High** | Core workflow broken with no workaround; approval or print fails | Fix within the sprint | Blocks release |
| **P2 Medium** | Feature impaired but with a workaround; noticeable UI defect | Next sprint | Documented, does not block |
| **P3 Low** | Cosmetic, minor inconvenience, rare edge case | Backlog | Does not block |

**Any calculation discrepancy is P0 regardless of magnitude.** A one-paisa difference and a one-lakh difference receive the same response, because both indicate the same class of defect.

---


# 28. Release Plan

## 28.1 Release Strategy

Each phase is an independently valuable, independently releasable product increment. Phase 1 alone replaces the Excel costing workbook and justifies the investment; nothing later is required for it to be useful.

| Principle | Application |
|---|---|
| Vertical slices | Each release delivers a complete workflow, not a horizontal layer |
| Parallel running | One month of parallel operation with Excel for Phase 1 |
| Phase gate | Written sign-off on UAT exit criteria before the next phase begins |
| Blue-green deployment | Previous version retained; rollback is a traffic switch |
| Forward-only migrations | Backward-compatible for one release; expand-then-contract for breaking changes |
| Feature flags | New capability shipped dark, enabled per role, then generally |

## 28.2 Phase 1 — Fabric Costing Core

**Objective:** Replace the Excel costing workbook completely and provably.

| Release | Contents | Duration |
|---|---|---|
| **1.0-alpha** | M10 engine with golden files; M01 auth; M02 users; M03 settings | Weeks 1–4 |
| **1.0-beta** | M04 masters; M05 materials with rate history; M14 audit | Weeks 5–8 |
| **1.0-rc** | M06–M09 cost sheet; M11 lifecycle and approval | Weeks 9–13 |
| **1.0** | M12 print/PDF/Excel; M13 reports R-01…R-08; M15 dashboard; M16 search; M17 backup; UAT and fixes | Weeks 14–18 |

**Exit criteria:** all 30 workbooks reproduce exactly; zero P0 and P1 defects; SUS ≥ 75; one month of successful parallel running; business owner sign-off.

## 28.3 Phase 2 — Design Management

**Objective:** Digitise the swatch-card archive and capture feeder knowledge before it is lost.

Contents: M18 design repository; M19 feeder management; M20 image gallery; M21 buyer sharing; M22 comparison; M38 notification engine.
**Exit criteria:** 500 designs migrated with images and feeders; cross-reference search functional; designers working without the physical card file for new work.

## 28.4 Phase 3 — Production Planning & Execution

**Objective:** Replace the handwritten job card and make loom capacity visible.

Contents: M23 production orders; M24 loom planning with the compatibility engine; M25 beam and warp planning; M26 job card voucher; M27 daily production capture; M28 consumption variance; M29 operator performance.
**Exit criteria:** all looms on the planning board; job cards issued digitally for one full month; production recorded for every shift; the compatibility engine has prevented at least one incorrect allocation (evidence of value).

## 28.5 Phase 4 — Inventory & Traceability

Contents: M30 inventory across six stock types; M31 barcode/QR and genealogy.
**Exit criteria:** perpetual stock reconciles with a physical count to within 2%; genealogy demonstrable from a dispatched roll to a supplier lot.

## 28.6 Phase 5 — Sales, Job Work & Integration

Contents: M32 order-to-cash; M33 job work with partner portal; M34 customer portal; M39 integration gateway.
**Exit criteria:** a full order-to-cash cycle completed in the system; accounting export reconciles; at least one buyer and one job work partner actively using their portal.

## 28.7 Phase 6 — Quality

Contents: M35 grey and 4-point inspection, shade approval, defect mapping, lab records.
**Exit criteria:** every finished roll graded in the system; defect Pareto driving at least one documented corrective action.

## 28.8 Phase 7 — Intelligence & IoT

Contents: M36 machine dashboard and telemetry; M37 predictive maintenance and AI advisory layer.
**Exit criteria:** live loom status for the connected fleet; at least one maintenance intervention triggered by a prediction.

## 28.9 Future Roadmap (Beyond Phase 7)

Multi-plant and multi-company consolidation · multi-currency export costing · advanced planning and scheduling (APS) with finite capacity · supplier portal and procurement · HR and payroll integration for shift attendance · buyer-facing 3D fabric visualisation · sustainability and carbon reporting · certification chain-of-custody reporting (A-48) · native mobile applications · a marketplace-facing catalogue.

## 28.10 Release Checklist (Every Release)

| Category | Items |
|---|---|
| Code | All tests green · golden files unmodified · coverage thresholds met · no Critical/High vulnerabilities · code review complete |
| Data | Migrations tested forward and rolled back on a production-sized snapshot · seed data verified |
| Documentation | Release notes · updated user guide · updated API spec · updated runbook |
| Verification | UAT sign-off · performance suite passed · accessibility scan clean · security scan clean |
| Operations | Backup taken immediately before deployment · rollback plan documented and rehearsed · monitoring alerts configured for new components |
| Communication | Users notified 72 hours ahead · training delivered for new workflows · support briefed |
| Post-release | Smoke test in production · 24-hour heightened monitoring · retrospective within one week |

---


# 29. Development Estimate

## 29.1 Basis of Estimate

Estimates are in **developer-months**, assuming an experienced full-stack developer productive in TypeScript, React and PostgreSQL. They include implementation, unit and integration tests, code review, and defect fixing within the phase. They **exclude** client-side data cleansing, hardware procurement, infrastructure provisioning, and training delivery.

**Complexity scale:** Low = well-understood CRUD; Medium = business logic with meaningful edge cases; High = novel logic, integration risk, or a correctness-critical component.

## 29.2 Phase 1 — Fabric Costing Core

| Module | Complexity | Dev-months | Priority | Depends on |
|---|---|---|---|---|
| M10 Calculation Engine | **High** | 1.0 – 1.3 | P0 | — |
| M01 Authentication | Medium | 0.5 – 0.7 | P0 | — |
| M02 Users & Roles | Medium | 0.6 – 0.8 | P0 | M01 |
| M03 Settings & Constants | Medium | 0.5 – 0.7 | P0 | M02 |
| M04 Master Data (9 masters + supporting) | Medium | 1.8 – 2.4 | P0 | M02, M03 |
| M05 Materials & Rate History | Medium | 0.7 – 0.9 | P0 | M04 |
| M06 Cost Sheet Header | Medium | 0.5 – 0.7 | P0 | M03, M04 |
| M07 Warp Section | **High** | 0.8 – 1.0 | P0 | M06, M10 |
| M08 Weft Section | Medium | 0.4 – 0.5 | P0 | M07 |
| M09 Summary, Wastage, Process, Card, Pricing | **High** | 0.8 – 1.0 | P0 | M07, M08 |
| M11 Versioning & Approval Workflow | **High** | 0.9 – 1.2 | P0 | M06, M02 |
| M12 Print, PDF, Excel Import/Export | **High** | 1.0 – 1.3 | P1 | M09, M04 |
| M13 Reports (R-01…R-08) | Medium | 0.7 – 0.9 | P1 | M09 |
| M14 Audit History | Medium | 0.5 – 0.7 | P0 | M02 |
| M15 Dashboard | Low | 0.4 – 0.5 | P2 | M13 |
| M16 Search | Medium | 0.5 – 0.7 | P1 | M04, M06 |
| M17 Backup & Restore | Medium | 0.4 – 0.5 | P1 | all |
| Design system, shell, navigation, accessibility | Medium | 0.7 – 0.9 | P0 | — |
| Test infrastructure, CI/CD, environments | Medium | 0.6 – 0.8 | P0 | — |
| Data migration tooling and workbook import | Medium | 0.5 – 0.7 | P1 | M04, M05 |
| **Phase 1 total** | | **13.8 – 18.2** | | |

> **Reconciliation with the earlier estimate.** The figure quoted to the client was **10–13 dev-months / ~3.5–4.5 calendar months with 3 developers** for Phase 1. That figure covers the P0 core (engine, auth, users, settings, masters, materials, cost sheet, approval, audit) plus print. The table above additionally itemises reports, dashboard, search, backup, design system, CI/CD and migration tooling, which the earlier figure folded into contingency. **Both are consistent if the earlier figure is read as the P0 delivery scope and this table as the full Phase 1 release scope.** The recommended planning figure is:
>
> | Scope | Dev-months | 3 developers | 4 developers |
> |---|---|---|---|
> | Phase 1 P0 core only | 10 – 13 | 3.5 – 4.5 months | 2.5 – 3.5 months |
> | Phase 1 full release scope | 14 – 18 | 4.7 – 6.0 months | 3.5 – 4.5 months |

## 29.3 Phases 2–7 Summary

| Phase | Scope | Complexity | Dev-months | 3 devs (calendar) |
|---|---|---|---|---|
| **2** Design Management | Design repository, feeders, gallery, sharing, comparison, notification engine | Medium | 5 – 7 | ~2.0 months |
| **3** Production | Orders, loom planning + compatibility engine, beam planning, job card, daily production, variance, operator performance | **High** | 10 – 14 | ~4.0 months |
| **4** Inventory | Six stock types, movements, valuation, barcode/QR, genealogy | **High** | 9 – 12 | ~3.5 months |
| **5** Sales & Integration | Order-to-cash, job work, portals, integration gateway, accounting export | **High** | 12 – 16 | ~4.5 months |
| **6** Quality | Grey and 4-point inspection, shade, defect map, lab | Medium | 6 – 8 | ~2.5 months |
| **7** Intelligence & IoT | Telemetry, machine dashboard, predictive maintenance, AI advisory | **High** | 10 – 15 | ~4.0+ months |
| **Total, Phases 1–7** | | | **66 – 90** | **24 – 30 months** |

## 29.4 Module-Level Estimates, Phases 2–7

| Module | Complexity | Dev-months |
|---|---|---|
| M18 Design Repository | Medium | 1.2 – 1.6 |
| M19 Feeder Management | Medium | 0.8 – 1.1 |
| M20 Image Gallery & Files | Medium | 1.0 – 1.3 |
| M21 Buyer Sharing | Low | 0.4 – 0.6 |
| M22 Design Comparison | Low | 0.5 – 0.7 |
| M38 Notification Engine | Medium | 1.1 – 1.5 |
| M23 Production Orders | Medium | 1.2 – 1.6 |
| M24 Loom Planning & Compatibility | **High** | 2.0 – 2.8 |
| M25 Beam & Warp Planning | Medium | 1.2 – 1.6 |
| M26 Job Card Voucher | **High** | 1.8 – 2.4 |
| M27 Daily Production + offline sync | **High** | 2.0 – 2.8 |
| M28 Consumption Variance | Medium | 0.9 – 1.2 |
| M29 Operator Performance | Low | 0.6 – 0.8 |
| M30 Inventory (six stock types) | **High** | 5.0 – 6.5 |
| M31 Barcode, QR & Genealogy | **High** | 3.0 – 4.0 |
| M32 Sales (quotation → invoice → outstanding) | **High** | 6.0 – 8.0 |
| M33 Job Work & Partner Portal | Medium | 2.0 – 2.6 |
| M34 Customer Portal | Medium | 1.8 – 2.4 |
| M39 Integration Gateway | **High** | 2.2 – 3.0 |
| M35 Quality (inspection, shade, defects, lab) | Medium–High | 6.0 – 8.0 |
| M36 Machine Dashboard & IoT | **High** | 5.0 – 7.5 |
| M37 Predictive Maintenance & AI | **High** | 5.0 – 7.5 |

## 29.5 Team Composition

| Role | Phase 1 | Phases 3–5 | Notes |
|---|---|---|---|
| Full-stack developer | 2–3 | 3–4 | At least one with strong PostgreSQL experience |
| UI/UX designer | 0.5 | 0.5 | Heaviest in Phase 1 (design system) and Phase 3 (shop floor) |
| QA engineer | 0.5 | 1.0 | Owns the golden-file corpus |
| DevOps | 0.25 | 0.5 | Infrastructure, CI/CD, monitoring |
| Product Owner / BA | 0.5 | 0.5 | Client-side domain expert; owns assumption sign-offs |
| Technical Lead | 0.5 | 1.0 | Architecture, engine reviews, risk ownership |

## 29.6 Assumptions and Exclusions in the Estimate

**Included:** implementation, unit/integration/E2E tests, code review, in-phase defect fixing, technical documentation, deployment scripting.

**Excluded and separately budgeted:** client-side master data cleansing (estimated 2–4 person-weeks of client effort); hardware and infrastructure procurement; end-user training delivery (estimated 1 week per phase); third-party service subscriptions; independent penetration testing (~1 week per engagement); post-warranty support and maintenance (typically 15–20% of build cost annually).

**Contingency:** 15% is recommended on Phase 1 and 20% on Phases 3–7, where integration and hardware dependencies increase variance.

## 29.7 Critical Path & Scheduling Notes

The Phase 1 critical path is **M10 → M03 → M04/M05 → M06 → M07/M08 → M09 → M11 → M12**. Roughly 8–10 dev-months sit on this path; the remainder (reports, dashboard, search, backup, migration tooling) parallelises well. This is why three developers compress Phase 1 substantially but a fourth adds less than proportionally — the critical path does not shorten indefinitely with more people.

**Sequencing recommendation:** build M10 first, in isolation, with the golden files, before any UI exists. If the engine is correct and proven, everything downstream is ordinary software. If it is not, nothing downstream matters.


---


## 6. Development Rules — Mandatory

### 6.1 Decimal & Calculation
- Monetary and quantity fields use PostgreSQL `NUMERIC(19,6)`.
- API monetary values are JSON strings.
- Calculation engine uses `decimal.js`.
- Calculation constants are configuration-driven.
- Internal precision and rounding mode are explicit settings.
- Historical cost sheets snapshot all values required to reproduce the calculation.

### 6.2 Cost Sheet Lifecycle
```text
DRAFT
  ↓
PENDING_APPROVAL
  ├── REJECTED → DRAFT
  └── APPROVED
        ↓
     ARCHIVED
```

Approved records are immutable to normal users. Any administrator override requires an explicit reason and audit entry.

### 6.3 API Contract
- REST over HTTPS.
- `/api/v1` versioned base path.
- Bearer authentication except explicitly public authentication/health endpoints.
- `camelCase` JSON; `snake_case` database.
- UUID identifiers.
- ISO 8601 dates/timestamps.
- Idempotency support for POST operations.
- Optimistic concurrency using `rowVersion` / `If-Match`.

### 6.4 Audit
Every create, update, approval, rejection, archive, delete/deactivate, import, export, permission change and administrator override must record:
- actor
- timestamp
- module
- entity
- entity ID
- action
- before value where applicable
- after value where applicable
- reason where required
- request/correlation ID

### 6.5 UI Development
- Desktop-first for costing and administration.
- Tablet-first for approval and shop-floor functions.
- Mobile-first for management dashboard and sales functions.
- Keyboard navigation is required on costing data-entry screens.
- Large touch targets and high-contrast layouts are required for production screens.
- All forms require inline validation and server-error display.
- Long lists require pagination, filtering and sorting.

## 7. Definition of Done

A function is complete only when all applicable items are satisfied:

- UI screen implemented.
- API endpoint implemented.
- Service/business logic implemented.
- Database migration implemented.
- Permission checked server-side.
- Validation implemented client-side and server-side.
- Audit event implemented for mutations.
- Loading, empty, validation and error states implemented.
- Unit tests added.
- Integration tests added for API/database behavior.
- E2E test added for critical workflow.
- Export/print behavior tested where applicable.
- Documentation updated.
- No TypeScript build errors.
- No lint errors.
- Migration is reversible or has a documented rollback strategy.

## 8. Phase 1 Development Sequence

1. Project bootstrap, Docker, environment configuration.
2. PostgreSQL + Prisma schema and migrations.
3. Shared types, validation schemas and API response/error envelopes.
4. Authentication and session management.
5. User, role and permission management.
6. System settings/constants.
7. Master data framework.
8. Yarn/material master and rate history.
9. Decimal calculation engine + golden fixture tests.
10. Cost sheet header, warp and weft entry.
11. Cost summary, wastage, process charges, card cost and pricing.
12. Versioning and approval workflow.
13. Audit history.
14. Print/PDF/Excel import/export.
15. Reports and search.
16. Dashboard.
17. Backup/restore.
18. Full regression, security, performance and UAT.
19. Production deployment.

## 9. Development Acceptance Gates

| Gate | Required Result |
|---|---|
| Calculation | 100% match against acceptance fixture |
| Historical data | Master-rate changes do not modify saved cost sheets |
| Authorization | Unauthorized API calls return 403 |
| Validation | Invalid master/cost-sheet data cannot be persisted |
| Concurrency | Stale updates are rejected |
| Audit | All required mutations produce audit records |
| Search | Design-number search meets configured response target |
| Export | Print/PDF/Excel values match the application calculation |
| Regression | Golden fixture and historical corpus pass |
| Security | Authentication/session/security tests pass |
| Performance | Phase targets from technical requirements pass |
| Deployment | Fresh environment can be created from documented Docker/migration steps |

## 10. Source-Controlled Requirement Handling

- Preserve requirement IDs from the source where they exist.
- Do not change calculation formulas without updating the calculation fixture and test cases.
- Do not change database field semantics without a migration.
- New functions must have a module ID, function description, API contract, permission requirement, validation requirement and test case.
- Assumptions marked `[A-xx]` remain provisional until explicitly confirmed.
