# SEG CRM — Phase 2D.2.7: Local PostgreSQL 17 Staging Environment Readiness Report

**Document Version:** 1.0.0  
**Target Platform:** Windows 10/11 x64 Development Machine  
**Target Database Version:** PostgreSQL 17.x  
**Objective:** Local isolated staging database rehearsal for `docs/migrations-review/initial_migration_integrated.sql`  
**Classification:** READ-ONLY ENVIRONMENT AUDIT  

---

## 1. Local Environment Inspection Findings

An exhaustive inspection of the Windows development host was conducted across standard installation paths, environment variables, command-line binaries, and local ports.

### Inspection Evidence & Results:
1. **Command Binary Search (`where` / `PATH`):**
   - `psql`: **NOT FOUND**
   - `postgres` / `pg_ctl`: **NOT FOUND**
   - `docker`: **NOT FOUND**
   - `supabase` CLI: **NOT FOUND**
2. **Standard Filesystem Directory Audit:**
   - `C:\Program Files\PostgreSQL`: **NOT FOUND**
   - `C:\Program Files (x86)\PostgreSQL`: **NOT FOUND**
   - `C:\PostgreSQL`: **NOT FOUND**
   - `C:\tools\postgresql`: **NOT FOUND**
3. **Local Port Availability (Loopback `127.0.0.1`):**
   - Port 5432: **CLOSED** (No process listening)
   - Port 5433: **CLOSED** (No process listening)
   - Port 5434: **CLOSED** (No process listening)

### Conclusion:
**PostgreSQL 17 is NOT installed on this local Windows machine.** No local service or database server is available to host the staging rehearsal database.

---

## 2. Official PostgreSQL 17 Windows Installation Instructions

To establish a dedicated local staging database on Windows without touching the cloud Supabase projects, follow the official installation procedure:

### Option A: Official EnterpriseDB (EDB) Graphical Installer (Recommended for Windows)
1. **Download:**
   - Visit the official PostgreSQL download portal: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Download the **PostgreSQL 17.x (Windows x86-64)** installer provided by EnterpriseDB.
2. **Installation Wizard Steps:**
   - Run the installer executable (`postgresql-17.x-x-windows-x64.exe`) with administrator rights.
   - **Installation Directory:** Keep default (`C:\Program Files\PostgreSQL\17`).
   - **Components:** Select **PostgreSQL Server**, **pgAdmin 4**, and **Command Line Tools**. (Stack Builder can be unchecked).
   - **Data Directory:** Keep default (`C:\Program Files\PostgreSQL\17\data`).
   - **Superuser Password:** Enter a secure local password for the default `postgres` user (e.g. `postgres` or a password of your choice).
   - **Port:** Keep default `5432` (or set `5433` if you prefer isolating from any future default service).
   - **Locale:** Select `[Default locale]` or `English, United States`.
3. **Add CLI Tools to User Environment `PATH`:**
   Add `C:\Program Files\PostgreSQL\17\bin` to your Windows User or System `PATH` environment variable so `psql` and `pg_dump` can be executed from terminal sessions.
4. **Verification in PowerShell / Terminal:**
   Open a new terminal session and verify:
   ```powershell
   psql --version
   # Expected output: psql (PostgreSQL) 17.x
   ```

---

## 3. Post-Installation Isolated Database Setup Protocol (Preview)

Once PostgreSQL 17 is installed locally, create an isolated local database dedicated exclusively to SEG CRM staging:

```sql
-- Connect via psql as postgres
psql -U postgres -p 5432

-- Create dedicated isolated local database
CREATE DATABASE seg_crm_staging;
```

Then configure local staging environment variables in `packages/database/.env.local`:
```env
STAGING_DIRECT_URL="postgresql://postgres:<your_local_password>@127.0.0.1:5432/seg_crm_staging"
```

---

## 4. Final Verdict & Required Next Action

### **STATUS: NOT INSTALLED**

### Single Next Action:
**Download and run the official PostgreSQL 17 Windows installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) and complete the setup wizard.**
