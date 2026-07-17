# System Architecture Specification (SAS)
## For AI Attendance Assistant (AttendAI)

---

## 1. Architectural Representation

The system is designed using a **layered, three-tier architecture** to isolate concerns and support fast live stream processing.

```
┌────────────────────────────────────────────────────────┐
│                   Vite + React UI                      │  (Client Layer)
│  (Camera Canvas, Today/Monthly Table, Student Popup)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │  HTTP REST / SSE (Stream)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 FastAPI REST Backend                   │  (Service Layer)
│  (OpenCV Haar Engine, SSE Publisher, Excel Generator)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │  SQL Queries (sqlite3)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SQLite database                      │  (Data Layer)
│         (students, attendance, app_settings)           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 React Frontend Components
*   **`App.jsx`**: Coordinates global state, establishes the real-time SSE listener connection to the backend `/api/alerts` stream, and coordinates the presentation of the `StudentPopup` overlay.
*   **`TeacherPanel.jsx`**: Main dashboard view container. Coordinates tabs (Live Scanner, Day-to-Day logs, Monthly view) and displays quick stats.
*   **`CameraFeed.jsx`**: Renders the 3D classroom animation, moving student silhouettes, scanlines, and triggers match request simulation.
*   **`TodayView.jsx`**: Renders today's logs, filters list via clickable quick pills, and handles pagination.
*   **`MonthlyView.jsx`**: Displays a scrollable matrix grid mapping days of the month to student attendance.
*   **`StudentPopup.jsx`**: Slides in comparison cards showing live captured photos and database profile photos side-by-side.

### 2.2 FastAPI Backend Components
*   **`main.py`**: Declares API routers, mounts profile static directories, coordinates Server-Sent Event (SSE) active subscriber queues, and handles application lifecycles.
*   **`database.py`**: Manages the SQLite database file connection pool, seeds initial registries, and handles CRUD operations for marks, student lookups, and logs.
*   **`attendance.py`**: Handles generating multi-sheet Excel workbooks with openpyxl styles, managing archives, and executing database resets.
*   **`face_recognizer.py`**: Implements OpenCV v5-compatible Haar Cascade face classifiers to scan image matrices.

---

## 3. Data Flow Diagrams (DFD)

### 3.1 Real-Time Scan Flow
```
[Webcam/Demo] ───(Base64 String)───► [FastAPI /api/detect]
                                            │
                                            ▼ (Decode Image)
                                     [Haar Cascade Classifier]
                                            │
                                            ▼ (If Face Found)
                                     [sqlite3 Mark Attendance]
                                            │
                                            ▼ (Generate Alert Payload)
[Client Popup] ◄───(SSE Event Stream)◄── [SSE Broadcast Engine]
```

### 3.2 Monthly Reset & Archiving Flow
```
[Teacher Trigger] ───(POST /api/attendance/reset)───► [FastAPI Router]
                                                              │
                                                              ▼
                                                    [Generate Excel Report]
                                                    (Zebra styling & grids)
                                                              │
                                                              ▼
                                                    [Save to data/archive/]
                                                              │
                                                              ▼
                                                    [sqlite3 Delete Logs]
[Client Panels] ◄───(SSE Event 'system_reset') ◄─────── [DB Clean Commit]
```

---

## 4. Data Design (SQLite Schema)

### 4.1 `students` Table
Stores registered student identities.
```sql
CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enrollment_no TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL,
    division TEXT NOT NULL,
    profile_pic TEXT NOT NULL
);
```

### 4.2 `attendance` Table
Logs student status entries per day.
```sql
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students (student_id),
    UNIQUE(student_id, date)
);
```

### 4.3 `app_settings` Table
Keeps track of application states (e.g. last reset dates).
```sql
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
```

---

## 5. Interface Design (API Endpoints)

| Method | Endpoint | Description | Payload / Query |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/students` | Returns list of all registered students | None |
| **GET** | `/api/attendance/today` | Returns logs for current date | None |
| **GET** | `/api/attendance/monthly` | Returns matrix grid logs | `month` (YYYY-MM) |
| **POST** | `/api/detect` | Scans frame and marks next absent | `{"image": "base64"}` |
| **POST** | `/api/simulate-detection` | Manually triggers student scan | `student_id`, `status` |
| **POST** | `/api/attendance/reset` | Archives month and resets logs | `month` (YYYY-MM) |
| **GET** | `/api/attendance/archives` | Returns list of archived files | None |
| **GET** | `/api/attendance/download-archive` | Downloads archived spreadsheet | `filename` |
| **GET** | `/api/attendance/download-active` | Exports active monthly spreadsheet | `month` |
| **GET** | `/api/alerts` | Establish real-time SSE stream | None |
