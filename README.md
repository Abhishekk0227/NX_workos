# NX Work OS — Enterprise Operations & Employee Management Platform

**NX Work OS** is a complete, production-grade enterprise workforce operations platform combining **Human Resources Administration** and **Employee Self-Service Operations**.

Built using the MERN stack with strict Role-Based Access Control (RBAC), server-verified timestamps, autonomous leave classification, immutable leave ledgers, and audit trails.

---

## 1. System Architecture & Features

### Exactly Two Dedicated Operational Panels
1. **HR Administrator Panel (7 Main Modules)**:
   - **Dashboard**: Real-time workforce KPIs (Present, Late, Working, Absent, Incomplete, Daily Reports, Pending Tasks, Payroll Status, and Attendance Distribution Chart).
   - **Employees**: Directory with automatic sequential IDs (`NX-EMP-001`), onboarding form, status toggle (Active/Inactive), password reset, and effective-dated salary profile configuration.
   - **Attendance**: Daily punch logs, shift grace period tracking, late arrival minutes, early departure minutes, pending attendance correction requests, and manual audit correction workflow.
   - **Tasks & Reports**: Directive task assignments to employees with due dates and real-time status, plus full inspection of employee Daily Work Reports with date and staff filters.
   - **Leave Management**: Leave policies configuration, review of employee leave applications, autonomous classification verification, and leave ledger inspection.
   - **Payroll (HR-Confidential)**: Monthly preview with gross pay, calendar days, payable days, LWP deduction calculations, interactive CL/SL-to-LWP conversion with audit logs, and payroll locking.
   - **Settings**: Shift templates (timings, required hours, grace periods), departments, designations, and company parameters.

2. **Employee Operations Portal (5 Mobile-First Modules)**:
   - **Home**: Live attendance status, server-verified Punch In / Punch Out actions, today's working hours, pending tasks summary, leave quota counters, and recent alerts.
   - **Tasks**: Personal To-Do checklist and official HR-assigned directives with status tracking.
   - **Attendance**: Punch logs, monthly working hours, and formal attendance correction request submission.
   - **Leave**: Apply for leave without punching in (autonomous classification based on quotas, cut-offs, and reason category). Live CL, SL, and LWP balances.
   - **Profile**: Organizational profile, contact info, shift details, and password change (employee APIs and screens strictly shield all compensation data).

---

## 2. Seeded Accounts & Credentials

The system comes pre-configured with seeds for testing matching the UI blueprints:

| Role | Name | Email | Password | Employee ID | Designation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HR Administrator** | HR Admin | `hr@nxworkos.com` | `Admin@NX2026` | *N/A (HR)* | Human Resources Admin |
| **Employee (Developer)** | Rahul Sharma | `rahul@nxworkos.com` | `Employee@123` | `NX001` | Developer |
| **Employee (Designer)** | Priya Sharma | `priya@nxworkos.com` | `Employee@123` | `NX002` | Designer |
| **Employee (QA)** | Rahul Verma | `rahul.verma@nxworkos.com` | `Employee@123` | `NX003` | QA Tester |
| **Employee (Operations)** | Sneha Patel | `sneha@nxworkos.com` | `Employee@123` | `NX004` | Operations Specialist |
| **Employee (Lead Dev)** | Vikram Singh | `vikram@nxworkos.com` | `Employee@123` | `NX005` | Developer |

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Lucide React, Recharts, Axios
- **Backend**: Node.js, Express.js, MongoDB with Mongoose ODM
- **Security**: Stateless JWT Bearer Authentication, bcryptjs password hashing, RBAC middleware
- **Data Integrity**: Server-side timestamping, Mongoose unique compound indexes, immutable `LeaveLedger`

---

## 4. Environment Variables

### Backend (`server/.env`)
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/nx_work_os
JWT_SECRET=nx_work_os_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d
INITIAL_HR_EMAIL=hr@nxworkos.com
INITIAL_HR_PASSWORD=Admin@NX2026
INITIAL_HR_NAME=HR Administrator
COMPANY_TIMEZONE=Asia/Kolkata
CLIENT_URL=http://localhost:5173
```

---

## 5. Running the Application Locally

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or MongoDB Atlas)

### Step 1: Start MongoDB
Ensure MongoDB is running on port 27017:
```powershell
mongod --dbpath "c:/Users/rajat/Desktop/NX_EMS_OS/data/db" --port 27017
```

### Step 2: Backend Setup & Seed
```powershell
cd server
npm install
npm run seed     # Populates HR user, default shifts, policies, and demo employees
npm start        # Starts Express server on http://localhost:5000
```

### Step 3: Frontend Setup & Run
```powershell
cd client
npm install --legacy-peer-deps
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### Step 4: Run Backend Tests
```powershell
cd server
npm test
```

---

## 6. Business Logic Highlights

1. **Exact Punch In**:
   - Employee enters assigned Employee ID (e.g. `NX-EMP-001`).
   - Server validates ID against authenticated user account.
   - Prevents duplicate active sessions.
   - Server-generated timestamp recorded only after confirmation.

2. **Exact Punch Out**:
   - Opens Daily Work Report form.
   - Requires bullet-point work summary.
   - Saves `DailyReport` in MongoDB.
   - Records server Punch Out timestamp and computes actual working hours.

3. **Autonomous Leave Classification**:
   - Employees apply without selecting leave codes.
   - Backend evaluates date conflicts, shift cut-offs, and `LeaveLedger` balances.
   - Auto-classifies as `CL`, `SL`, `LWP`, or `Split` based on reason category and priority.
   - Creates immutable debit records in `LeaveLedger`.

4. **CL/SL to LWP Conversion During Payroll Review**:
   - HR can convert paid leaves to LWP during payroll review.
   - Preserves original application history.
   - Restores employee's paid leave balance in `LeaveLedger` via reversal.
   - Debits LWP, recalculates payable days and net pay, and logs mandatory audit reason.
