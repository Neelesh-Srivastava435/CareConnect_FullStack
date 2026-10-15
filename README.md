# CareConnect – On-Demand Telemedicine Platform
**Assignment 2 – Software System Development (SSD CS6.302)**  
**Project 4**: CareConnect (Hybrid Relational & Document Store Telemedicine System)

---

## 1. Repository & Submission Metadata

* **Forked / Development Repository**: [`https://github.com/Neelesh-Srivastava435/CareConnect_FullStack.git`](https://github.com/Neelesh-Srivastava435/CareConnect_FullStack.git)
* **Inherited Repository**: [`https://github.com/Mihirbuddy/ssd_project.git`](https://github.com/Mihirbuddy/ssd_project.git) (Inherited Commit: `7d9ff89`)
* **Final Submission Commit Hash**: `71ac8ec` *(Update to latest git rev before packaging)*
* **Walkthrough Demo Video (≤ 5 minutes)**: [DEMO VIDEO](https://iiithydstudents-my.sharepoint.com/personal/srivatsan_ramesh_students_iiit_ac_in/_layouts/15/stream.aspx?id=%2Fpersonal%2Fsrivatsan%5Framesh%5Fstudents%5Fiiit%5Fac%5Fin%2FDocuments%2FCareConnect%5FDemo%2Emov&nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&ga=1&referrer=StreamWebApp%2EWeb&referrerScenario=AddressBarCopied%2Eview%2Ee2ba23e3%2Ddd1a%2D4615%2D9606%2D7f0bc93293a2)

---

## 2. Team Contribution Table

| Team Member Name | Roll Number | Key Responsibilities & Contributions | Contribution % |
| :--- | :--- | :--- | :--- |
| **Aditya** | 2026204001 | Transaction Booking Engine & Core Frontend Setup (Workflow 1)*Focus:* The atomic appointment booking transaction, procedure error handling, balance validation, automated test suite, and core React application entry points. | 25% |
| **Neelesh Srivastava** | 2026201031 | System Architecture, Directory Browsing & Provisioning*Focus:* Node.js/Express server bootstrap, database connection pooling, large-scale entity browser with server-side pagination, and relational schemas. | 25% |
| **Srivatsan Ramesh** | 2026204010 |  Window Analytics & Audit Trail (Workflow 2)*Focus:* 7-day moving average revenue curves, daily leaderboards via DENSE_RANK(), concurrent materialized view refreshes, and wallet audit ledger trail. | 25% |
| **Akhilesh Senapati** | 2026201004 | Geospatial Dispatch & Review Analytics (Workflows 3 & 4)*Focus:* Interactive Leaflet map with 5 km proximity radius, live auto-polling telemetry, MongoDB $geoNear and $facet sentiment pipelines, and polymorphic catalogs. | 25% |

---

## 3. Technology Stack & Architectural Justifications

| Layer | Chosen Technology | Justification & Design Decision |
| :--- | :--- | :--- |
| **Relational Database** | **PostgreSQL 15+** | Relational integrity for financial ledgers, transactional consistency, PL/pgSQL atomic procedures, row-level locks (`SELECT FOR UPDATE`), audit triggers, and materialized views. |
| **Document Database** | **MongoDB 7.0+** | High-velocity geospatial coordinates (`2dsphere` index with TTL expiration) and polymorphic catalogs (`MedicalCatalogs`) + unstructured review sentiments. |
| **Backend API Layer** | **Node.js + Express** | Lightweight, asynchronous non-blocking I/O. Native PostgreSQL connection pooling (`pg`) and official MongoDB driver (`mongodb`). Minimal boilerplate; lets database engines do the heavy analytical lifting. |
| **Frontend Web App** | **React 18 + Vite** | Instant Hot Module Replacement (HMR), sub-5s production build, component-driven modularity. Zero bloated dependencies. |
| **Geospatial Mapping** | **Leaflet + OpenStreetMap** | Open-source, zero API keys required, lightweight interactive tiles, smooth 5 km dynamic radius circle rendering and live GPS ping markers. |
| **Styling & Aesthetics** | **Vanilla CSS + Glassmorphism** | Sleek healthcare dark theme (`#0b1120`, sky blue `#0284c7`, emerald `#10b981`), responsive layouts, zero build configuration overhead from utility frameworks. |

---

## 4. Repository Structure

```text
CareConnect_FullStack/
├── README.md                      # Setup instructions, architecture, contributions, demo link
├── docs/
│   ├── handover_note.md           # ~1-page reflection on inherited codebase (what worked, fixes made)
│   ├── api_endpoints.md           # Specification of all REST API endpoints
│   ├── mongo_schema_map.json      # MongoDB collections and index definitions
│   ├── relational_erd.png         # PostgreSQL relational schema ER diagram
│   └── design/
│       ├── user_personas_and_flows.md # User personas (Patient, Clinic Director, Dispatcher)
│       └── wireframes.md              # Layout blueprints for all 6 screens
├── sql/                           # PostgreSQL DDL, procedures, triggers, indexes, views
├── mongo/                         # MongoDB collection schemas, indexes, and queries
├── data_generation/               # Python seeders for PostgreSQL & MongoDB (100k+ rows)
├── performance/                   # Performance evidence (EXPLAIN ANALYZE & MongoDB stats)
├── api/                           # Node.js/Express server layer
│   ├── db/                        # PostgreSQL pool & MongoDB client connections
│   ├── routes/                    # Modular REST route handlers
│   ├── tests/                     # Automated test suite (6 passing integration tests)
│   └── server.js                  # Express application entrypoint
├── Makefile                       # Orchestration commands (make install, make test, etc.)
└── web/                           # Vite + React web frontend
    ├── src/
    │   ├── components/            # 6 Workflow screens & searchable selectors
    │   ├── App.jsx                # Tab navigation & global user switcher
    │   └── index.css              # Custom healthcare design system
    └── package.json
```

---

## 5. Quick-Start Setup & Execution Guide

You can either run the steps manually or use the provided **`Makefile`**:
* `make install` – Install all backend, frontend, and python dependencies
* `make db-init` – Initialize both PostgreSQL schema/logic and MongoDB collections/indexes
* `make db-seed` – Seed mock data (100k+ rows)
* `make test` – Run the 6 automated integration tests
* `make dev-api` / `make dev-web` – Launch the backend and frontend dev servers

### Step 1: PostgreSQL Setup
Ensure PostgreSQL is running locally on port 5432:
```bash
# 1. Create the database
createdb -U postgres careconnect

# 2. Apply all SQL DDL and logic scripts in strict order:
psql -U postgres -d careconnect -f sql/01_schema_ddl.sql
psql -U postgres -d careconnect -f sql/02_indexes.sql
psql -U postgres -d careconnect -f sql/03_triggers_and_audit.sql
psql -U postgres -d careconnect -f sql/04_stored_procedures.sql
psql -U postgres -d careconnect -f sql/05_materialized_views.sql
```

### Step 2: MongoDB Setup
Ensure MongoDB is running locally on port 27017 (or use MongoDB Atlas):
```bash
mongosh "mongodb://localhost:27017/careconnect" --file mongo/01_collections_and_indexes.js
```

### Step 3: Environment Variables
Create a root `.env` file (configured in `.gitignore`):
```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=careconnect
PG_USER=postgres
PG_PASSWORD=7786

MONGO_URI=mongodb://localhost:27017/careconnect
MONGO_DB=careconnect

PORT=5000
```

### Step 4: Seed Mock Data (100,000+ Records)
```bash
# Install Python dependencies
pip install -r data_generation/requirements.txt

# Seed PostgreSQL (2,000 patients, 25 clinics, 50,000 appointments, 100,100 audit rows)
python data_generation/postgres_seeder.py --dsn "postgresql://postgres:7786@localhost:5432/careconnect" --truncate

# Seed MongoDB (4 catalogs, 100,000 patient reviews, 500,000 nurse pings)
python data_generation/mongo_seeder.py

# Refresh the Materialized View initially
psql -U postgres -d careconnect -c "REFRESH MATERIALIZED VIEW clinic_monthly_discharges;"
```

### Step 5: Start the Backend API Layer
```bash
cd api
npm install
node server.js
```
* API Server runs on **`http://localhost:5000`**
* Health check: `http://localhost:5000/api/health`

### Step 6: Start the Frontend Application
Open a new terminal:
```bash
cd web
npm install
npm run dev
```
* Open **`http://localhost:5173`** in your browser.

---

## 6. Running Automated Tests

Run the backend integration test suite verifying health check, server-side pagination, stored procedure execution, trigger firings, partial unique index rejections, `$geoNear`, and `$facet`:
```bash
cd api
npm test
```
**Expected Test Results**:
```text
TAP version 13
# Subtest: CareConnect Automated Test Suite
    ok 1 - 1. Health check returns healthy and both databases connected
    ok 2 - 2. Paginated patients browsing respects limit and returns metadata
    ok 3 - 3. Booking transaction rejects when HSA balance is insufficient
    ok 4 - 4. Booking transaction rejects when active appointment conflict exists (partial unique index)
    ok 5 - 5. Workflow 3 ($geoNear) returns active mobile nurses within 5 km radius
    ok 6 - 6. Workflow 4 ($facet) returns rating distribution across all 5 stars and frequent tags
1..6
# tests 6 | suites 1 | pass 6 | fail 0
```

---

## 7. Screen-by-Screen Implementation & Verification Matrix

| Screen | Core Feature & Database Object | User Capabilities & Rubric Requirements |
| :--- | :--- | :--- |
| **Screen 1: Browse** | `patients`, `clinics`, `appointments` | Server-side pagination (`LIMIT 15`, `OFFSET`); search by patient name or UUID; filter clinics by "Accepting Patients"; filter appointments by status; detail inspection drawer modal. |
| **Screen 2: Transaction (WF1)** | Stored procedure `book_appointment` | Atomically books appointment; displays HSA balance before and after; surfaces business rejections (`INSUFFICIENT_FUNDS`, `ACTIVE_CONSULTATION_EXISTS`, `CLINIC_CLOSED`); displays verified `wallet_audit_logs` entry proving `trg_wallet_audit` fired. |
| **Screen 3: Audit Trail** | Trigger ledger `wallet_audit_logs` | Search any patient; filter by date range; displays chronological transactions, green/red badges for `CREDIT`/`DEBIT`, and exact running balances. |
| **Screen 4: Analytics (WF2)** | SQL Window CTE & `clinic_monthly_discharges` | 7-day moving average copay revenue via `AVG(revenue) OVER (...)`; daily clinic leaderboard ranked via `DENSE_RANK()`; displays materialized view summaries with "Last Refreshed" timestamp and one-click concurrent refresh button. |
| **Screen 5: Map (WF3)** | MongoDB `$geoNear` on `NursePings` | Interactive Leaflet map; selectable patient/clinic origin; renders 5 km coverage perimeter circle; sorted proximity nurse list; auto-polls every 4 seconds without page reload; includes "Simulate Live Nurse Ping" button for viva evaluation. |
| **Screen 6: Reviews (WF4)** | MongoDB `$facet` & `MedicalCatalogs` | Multi-faceted analytics across 100,000+ reviews: star distribution chart (1★ to 5★), top bedside manner tag cloud via `$unwind`, and global average; filterable by clinic; polymorphic medical catalogs (specialists & medications). |
| **Global Controls** | Demo Actor Switcher & Lifecycle Transitions | Instant actor switching in top navbar without login; interactive appointment lifecycle buttons (`WAITING` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `DISCHARGED`) to demonstrate releasing locks under `idx_active_consult`. |

---

## 8. Database Engine Logic & Performance Evidence

1. **Atomic Stored Procedure (`book_appointment`)**:
   * Uses `SELECT ... FOR UPDATE` on `patients` to lock the patient record against concurrent race conditions.
   * Checks that clinic `is_accepting_patients = true`.
   * Checks `hsa_balance >= copay_amount`; deducts balance if valid.
   * `AFTER UPDATE` trigger `trg_wallet_audit` fires automatically, writing an immutable audit record to `wallet_audit_logs`.
   * Inserts appointment record. If the patient already has an active appointment, the partial unique index `idx_active_consult` (`WHERE status IN ('WAITING', 'IN_CONSULTATION')`) raises a unique violation, automatically aborting the transaction.

2. **Workflow 2 Index-Only Scan**:
   * Covered by `idx_appointments_discharged_analytics (created_at) INCLUDE (clinic_id, copay_amount)`.
   * Query plans prove zero heap fetches (`Heap Fetches: 0`), executing in ~30 ms across 50,000 rows.

3. **Workflow 3 Geospatial Query (`$geoNear`)**:
   * Powered by a `2dsphere` spatial index on `NursePings.location`.
   * Operates under `GEO_NEAR_2DSPHERE` execution stage within the 5,000-meter threshold without full collection scanning.
   * Temporary pings auto-expire via a 2-hour TTL index (`expireAfterSeconds: 7200`).

---