# CareConnect Telemedicine: UI Wireframes & Layout Blueprints
**Assignment 2 – Software System Development (SSD)**  
**Project 4**: CareConnect – On-Demand Telemedicine  

This document presents structural wireframes and interface blueprints for the 6 primary screens of CareConnect.

---

## Screen 1: Entity Browser (Large-Scale Data Viewer)
* **Objective**: Browse 2,000+ patients, 25 clinics, and 50,000+ appointments without client-side lag via server-side pagination (`LIMIT 15`, `OFFSET`).

```text
+--------------------------------------------------------------------------------------------------+
| CareConnect TELEMEDICINE    [Browse] [Book Appt (WF1)] [Audit] [Analytics] [Map] [Reviews]       |
|                                                     [Active Patient: Aaron Jennings | $2,290.86 v]|
+--------------------------------------------------------------------------------------------------+
|  [ Patients (2,000) ]   [ Clinics (25) ]   [ Appointments (50,000) ]                             |
|                                                                                                  |
|  [ Search by Name or UUID...            ]   [ Filter: All Statuses v ]   Total: 50,000 records   |
|                                                                                                  |
|  +--------------------------------------------------------------------------------------------+  |
|  | Patient Name         | Clinic Name          | Copay   | Status          | Date Created     |  |
|  +----------------------+----------------------+---------+-----------------+------------------+  |
|  | Aaron Jennings       | Apollo Telehealth    | $50.00  | [ WAITING    ]  | 2026-10-14 09:30 |  |
|  | Beatrice Miller      | City Care Hub        | $35.00  | [ IN_CONSULT ]  | 2026-10-14 09:15 |  |
|  | Charles Davis        | Metro Wellness       | $40.00  | [ DISCHARGED ]  | 2026-10-14 08:45 |  |
|  | ... (12 more rows)   | ...                  | ...     | ...             | ...              |  |
|  +--------------------------------------------------------------------------------------------+  |
|                                                                                                  |
|  Showing 1 - 15 of 50,000 records                        [ < Prev ]  Page 1 of 3334  [ Next > ]  |
+--------------------------------------------------------------------------------------------------+
|  [ Drawer / Detail Modal ]                                                                       |
|  Appointment ID: 8f9b2c1a-...   Patient: Aaron Jennings (HSA: $2,240.86)                         |
|  Clinic: Apollo Telehealth (Accepting: YES)   Copay: $50.00                                      |
|  Status Lifecycle Controls:  [ Advance to IN_CONSULTATION ]  [ Discharge Patient (Release Lock) ]|
+--------------------------------------------------------------------------------------------------+
```

---

## Screen 2: Transaction Workflow (Workflow 1 – Book Appointment)
* **Objective**: Execute atomic stored procedure `book_appointment`, verify HSA before/after balances, display trigger proof from `wallet_audit_logs`, and surface business rule rejections cleanly.

