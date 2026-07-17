# 🔧 AttendAI — Backend (FastAPI + OpenCV)

The backend is a **FastAPI** REST API server that handles face detection, attendance CRUD operations, real-time SSE event broadcasting, and Excel report generation.

---

## 📁 Module Overview

### `app/main.py` — Application Entry Point
- Declares all API route handlers (10 endpoints)
- Configures CORS middleware for cross-origin requests
- Manages SSE (Server-Sent Events) subscriber queues for real-time broadcasting
- Mounts `/profiles` as a static file directory for student photos
- Handles per-student detection cooldowns to prevent duplicate markings
- Auto-generates initials-based avatars for students missing profile photos

### `app/database.py` — Database Layer
- Manages SQLite connection pool via `get_db_connection()`
- Creates and initializes three tables: `students`, `attendance`, `app_settings`
- Seeds 6 demo students with realistic attendance data (June + July 2026)
- Provides CRUD functions:
  - `get_students()` / `get_student(id)` — fetch student records
  - `mark_student_attendance(id, status)` — mark attendance with duplicate-day protection
  - `get_daily_attendance(date)` — fetch logs for a specific date
  - `get_monthly_attendance_summary(month)` — build student × date attendance map
  - `get_setting(key)` / `set_setting(key, value)` — read/write app settings

### `app/attendance.py` — Excel Reports & Monthly Reset
- `generate_monthly_excel(year_month)` — creates styled multi-sheet Excel workbooks:
  - **Sheet 1 — Monthly Summary Matrix**: Calendar grid with P/L/A status codes, color-coded cells, zebra striping, and attendance percentage column
  - **Sheet 2 — Daily Scan Logs**: Chronological list of all attendance entries
- `check_and_trigger_monthly_reset(force_month)` — detects calendar month transitions, archives previous month data, and clears database rows
- `list_archived_files()` — returns metadata for all `.xlsx` files in the archive directory

### `app/face_recognizer.py` — Computer Vision Engine
- Loads OpenCV Haar Cascade classifier with compatibility for both **OpenCV 4.x** and **OpenCV 5.x** (legacy module fallback)
- `decode_base64_image(base64_string)` — converts base64-encoded images (including data-URL format) to OpenCV BGR matrices
- `detect_faces_in_frame(img)` — runs Haar Cascade face detection with downscaling optimization for performance; returns bounding box coordinates

---

## 🔧 Setup

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Installation

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Running the Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API server will start at **http://localhost:8000**.

### API Documentation (Auto-generated)
FastAPI provides interactive API docs out of the box:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 📦 Dependencies

| Package | Version | Purpose |
|:---|:---|:---|
| `fastapi` | ≥ 0.100.0 | Web framework for REST API |
| `uvicorn` | ≥ 0.22.0 | ASGI server to run FastAPI |
| `pandas` | ≥ 2.0.0 | Data manipulation for Excel export |
| `openpyxl` | ≥ 3.1.0 | Excel workbook generation with styling |
| `python-multipart` | ≥ 0.0.6 | Form data parsing for file uploads |
| `opencv-python-headless` | ≥ 4.8.0 | Face detection (no GUI dependencies) |

---

## 📂 Data Directory

```
data/
├── database.db       # SQLite database (auto-created on first run)
├── profiles/         # Student profile photos (JPG)
│   ├── aarav.jpg
│   ├── ishita.jpg
│   ├── kabir.jpg
│   ├── riya.jpg
│   ├── neha.jpg
│   └── dev.jpg
└── archive/          # Archived monthly Excel reports
    ├── attendance_2026_06.xlsx
    └── attendance_2026_07.xlsx
```

> **Note**: The `database.db` file is auto-generated on first startup. If deleted, it will be re-created with seed data.

---

## 🛡️ Security Measures

- **Directory Traversal Guard**: The `/api/attendance/download-archive` endpoint sanitizes filenames using `os.path.basename()` to prevent path traversal attacks.
- **UNIQUE Constraints**: The `attendance` table enforces `UNIQUE(student_id, date)` to prevent duplicate entries for the same student on the same day.
- **Cooldown System**: Per-student detection cooldown (8 seconds) prevents rapid duplicate markings from continuous camera feeds.
