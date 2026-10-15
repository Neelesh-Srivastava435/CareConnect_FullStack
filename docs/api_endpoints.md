# CareConnect REST API Endpoints Specification

This document details all REST API endpoints provided by the `api/` server layer for the CareConnect telemedicine application.

Base URL: `http://localhost:5000`

---

## 1. System Health
### `GET /api/health`
Returns connection status of PostgreSQL and MongoDB.
* **Response `200 OK`**:
  ```json
  {
    "status": "HEALTHY",
    "timestamp": "2026-10-14T09:07:54.053Z",
    "databases": {
      "postgresql": "CONNECTED",
      "mongodb": "CONNECTED"
    }
  }
  ```

---

## 2. Patients & Demo User Switcher
### `GET /api/patients`
Retrieves a paginated list of patients with optional search.
* **Query Parameters**:
  * `page` (integer, default: 1)
  * `limit` (integer, default: 20)
  * `search` (string, optional: filter by patient name)
* **Response `200 OK`**:
  ```json
  {
    "patients": [
      { "id": "4bc13e5f-...", "name": "Aaron Jennings", "hsa_balance": "2290.86" }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 2000, "totalPages": 100 }
  }
  ```

### `GET /api/patients/demo/actors`
Returns a curated list of demo actors categorized for rapid viva demonstration:
* `READY`: Patients with sufficient balance and no active consultations.
* `LOW_BALANCE`: Patients with balance < $1.00 (triggers "Insufficient Funds" rejection).
* `ACTIVE_CONSULT`: Patients currently in WAITING or IN_CONSULTATION (triggers partial unique index rejection).

### `GET /api/patients/:id`
Returns single patient details, including current balance and active appointment object (if any).

---

## 3. Clinics
### `GET /api/clinics`
Paginated list of clinics with filtering.
* **Query Parameters**:
  * `page` (integer, default: 1)
  * `limit` (integer, default: 20)
  * `accepting` (boolean string: `"true"` or `"false"`)
  * `search` (string, optional)

### `GET /api/clinics/active/list`
Returns all clinics currently accepting patients (`is_accepting_patients = true`) for the appointment booking dropdown.

---

## 4. Appointments & Transactions (Workflow 1)
### `GET /api/appointments`
Paginated list of appointments with joined patient and clinic names.
* **Query Parameters**:
  * `page`, `limit`, `status` (`WAITING`, `IN_CONSULTATION`, `DISCHARGED`), `patientId`, `clinicId`.

### `POST /api/appointments/book`
Executes PostgreSQL stored procedure `CALL book_appointment(p_patient_id, p_clinic_id, p_copay_amount)`.
* **Request Body**:
  ```json
  {
    "patientId": "4bc13e5f-...",
    "clinicId": "31a14f8c-...",
    "copayAmount": 50.00
  }
  ```
* **Success Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Appointment booked successfully via atomic stored procedure!",
    "patient": {
      "id": "4bc13e5f-...",
      "name": "Aaron Jennings",
      "balanceBefore": 2290.86,
      "balanceAfter": 2240.86,
      "deducted": 50.00
    },
    "appointment": { "id": "...", "copay_amount": "50.00", "status": "WAITING" },
    "auditLogProof": {
      "id": "...",
      "amount_changed": "-50.00",
      "action_type": "DEBIT",
      "balance_after": "2240.86",
      "logged_at": "..."
    }
  }
  ```
* **Failure Responses**:
  * `400 Bad Request` (`INSUFFICIENT_FUNDS`): If balance < copay.
  * `409 Conflict` (`ACTIVE_CONSULTATION_EXISTS`): If patient already has an active appointment (enforced via `idx_active_consult` partial unique index).
  * `400 Bad Request` (`CLINIC_CLOSED`): If clinic is not accepting patients.

### `PATCH /api/appointments/:id/status`
Advances appointment status through its lifecycle (`WAITING` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `DISCHARGED`).
* **Request Body**: `{ "status": "IN_CONSULTATION" }` or `{ "status": "DISCHARGED" }`

---

## 5. Wallet Audit Trail
### `GET /api/audit/:patientId`
Retrieves chronological ledger entries from `wallet_audit_logs` for a patient.
* **Query Parameters**: `startDate`, `endDate` (optional ISO date strings).
* **Response `200 OK`**:
  ```json
  {
    "patient": { "id": "...", "name": "...", "hsa_balance": "2240.86" },
    "logs": [
      {
        "id": "...",
        "amount_changed": "-50.00",
        "action_type": "DEBIT",
        "balance_after": "2240.86",
        "logged_at": "..."
      }
    ]
  }
  ```

---

## 6. Window Analytics & Materialized View (Workflow 2)
### `GET /api/analytics/moving-average`
Executes SQL window analytics query computing 7-day moving average of copay revenue per clinic, ranked daily using `DENSE_RANK()`.
* **Query Parameters**: `days` (default: 30).

### `GET /api/analytics/discharges`
Queries the `clinic_monthly_discharges` Materialized View. Returns monthly discharge totals and `lastRefreshedAt`.

### `POST /api/analytics/refresh-discharges`
Executes `SELECT refresh_clinic_monthly_discharges();` to refresh the Materialized View concurrently.

---

## 7. Geospatial Mobile Nurse Dispatch (Workflow 3)
### `GET /api/nurses/nearest`
Executes MongoDB `$geoNear` aggregation pipeline on `NursePings`.
* **Query Parameters**:
  * `lat` (latitude float, e.g. `17.3850`)
  * `lng` (longitude float, e.g. `78.4867`)
  * `maxDistance` (meters float, default: `5000` = 5 km radius)
  * `limit` (integer, default: 20)
* **Response `200 OK`**:
  ```json
  {
    "origin": { "lat": 17.3850, "lng": 78.4867 },
    "radiusKm": "5.0",
    "count": 15,
    "nurses": [
      {
        "nurseId": "N19",
        "location": { "lat": 17.38505, "lng": 78.48694 },
        "distanceMeters": 27,
        "distanceKm": "0.03"
      }
    ]
  }
  ```

### `POST /api/nurses/simulate-ping`
Dispatches a new live nurse ping into `NursePings` near specified coordinates to demonstrate real-time map polling without a full page reload.

---

## 8. Review Analytics & Medical Catalogs (Workflow 4)
### `GET /api/reviews/analytics`
Executes MongoDB `$facet` aggregation pipeline returning rating distribution, top bedside-manner tags, and global average rating.

### `GET /api/catalogs`
Retrieves polymorphic documents from `MedicalCatalogs`.
* **Query Parameters**: `type` (`SPECIALIST` or `MEDICATION`).