```text
+--------------------------------------------------------------------------------------------------+
| CareConnect TELEMEDICINE    [Browse] [Book Appt (WF1)*] [Audit] [Analytics] [Map] [Reviews]      |
+--------------------------------------------------------------------------------------------------+
| Workflow 1: Atomic Appointment Booking (book_appointment Stored Procedure)                       |
|                                                                                                  |
| +-----------------------------------------+  +-------------------------------------------------+ |
| | New Consultation Request                |  | HSA Financial Ledger Impact                     | |
| |                                         |  |                                                 | |
| | Patient Selector:                       |  | +-----------------------+ +-------------------+ | |
| | [ Search Patient Name / UUID...       ] |  | | HSA Balance Before    | | Projected After   | | |
| | Selected: Jane Cooper (ID: c4d1...)     |  | | $120.00               | | $70.00            | | |
| |                                         |  | +-----------------------+ +-------------------+ | |
| | Destination Clinic:                     |  |                                                 | |
| | [ Apollo Telehealth - Open (Lat/Lng)  v]|  | Database Enforcements in Play:                  | |
| |                                         |  | * SELECT FOR UPDATE prevents concurrent race.   | |
| | Copay Amount ($ USD):                   |  | * idx_active_consult blocks double booking.     | |
| | [ $50.00                              ] |  | * trg_wallet_audit writes debit ledger row.     | |
| |                                         |  |                                                 | |
| | [ Confirm & Book Appointment (PL/pgSQL) ]|  | Guaranteed ACID atomic execution.               | |
| +-----------------------------------------+  +-------------------------------------------------+ |
|                                                                                                  |
| [ Rejection Case: Insufficient Funds Banner ]                                                    |
| (!) Transaction Failed: Insufficient HSA balance.                                                |
|     Required: $50.00 | Available: $15.00 | Code: INSUFFICIENT_FUNDS                             |
|                                                                                                  |
| [ Success Case: Proof of Trigger Execution Box ]                                                 |
| (v) Appointment booked successfully via atomic stored procedure!                                 |
|     HSA Balance deducted from $120.00 to $70.00 (-$50.00).                                       |
|     +------------------------------------------------------------------------------------------+ |
|     | [Shield] Proof of Trigger Execution (wallet_audit_logs)      [TRIGGER trg_wallet_audit]  | |
|     | Audit ID: a9812f-... | Action: [DEBIT] | Amount: -$50.00 | Balance After: $70.00         | |
|     +------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

---

## Screen 3: HSA Wallet Audit Trail (Financial History)
* **Objective**: Read-only ledger of `wallet_audit_logs` for a selected patient with date range filtering and running balances.

```text
+--------------------------------------------------------------------------------------------------+
| CareConnect TELEMEDICINE    [Browse] [Book Appt] [Audit Trail*] [Analytics] [Map] [Reviews]       |
+--------------------------------------------------------------------------------------------------+
| HSA Wallet Audit Trail (Populated by trigger trg_wallet_audit on patients table)                 |
|                                                                                                  |
| Patient: [ Search Patient Name / UUID... (Default: Aaron Jennings)                             ] |
| Date Filter: From: [ 2026-10-01 ]  To: [ 2026-10-14 ]   [Clear Filters]  Total Entries: 42       |
|                                                                                                  |
| +----------------------------------------------------------------------------------------------+ |
| | Logged Timestamp      | Action Type | Amount Changed | Balance After    | Audit Log UUID     | |
| +-----------------------+-------------+----------------+------------------+--------------------+ |
| | 2026-10-14 09:30:12   | [v DEBIT  ] | -$50.00        | $2,240.86        | f18a2bc9-...       | |
| | 2026-10-10 14:15:00   | [^ CREDIT ] | +$500.00       | $2,290.86        | d47128ea-...       | |
| | 2026-10-05 11:20:45   | [v DEBIT  ] | -$35.00        | $1,790.86        | e8219c01-...       | |
| | ...                   | ...         | ...            | ...              | ...                | |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

---

## Screen 4: Clinic Analytics & Materialized View (Workflow 2)
* **Objective**: Interactive visualization of the 7-day moving average copay revenue, daily `DENSE_RANK()`, and concurrent refresh of `clinic_monthly_discharges`.

