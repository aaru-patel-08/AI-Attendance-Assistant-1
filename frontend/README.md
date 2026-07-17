# 🖥️ AttendAI — Frontend (React + Vite + Tailwind CSS)

The frontend is a modern **React 19** single-page application built with **Vite 8** and styled with **Tailwind CSS 4**. It provides a real-time teacher dashboard for monitoring student attendance.

---

## 📁 Component Overview

### `App.jsx` — Root Application Component
- Manages global application state (students, today's logs, alert history)
- Establishes SSE (Server-Sent Events) connection to `GET /api/alerts` for live updates
- Coordinates the real-time `StudentPopup` overlay when a face is detected
- Renders the top navigation bar with branding, notification bell, and profile section
- Configurable backend URL via `VITE_API_URL` environment variable

### `components/TeacherPanel.jsx` — Main Dashboard
- Primary container with tab navigation: **Live Scanner**, **Day-to-Day**, **Monthly**
- Displays aggregated quick-stat cards:
  - 🟢 **Present Today** — count of students marked present
  - 📊 **Avg Attendance** — monthly average percentage
  - ⏰ **Late Today** — count of late arrivals
  - ⚠️ **At-Risk** — students below 75% attendance threshold
- Manages tab switching and passes data to child components

### `components/CameraFeed.jsx` — Live Camera Scanner
- Renders a 3D perspective animated classroom with moving student silhouettes
- Displays sweeping scan lines and HUD-style timestamp overlays
- Handles webcam frame capture and sends base64 frames to `POST /api/detect`
- Shows bounding box overlays around detected faces
- Includes "Simulate Detection" buttons for demo/testing purposes

### `components/TodayView.jsx` — Daily Attendance Log
- Renders today's attendance entries in a clean sortable table
- Provides clickable filter pills: **All**, **Present**, **Late**, **Absent**
- Displays student profile photos, timestamps, and color-coded status badges
- Includes a refresh button and a download button for active month's Excel export

### `components/MonthlyView.jsx` — Monthly Matrix Grid
- Scrollable calendar heatmap mapping each day of the month to each student
- Color-coded cells: 🟢 Present, 🟡 Late, 🔴 Absent, ⬜ Weekend
- Shows attendance percentage per student with visual indicators
- Month navigation (previous/next) and archive download controls
- Integrates with `GET /api/attendance/monthly` endpoint

### `components/StudentPopup.jsx` — Real-time Verification Popup
- Animated slide-in card triggered by SSE `student_present` events
- Side-by-side comparison: live captured photo vs. database profile photo
- Displays student metadata: name, enrollment number, branch, division, status
- Auto-dismisses after a configurable timeout with progress bar animation

### `components/NotificationLog.jsx` — Alert History
- Chronological list of recent SSE events (last 25)
- Shows event type, student name, timestamp, and status
- Accessible via the notification bell in the top bar

---

## 🔧 Setup

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

### Production Build

```bash
npm run build
npm run preview
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `frontend/` directory to customize the backend URL:

```env
VITE_API_URL=http://localhost:8000
```

If not set, it defaults to `http://localhost:8000`.

---

## 📦 Dependencies

### Production
| Package | Version | Purpose |
|:---|:---|:---|
| `react` | ^19.2.7 | UI component library |
| `react-dom` | ^19.2.7 | React DOM renderer |
| `lucide-react` | ^1.24.0 | Modern open-source icon library |

### Development
| Package | Version | Purpose |
|:---|:---|:---|
| `vite` | ^8.1.1 | Next-generation build tool |
| `@vitejs/plugin-react` | ^6.0.3 | React support for Vite |
| `tailwindcss` | ^4.3.2 | Utility-first CSS framework |
| `@tailwindcss/postcss` | ^4.3.2 | Tailwind PostCSS integration |
| `postcss` | ^8.5.16 | CSS transformer |
| `autoprefixer` | ^10.5.2 | Automatic vendor prefixing |
| `oxlint` | ^1.71.0 | Fast JavaScript/TypeScript linter |

---

## 🔌 SSE Integration

The frontend establishes a persistent connection to the backend's SSE stream (`GET /api/alerts`). Events are handled as follows:

| Event Type | Action |
|:---|:---|
| `connected` | Connection handshake acknowledged |
| `student_present` | Triggers `StudentPopup` overlay, refreshes today's logs, adds to alert history |
| `system_reset` | Adds to alert history, refreshes today's logs |
