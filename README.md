<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenCV-4.8+-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

# 🛡️ AttendAI — AI Attendance Assistant

> An intelligent, real-time biometric attendance monitoring system powered by computer vision and modern web technologies.

AttendAI replaces traditional manual roll calls with an automated face-recognition system that uses **OpenCV Haar Cascade classifiers** to detect student faces from live camera feeds, logs attendance in real-time via **Server-Sent Events (SSE)**, and generates beautifully styled **Excel reports** with monthly archiving capabilities.

---

## ✨ Features

| Feature | Description |
|:---|:---|
| 🎥 **Live Camera Scanner** | 3D animated classroom view with real-time face scanning and bounding box overlays |
| 🧠 **Face Detection** | OpenCV Haar Cascade classifier detects frontal faces from webcam/video frames |
| ⚡ **Real-time SSE Alerts** | Instant push notifications to all connected teacher panels via Server-Sent Events |
| 👤 **Student Verification Popup** | Side-by-side comparison card showing captured photo vs. database profile |
| 📊 **Daily Attendance Logs** | Filterable, paginated list of today's attendance entries with status pills |
| 📅 **Monthly Matrix Grid** | Color-coded calendar heatmap showing attendance status for every student per day |
| 📥 **Excel Export** | One-click download of styled multi-sheet workbooks with zebra striping |
| 🔄 **Monthly Reset & Archive** | Automatic/manual monthly archiving with database cleanup |
| 🎛️ **Teacher Dashboard** | Aggregated stats — Present count, Average Attendance %, Late, At-Risk students |
| 🖥️ **Responsive UI** | Modern React frontend with Tailwind CSS, works on desktop and tablet |

---

## 🏗️ System Architecture

AttendAI uses a **three-tier layered architecture** to isolate concerns:

```
┌────────────────────────────────────────────────────────┐
│                   Vite + React UI                      │  Client Layer
│  (Camera Canvas, Today/Monthly Table, Student Popup)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │  HTTP REST / SSE (Stream)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 FastAPI REST Backend                   │  Service Layer
│  (OpenCV Haar Engine, SSE Publisher, Excel Generator)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │  SQL Queries (sqlite3)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SQLite Database                      │  Data Layer
│         (students, attendance, app_settings)           │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Lucide Icons | UI rendering, styling, icon library |
| **Backend** | Python 3.10+, FastAPI, Uvicorn | REST API server, SSE event broadcasting |
| **Face Detection** | OpenCV (Haar Cascade) | Frontal face detection from image frames |
| **Database** | SQLite 3 | Persistent storage for students & attendance |
| **Excel Reports** | Pandas, openpyxl | Styled multi-sheet workbook generation |
| **Communication** | Server-Sent Events (SSE) | Real-time push updates to teacher panel |

---

## 📁 Project Structure

```
AttendAI/
├── README.md                     # ← You are here
├── LICENSE                       # MIT License
├── start.sh                      # One-click startup script (macOS/Linux)
├── start.bat                     # One-click startup script (Windows)
├── .gitignore                    # Git exclusions
├── srs_report.md                 # Software Requirements Specification
├── sas_report.md                 # System Architecture Specification
│
├── backend/                      # FastAPI Python Backend
│   ├── README.md                 # Backend-specific documentation
│   ├── requirements.txt          # Python dependencies
│   ├── app/
│   │   ├── main.py               # FastAPI app, routes, SSE, CORS
│   │   ├── database.py           # SQLite connection, CRUD, seed data
│   │   ├── attendance.py         # Excel generation, monthly reset/archive
│   │   └── face_recognizer.py    # OpenCV Haar Cascade face detection
│   └── data/
│       ├── database.db           # SQLite database file (auto-generated)
│       ├── profiles/             # Student profile photos
│       └── archive/              # Archived monthly Excel reports
│
└── frontend/                     # React + Vite Frontend
    ├── README.md                 # Frontend-specific documentation
    ├── package.json              # Node.js dependencies
    ├── vite.config.js            # Vite configuration
    ├── tailwind.config.js        # Tailwind CSS configuration
    ├── index.html                # HTML entry point
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Root component, SSE listener, state
        ├── App.css               # App-level styles
        ├── index.css             # Global Tailwind imports & base styles
        └── components/
            ├── TeacherPanel.jsx  # Main dashboard with tabs & stats
            ├── CameraFeed.jsx    # 3D classroom animation & scanner
            ├── TodayView.jsx     # Daily attendance log table
            ├── MonthlyView.jsx   # Monthly calendar matrix grid
            ├── StudentPopup.jsx  # Real-time verification popup card
            └── NotificationLog.jsx # Alert notification history
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