```text
+--------------------------------------------------------------------------------------------------+
| CareConnect TELEMEDICINE    [Browse] [Book Appt] [Audit] [Analytics (WF2)*] [Map] [Reviews]      |
+--------------------------------------------------------------------------------------------------+
| Workflow 2: SQL Window Analytics & Materialized View                                             |
|                                                                                                  |
| +----------------------------------------------------------------------------------------------+ |
| | Materialized View: clinic_monthly_discharges               Last Refreshed: 09:12:45 AM       |
| | Pre-computed monthly discharge summaries.                  [ Rotate: Refresh Concurrently ]  |
| |                                                                                              | |
| | [ Apollo: 420 Discharged ]  [ CityCare: 385 Discharged ]  [ Metro: 310 Discharged ]  ...     | |
| +----------------------------------------------------------------------------------------------+ |
|                                                                                                  |
| +----------------------------------------------------------------------------------------------+ |
| | Daily Clinic Leaderboard (DENSE_RANK & 7-Day Moving Avg)       Filter Date: [ 2026-10-14 ]   |
| | Computed via AVG(revenue) OVER (PARTITION BY clinic_id ORDER BY day ROWS 6 PRECEDING)       | |
| |                                                                                              | |
| | Rank   | Clinic Name            | Date       | Daily Revenue | 7-Day Moving Avg | Trend      | |
| |--------+------------------------+------------+---------------+------------------+------------| |
| | #1 GOLD| Apollo Telehealth      | 2026-10-14 | $2,450.00     | $2,210.50        | ▲ Above Avg| |
| | #2 SILV| City Care Ambulatory   | 2026-10-14 | $1,980.00     | $1,875.20        | ▲ Above Avg| |
| | #3 BRNZ| Metro Wellness Clinic  | 2026-10-14 | $1,650.00     | $1,710.00        | ▼ Below Avg| |
| | #4     | Jubilee Hills Care     | 2026-10-14 | $1,200.00     | $1,320.40        | ▼ Below Avg| |
| +----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

---

## Screen 5: Nearest Mobile Nurse Dispatch Map (Workflow 3)
* **Objective**: Geospatial map centered on a selectable patient or clinic, 5 km radius circle, proximity-sorted list, and live polling telemetry.

```text
+--------------------------------------------------------------------------------------------------+
| CareConnect TELEMEDICINE    [Browse] [Book Appt] [Audit] [Analytics] [Map (WF3)*] [Reviews]      |
+--------------------------------------------------------------------------------------------------+
| Workflow 3: Mobile Nurse Geospatial Dispatch (MongoDB $geoNear with 5km Radius)                  |
| Origin: Lat: 17.3850, Lng: 78.4867 (Hyderabad)  [Auto-Polling: ON (4s)]  [Simulate Live Ping]    |
|                                                                                                  |
| +--------------------------------------------------+  +----------------------------------------+ |
| | Interactive Leaflet Dispatch Map                 |  | Sorted Active Nurses (Within 5 km)     | |
| |                                                  |  | Found: 14 nurses in 5.0 km radius      | |
| |             * [Nurse #19] (27m)                  |  |                                        | |
| |         . - - - - - - - .                        |  | #1 Nurse N19                           | |
| |       '                   '                      |  |    Proximity: 27 m (0.03 km)           | |
| |      '        [P] Origin   '                     |  |    Status: Active | Lat/Lng: 17.38, 78.48| |
| |     '    * [N4] (850m)      '                    |  |                                        | |
| |     '                       '                    |  | #2 Nurse N4                            | |
| |      '   * [N102] (2.4km)  '                     |  |    Proximity: 850 m (0.85 km)          | |
| |       '                   '                      |  |    Status: Active                      | |
| |         ' - - - - - - - '                        |  |                                        | |
| |          (5 km Radius Circle)                    |  | #3 Nurse N102                          | |
| |                                                  |  |    Proximity: 2,410 m (2.41 km)        | |
| | (Click anywhere on the map to re-center origin)  |  |    Status: Active                      | |
| +--------------------------------------------------+  +----------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

---

## Screen 6: Patient Reviews & Flexible Catalog (Workflow 4)
* **Objective**: Display MongoDB `$facet` aggregation metrics across 100k+ reviews (star distribution, frequent tags, global average) alongside polymorphic `MedicalCatalogs`.

```text
+--------------------------------------------------------------------------------------------------+
| CareConnect TELEMEDICINE    [Browse] [Book Appt] [Audit] [Analytics] [Map] [Reviews & Catalog*]  |
+--------------------------------------------------------------------------------------------------+
| Workflow 4: Review Analytics ($facet & $unwind) & Flexible Medical Catalogs                      |
| Filter by Clinic: [ All Clinics (Global Fleet)                                                 v]|
|                                                                                                  |
| +-------------------+  +------------------------------------+  +-------------------------------+ |
| | Average Rating    |  | Star Distribution                  |  | Top Bedside Manner Tags       | |
| |                   |  |                                    |  |                               | |
| |   4.38 ★          |  | 5 ★ [====================] 62,410  |  | #attentive (24,150)           | |
| |                   |  | 4 ★ [==========          ] 28,100  |  | #gentle (18,920)              | |
| | Across 100,000    |  | 3 ★ [===                 ]  6,450  |  | #punctual (14,210)            | |
| | reviews           |  | 2 ★ [=                   ]  1,820  |  | #knowledgeable (11,400)       | |
| |                   |  | 1 ★ [=                   ]  1,220  |  | #caring (9,830)               | |
| +-------------------+  +------------------------------------+  +-------------------------------+ |
|                                                                                                  |
| Polymorphic Medical Catalogs (MedicalCatalogs Collection)        Filter: [ ALL ] [Specialists]   |
| +-------------------------------------+  +-----------------------------------------------------+ |
| | [SPECIALIST] Dr. Sarah Jenkins      |  | [MEDICATION] Amoxicillin 500mg                      | |
| | Cardiology Telehealth               |  | Form: Oral Capsule | Dosage: 500mg tid x 7 days     | |
| | Availability: Mon 9-1, Wed 2-6, Fri |  | Indications: Bacterial infections, ENT, skin       | |
| +-------------------------------------+  +-----------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```
