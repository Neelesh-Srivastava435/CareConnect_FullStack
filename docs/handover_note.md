# Handover Note: Inherited CareConnect Telemedicine Backend
**Assignment 2 – Software System Development**  
**Inherited Project**: Project 4: CareConnect – On-Demand Telemedicine  
**Inherited Repository**: `https://github.com/Mihirbuddy/ssd_project.git` (Commit `7d9ff89`)  
**New Repository**: `https://github.com/Neelesh-Srivastava435/CareConnect_FullStack.git`

---

## 1. What Worked
The original team's PostgreSQL schema and database engine logic were well-architected and executed reliably:
* **Relational Schema (`sql/01_schema_ddl.sql`)**: Tables for `patients`, `clinics`, `appointments`, and `wallet_audit_logs` were cleanly created with proper Primary Keys and Foreign Key constraints with `ON DELETE RESTRICT`.
* **Stored Procedure (`sql/04_stored_procedures.sql`)**: The `book_appointment` procedure correctly acquired row-level locks in canonical order (`FOR UPDATE` on patients before `FOR SHARE` on clinics), successfully preventing deadlocks and concurrent over-spending.
* **Audit Trigger (`sql/03_triggers_and_audit.sql`)**: The `AFTER UPDATE` trigger `trg_wallet_audit` with the conditional `WHEN (OLD.hsa_balance IS DISTINCT FROM NEW.hsa_balance)` worked accurately, logging debit entries only on balance changes.
* **Partial Unique Index (`sql/02_indexes.sql`)**: The partial index `idx_active_consult` effectively prevented concurrent appointments in `WAITING` or `IN_CONSULTATION` states.
* **Data Seeding**: The Python PostgreSQL seeder seeded 100,100 ledger rows and 50,000 appointments in under 10 seconds.
* **MongoDB Aggregations**: The `$geoNear` pipeline and multi-faceted review analytics (`$facet` with `$unwind`) were logically sound.

---

## 2. What Did Not Work (Operational & Integration Issues)
During local setup and integration with the web layer, several discrepancies were discovered:
1. **Hardcoded Geospatial Coordinates & Missing 5km Radius**:
   * `mongo/02_workflow3_geonear.js` hardcoded Hyderabad coordinates (`[78.4867, 17.3850]`), enforced `$limit: 1`, and omitted the `maxDistance: 5000` (5 km) constraint required by Assignment 2.
2. **MongoDB SSL/TLS Connection Failure with Local Instances**:
   * `data_generation/mongo_seeder.py` unconditionally forced `tlsCAFile=certifi.where()`. While required for cloud MongoDB Atlas clusters, this caused immediate SSL handshake crashes (`[WinError 10054]`) when connecting to a standard local non-SSL MongoDB instance.
3. **Absence of Lifecycle Status Transitions**:
   * The inherited SQL scripts only allowed appointments to enter `'WAITING'` status. There was no mechanism to advance appointments to `'IN_CONSULTATION'` or `'DISCHARGED'`. Without this, once a patient booked an appointment, they were locked out forever by the partial unique index.
4. **Unhandled Database Exceptions**:
   * The stored procedure throws raw PL/pgSQL exceptions (`RAISE EXCEPTION`) on insufficient funds or active appointment conflicts. Without an API exception handler, clients received raw 500 Internal Server errors instead of informative business messages.

---

## 3. What We Changed and Why
To build a functional, production-ready web application matching Assignment 2 requirements, we implemented the following changes:
1. **Parameterized Geospatial Pipeline**:
   * In `api/routes/nurses.js`, we parameterized the `$geoNear` aggregation pipeline to accept dynamic origin coordinates (`lat`, `lng`), enforced the 5,000-meter radius (`maxDistance: 5000`), and returned proximity-sorted lists for the interactive dispatch map.
2. **Flexible MongoDB Connection in Seeder**:
   * Updated `data_generation/mongo_seeder.py` to inspect `MONGODB_URI`. It dynamically applies `tlsCAFile` only if connecting to MongoDB Atlas (`mongodb+srv://` or SSL parameters present), allowing seamless local and cloud execution.
3. **Appointment Lifecycle Transition API**:
   * Added `PATCH /api/appointments/:id/status` to advance appointments (`WAITING` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `DISCHARGED`). This enables evaluators to demonstrate live that discharging an appointment frees the patient from the partial unique index constraint.
4. **Structured Error Handling**:
   * In `api/routes/appointments.js`, wrapped procedure calls in structured error-parsing blocks that translate database errors into clean HTTP status codes (`400 INSUFFICIENT_FUNDS`, `409 ACTIVE_CONSULTATION_EXISTS`, `400 CLINIC_CLOSED`) with friendly guidance messages.
5. **Real-time Live Ping Simulator**:
   * Added `POST /api/nurses/simulate-ping` to allow evaluators to inject moving nurse telemetry and observe live UI polling updates without a full page reload.

---

## 4. Suggestions for the Original Authors
1. **Environment-Agnostic Database Clients**: Always check whether the connection string requires TLS before passing TLS certificate parameters in client libraries.
2. **Lifecycle Helpers**: In transactional schemas with status-dependent partial indexes, include transition procedures (e.g. `complete_appointment` or `discharge_patient`) alongside the creation procedure.
3. **API-Ready Analytics**: Structure aggregation and window queries so they can easily be parameterized by date range and geographic radius.