| Tool | Minimum Version | Download |
|:---|:---|:---|
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Bundled with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Quick Start (One Command)

**macOS / Linux:**
```bash
git clone https://github.com/YOUR_USERNAME/AttendAI.git
cd AttendAI
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
git clone https://github.com/YOUR_USERNAME/AttendAI.git
cd AttendAI
start.bat
```

### Manual Setup (Step by Step)

#### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/AttendAI.git
cd AttendAI
```

#### 2. Backend Setup
```bash
# Create and activate virtual environment
cd backend
python -m venv venv

# Activate (choose your OS):
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will be running at: **http://localhost:8000**

#### 3. Frontend Setup (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

The frontend will be running at: **http://localhost:5173**

#### 4. Open in Browser
Navigate to **http://localhost:5173** to access the AttendAI dashboard.

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Payload / Query |
|:---|:---|:---|:---|
| `GET` | `/api/students` | Returns list of all registered students | — |
| `GET` | `/api/attendance/today` | Returns attendance logs for today | — |
| `GET` | `/api/attendance/monthly` | Returns monthly attendance matrix grid | `?month=YYYY-MM` |
| `POST` | `/api/detect` | Scans webcam frame & marks attendance | `{"image": "base64..."}` |
| `POST` | `/api/simulate-detection` | Manually triggers detection (demo/test) | `?student_id=STU001&status=Present` |
| `POST` | `/api/attendance/reset` | Archives month data & resets database | `?month=YYYY-MM` |
| `GET` | `/api/attendance/archives` | Lists all archived Excel files | — |
| `GET` | `/api/attendance/download-archive` | Downloads an archived spreadsheet | `?filename=attendance_2026_06.xlsx` |
| `GET` | `/api/attendance/download-active` | Exports current month's spreadsheet | `?month=YYYY-MM` |
| `GET` | `/api/alerts` | Establishes real-time SSE stream | — |

---

## 🗄️ Database Schema

### `students` Table
| Column | Type | Constraint |
|:---|:---|:---|
| `student_id` | TEXT | PRIMARY KEY |
| `name` | TEXT | NOT NULL |
| `enrollment_no` | TEXT | NOT NULL, UNIQUE |
| `branch` | TEXT | NOT NULL |
| `division` | TEXT | NOT NULL |
| `profile_pic` | TEXT | NOT NULL |

### `attendance` Table
| Column | Type | Constraint |
|:---|:---|:---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `student_id` | TEXT | FOREIGN KEY → students |
| `date` | TEXT | NOT NULL |
| `timestamp` | TEXT | NOT NULL |
| `status` | TEXT | NOT NULL (`Present`, `Late`, `Absent`) |
| *(composite)* | | UNIQUE(student_id, date) |

### `app_settings` Table
| Column | Type | Constraint |
|:---|:---|:---|
| `key` | TEXT | PRIMARY KEY |
| `value` | TEXT | — |

---

## 📄 Documentation

| Document | Description |
|:---|:---|
| [SRS Report](srs_report.md) | Software Requirements Specification — functional/non-functional requirements |
| [SAS Report](sas_report.md) | System Architecture Specification — component design, DFD, schema, APIs |

---

## 🔄 Data Flow

### Real-Time Face Scan Flow
```
[Webcam/Demo] ──(Base64 Frame)──► [FastAPI /api/detect]
                                          │
                                          ▼ (Decode Image)
                                   [Haar Cascade Classifier]
                                          │
                                          ▼ (If Face Found)
                                   [SQLite: Mark Attendance]
                                          │
                                          ▼ (Generate Alert)
[Teacher Panel] ◄──(SSE Stream)◄── [SSE Broadcast Engine]
```

### Monthly Reset & Archive Flow
```
[Teacher Trigger] ──(POST /api/attendance/reset)──► [FastAPI]
                                                         │
                                                         ▼
                                              [Generate Excel Report]
                                              (Zebra styling & grids)
                                                         │
                                                         ▼
                                              [Save to data/archive/]
                                                         │
                                                         ▼
                                              [Delete DB Logs for Month]
[Teacher Panel] ◄──(SSE 'system_reset')◄──────── [DB Clean Commit]
```

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Aarju Dholariya**

---

## 🙏 Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python web framework
- [OpenCV](https://opencv.org/) — Computer vision library
- [React](https://react.dev/) — UI component library
- [Vite](https://vitejs.dev/) — Next-generation frontend build tool
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Lucide Icons](https://lucide.dev/) — Beautiful open-source icons
- [openpyxl](https://openpyxl.readthedocs.io/) — Excel file generation
