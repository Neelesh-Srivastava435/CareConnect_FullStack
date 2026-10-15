# ==============================================================================
# CareConnect – Full-Stack Telemedicine System Makefile
# Software Systems Development (SSD CS6.302)
# ==============================================================================

.PHONY: help install install-api install-web install-python \
        db-init db-init-pg db-init-mongo db-seed db-seed-pg db-seed-mongo db-refresh-view \
        dev-api dev-web start test build clean package

# Default shell and configuration variables
SHELL := /bin/bash
PG_USER ?= postgres
PG_DATABASE ?= careconnect
PG_HOST ?= localhost
PG_PORT ?= 5432
MONGO_URI ?= mongodb://localhost:27017/careconnect
PYTHON ?= python
NPM ?= npm

# ------------------------------------------------------------------------------
# Help Menu
# ------------------------------------------------------------------------------
help:
	@echo "========================================================================"
	@echo " CareConnect – Build & Orchestration Commands"
	@echo "========================================================================"
	@echo " Setup & Dependencies:"
	@echo "   make install            - Install all backend, frontend & python deps"
	@echo "   make install-api        - Install Node.js dependencies for api/"
	@echo "   make install-web        - Install React/Vite dependencies for web/"
	@echo "   make install-python     - Install Python seeder requirements"
	@echo ""
	@echo " Database Management:"
	@echo "   make db-init            - Initialize both PostgreSQL and MongoDB schemas"
	@echo "   make db-init-pg         - Apply PostgreSQL DDL, triggers, and procedures"
	@echo "   make db-init-mongo      - Apply MongoDB collections, schemas, and indexes"
	@echo "   make db-seed            - Seed mock data (100k+ rows) across PG and Mongo"
	@echo "   make db-seed-pg         - Run PostgreSQL python seeder (with --truncate)"
	@echo "   make db-seed-mongo      - Run MongoDB python seeder (pings & reviews)"
	@echo "   make db-refresh-view    - Refresh clinic_monthly_discharges materialized view"
	@echo ""
	@echo " Development & Execution:"
	@echo "   make dev-api            - Start Express API backend server (port 5000)"
	@echo "   make dev-web            - Start Vite React frontend dev server (port 5173)"
	@echo "   make build              - Build production frontend bundle in web/dist"
	@echo "   make test               - Run Node.js backend integration test suite"
	@echo ""
	@echo " Utilities:"
	@echo "   make clean              - Clean build artifacts and temporary files"
	@echo "   make package            - Create clean submission zip (excludes node_modules)"
	@echo "========================================================================"

# ------------------------------------------------------------------------------
# Installation Targets
# ------------------------------------------------------------------------------
install: install-api install-web install-python
	@echo "✓ All dependencies successfully installed."

install-api:
	@echo "Installing API server dependencies..."
	cd api && $(NPM) install

install-web:
	@echo "Installing Web frontend dependencies..."
	cd web && $(NPM) install

install-python:
	@echo "Installing Python seeder dependencies..."
	$(PYTHON) -m pip install -r data_generation/requirements.txt

# ------------------------------------------------------------------------------
# Database Provisioning & Seeding
# ------------------------------------------------------------------------------
db-init: db-init-pg db-init-mongo
	@echo "✓ Both PostgreSQL and MongoDB databases successfully initialized."

db-init-pg:
	@echo "Applying PostgreSQL DDL, indexes, triggers, and stored procedures..."
	psql -U $(PG_USER) -h $(PG_HOST) -p $(PG_PORT) -d $(PG_DATABASE) -f sql/01_schema_ddl.sql
	psql -U $(PG_USER) -h $(PG_HOST) -p $(PG_PORT) -d $(PG_DATABASE) -f sql/02_indexes.sql
	psql -U $(PG_USER) -h $(PG_HOST) -p $(PG_PORT) -d $(PG_DATABASE) -f sql/03_triggers_and_audit.sql
	psql -U $(PG_USER) -h $(PG_HOST) -p $(PG_PORT) -d $(PG_DATABASE) -f sql/04_stored_procedures.sql
	psql -U $(PG_USER) -h $(PG_HOST) -p $(PG_PORT) -d $(PG_DATABASE) -f sql/05_materialized_views.sql

db-init-mongo:
	@echo "Applying MongoDB collections, schemas, and 2dsphere / TTL indexes..."
	mongosh "$(MONGO_URI)" --file mongo/01_collections_and_indexes.js

db-seed: db-seed-pg db-seed-mongo db-refresh-view
	@echo "✓ Full mock database seeding completed."

db-seed-pg:
	@echo "Running PostgreSQL seeder (patients, clinics, appointments, audit rows)..."
	$(PYTHON) data_generation/postgres_seeder.py --truncate

db-seed-mongo:
	@echo "Running MongoDB seeder (reviews, catalogs, nurse pings)..."
	$(PYTHON) data_generation/mongo_seeder.py

db-refresh-view:
	@echo "Refreshing PostgreSQL materialized view clinic_monthly_discharges..."
	psql -U $(PG_USER) -h $(PG_HOST) -p $(PG_PORT) -d $(PG_DATABASE) -c "REFRESH MATERIALIZED VIEW clinic_monthly_discharges;"

# ------------------------------------------------------------------------------
# Running Servers & Building
# ------------------------------------------------------------------------------
dev-api:
	@echo "Starting Express REST API server on port 5000..."
	cd api && $(NPM) run dev

dev-web:
	@echo "Starting Vite React frontend server on port 5173..."
	cd web && $(NPM) run dev

build:
	@echo "Building production bundle for web frontend..."
	cd web && $(NPM) run build

test:
	@echo "Running backend integration test suite..."
	cd api && $(NPM) test

# ------------------------------------------------------------------------------
# Maintenance & Packaging
# ------------------------------------------------------------------------------
clean:
	@echo "Cleaning up temporary files, caches, and build outputs..."
	rm -rf web/dist
	rm -rf web/node_modules/.vite
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✓ Clean complete."

package: clean
	@echo "Packaging project into clean CareConnect_Project_Submission.zip..."
	zip -r CareConnect_Project_Submission.zip . \
		-x "*/node_modules/*" \
		-x ".git/*" \
		-x "web/dist/*" \
		-x ".env" \
		-x "*.zip"
	@echo "✓ Submission package created: CareConnect_Project_Submission.zip"
