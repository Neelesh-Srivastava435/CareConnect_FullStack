# CareConnect Telemedicine: User Personas & Interaction Flows
**Assignment 2 – Software System Development (SSD)**  
**Project 4**: CareConnect – On-Demand Telemedicine  

---

## 1. Executive Overview & Design Philosophy
CareConnect is a hybrid-database telemedicine application built to bridge clinical record systems (PostgreSQL) with real-time operational and flexible document stores (MongoDB).

The user interface is crafted to guarantee:
* **Zero UI Freezes**: 100k+ records are browsed via server-side pagination (`LIMIT 15`, `OFFSET`) with sub-50ms API response times.
* **Immediate Feedback & Transparency**: Financial transactions visibly display pre- and post-balances alongside immutable audit ledger entries.
* **ACID & Constraint Clarity**: Database rejections (e.g., partial unique index conflicts, insufficient funds) are translated into friendly, actionable UI notices.
* **Responsive Visual Hierarchy**: High-contrast dark theme (slate navy `#0b1120`, sky blue `#0284c7`, emerald `#10b981`, amber `#f59e0b`) optimized for healthcare dashboard monitors and tablets.

---

## 2. Target User Personas

### Persona 1: Primary Care Patient
* **Name**: Jane Cooper
* **Age**: 34
* **Role**: Subscriber with an employer-sponsored Health Savings Account (HSA).
* **Goals**:
  * Easily locate open clinics and schedule on-demand telemedicine consultations.
  * Pay required copays directly from her pre-tax HSA balance.
  * Track every debit and credit in her personal wallet ledger without surprise deductions.
* **Pain Points**:
  * Being double-charged or accidentally booking conflicting visits when waiting for a doctor.
  * Cryptic error screens when balances run low.
* **Key Workflows Used**:
  * **Screen 1 (Browse)**: Search clinics by open status and view doctor specialties.
  * **Screen 2 (Workflow 1 – Book Appointment)**: Select clinic, review copay deduction, and confirm visit.
  * **Screen 3 (Audit Trail)**: Review timestamped ledger entries and running HSA balances.

---

### Persona 2: Clinic Operations Manager
* **Name**: Dr. Rajesh Sharma
* **Age**: 48
* **Role**: Administrative Medical Director overseeing a network of 25 ambulatory clinics.
* **Goals**:
  * Monitor daily copay revenues and analyze 7-day moving trends to balance staffing.
  * Benchmark performance against regional clinics using daily ranks (`DENSE_RANK()`).
  * Quickly check aggregate monthly patient discharge numbers without slow table scans.
  * Inspect patient feedback, average star scores, and bedside manner tags to maintain care standards.
* **Pain Points**:
  * Running slow analytical SQL queries that lock live transactional appointment tables.
  * Having to write ad-hoc MongoDB aggregations to review feedback tags.
* **Key Workflows Used**:
  * **Screen 4 (Workflow 2 – Window Analytics & Materialized View)**: Inspect 7-day moving averages, daily leaderboards, and trigger concurrent materialized view refreshes.
  * **Screen 6 (Workflow 4 – Review Analytics & Catalog)**: View star distributions, top tag clouds, and medication formulary details.

---

### Persona 3: Mobile Telehealth Dispatcher
* **Name**: Priya Menon
* **Age**: 29
* **Role**: Emergency Care & Home Health Coordinator.
* **Goals**:
  * Instantly pinpoint the nearest available mobile nurses within 5 km of an acute patient.
  * Observe live nurse GPS telemetry updating on a map without needing to refresh the page.
  * Dispatch urgent home visits based on exact geodesic distance in meters.
* **Pain Points**:
  * Static maps that require manual page reloads to show moving healthcare staff.
  * Dispatches assigned to nurses outside the effective 5 km coverage perimeter.
* **Key Workflows Used**:
  * **Screen 5 (Workflow 3 – Mobile Nurse Dispatch Map)**: Click anywhere or select a patient to see the 5 km coverage circle, proximity-ranked nurse list, and live polling telemetry.

---

## 3. End-to-End User Interaction Flows

```
[ Persona: Patient ]
         │
         ▼
[ Screen 1: Browse Clinics ] ──► Filter by "Accepting Patients" ──► Inspect Clinic
         │
         ▼
[ Screen 2: Book Visit ] ────► Check Current HSA Balance ($120.00)
         │                     Enter Copay ($50.00) ──► Click "Confirm Booking"
         ├───► If Balance < Copay ──────► [ Friendly Alert: Insufficient HSA Funds ]
         ├───► If Active Visit Exists ──► [ Friendly Alert: Blocked by Partial Index ]
         └───► Success ─────────────────► [ Balance Updates to $70.00 ]
                                          [ Real-time Proof: trg_wallet_audit Entry Displayed ]
         │
         ▼
[ Screen 3: Audit Trail ] ───► Filter by Date Range ──► View Chronological Debits & Credits

────────────────────────────────────────────────────────────────────────────────────────

[ Persona: Dispatcher ]
         │
         ▼
[ Screen 5: Nurse Dispatch ] ──► Click Map Location or Patient Coordinates
                                 5 km Perimeter Circle Drawn Dynamically
                                 MongoDB $geoNear Runs Spherical Calculation
                                 Nurses Sorted by Distance (meters & km)
                                 Live Telemetry Polled Every 4 Seconds (Zero Page Reload)

────────────────────────────────────────────────────────────────────────────────────────

[ Persona: Clinic Manager ]
         │
         ▼
[ Screen 4: Analytics ] ──────► View 7-Day Moving Avg Revenue Curve
                                Inspect Daily DENSE_RANK() Leaderboard
                                Inspect Pre-Computed clinic_monthly_discharges
                                Click "Refresh Materialized View" ──► Concurrent Refresh Toast
         │
         ▼
[ Screen 6: Reviews ] ────────► Filter by Specific Clinic or Global Fleet
                                View Star Rating Breakdown (1★ to 5★) via $facet
                                Inspect Most Frequent #tags (e.g. #attentive, #punctual)
                                Browse Polymorphic MedicalCatalogs (Doctors & Drugs)
```

---

## 4. UI Design System & Component Guidelines

| Element | Specification / Token | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#0b1120` (Deep Space Navy) | Global application background |
| **Glass Panel** | `rgba(15, 23, 42, 0.75)` + `backdrop-filter: blur(12px)` | Cards, tables, and modal containers |
| **Primary Accent** | `#0284c7` (Sky Blue) / `#38bdf8` (Bright Cyan) | Primary action buttons, active navigation tabs, links |
| **Success Accent** | `#10b981` (Emerald) / `#34d399` (Mint) | Credit badges, success toasts, verified trigger indicators |
| **Warning / Rating**| `#f59e0b` (Amber Gold) | Star ratings, rank #1 badges, waiting status |
| **Danger / Rejection**| `#f43f5e` (Rose) | Rejection banners, debit badges, insufficient funds warnings |
| **Typography** | `Inter`, system-ui, -apple-system, sans-serif | High legibility across desktop, tablet, and mobile |
| **Data Tables** | Fixed headers, zebra subtle row hover (`rgba(56, 189, 248, 0.04)`) | Browse tables, audit logs, rankings |
| **State Badges** | Rounded 6px pills with subtle borders and 15% opacity fills | Status tracking (`WAITING`, `IN_CONSULTATION`, `DISCHARGED`) |
