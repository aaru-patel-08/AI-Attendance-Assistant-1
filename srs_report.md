# Software Requirements Specification (SRS)
## For AI Attendance Assistant (AttendAI)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the **AI Attendance Assistant (AttendAI)**. It describes the scope, functional and non-functional requirements, external interfaces, and system constraints. This document serves as the primary agreement between stakeholders and developers.

### 1.2 Scope
AttendAI is an automated, biometric attendance monitoring system. It replaces traditional manual roll calls with real-time computer vision face recognition. The software links with in-classroom camera streams, performs live face tracking, triggers instant teacher verification overlays, publishes live audit logs, and handles automatic monthly Excel sheet compilations and resets.

### 1.3 Definitions, Acronyms, and Abbreviations
*   **SRS**: Software Requirements Specification
*   **SAS**: System Architecture Specification (or Software Design Specification)
*   **SSE**: Server-Sent Events (push notification protocol)
*   **JIT**: Just-In-Time (Tailwind CSS compiler method)
*   **Haar Cascade**: Machine learning object detection algorithm used to identify faces in video frames.
*   **SQLite**: Serverless, self-contained relational database management engine.

---

## 2. Overall Description

### 2.1 Product Perspective
AttendAI operates as a full-stack web application. The backend runs on a lightweight FastAPI server interacting with an SQLite database and an OpenCV face-processing engine. The frontend is built on React, styled with Tailwind CSS, and uses dynamic canvases to render classroom video frames overlaid with live facial recognition bounding boxes.

### 2.2 Product Functions
*   **Live Stream Simulation**: Renders a 3D perspective of a classroom with active student silhouettes and sweeping scanning lines.
*   **Face Detection**: Scans frames for human faces using OpenCV's frontal face cascade model.
*   **Real-time Match Overlay**: Slides in a side-by-side comparison popup (Captured Photo vs. Database Photo) with matching confidence, student name, and class metadata.
*   **Teacher Panel**: Displays aggregated stats (Present, Average Attendance %, Late, At-Risk counts).
*   **Attendance Logging**: Records student entries into a daily log showing status (`Present`, `Late`, `Absent`).
*   **Excel Export & Archive**: Generates styled multi-sheet workbooks with zebra striping and color-coded status grids on request or monthly transitions.

### 2.3 User Classes and Characteristics
*   **Class Teacher / Professor**: Primary user. Interacts with the dashboard, views live logs, downloads active excel files, and manages monthly resets.
*   **Administrator**: Configures system parameters, registers student profiles, and retrieves archived files.

### 2.4 Operating Environment
*   **Operating System**: Cross-platform (macOS, Linux, Windows).
*   **Web Browsers**: Modern HTML5 browsers (Chrome, Safari, Firefox, Edge).
*   **Runtime Environment**: Python 3.10+ and Node.js v18+.

---

## 3. Specific Requirements

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces
*   **Dashboard Shell**: Includes navigation sidebar/tabs, header with login profiles, and notification center.
*   **Video Panel**: Canvas player showing active scanning status, HUD timestamps, and face tracking rectangles.
*   **Popup Overlays**: Modern slide-in card for real-time identification with timer countdown.
*   **Matrix Spreadsheet**: Interactive horizontal scroll table showing calendar dates and status codes.

#### 3.1.2 Hardware Interfaces
*   **Camera Input**: Supports standard webcams and RTSP/MJPEG classroom streams.

#### 3.1.3 Software Interfaces
*   **SQLite RDBMS**: Stores student details and attendance tables.
*   **OpenCV (cv2)**: Integrates with Python to parse image buffers.

---

## 4. Functional Requirements

### 4.1 Live Stream Processing
*   **FR-1.1**: The system shall process incoming frames at a rate of 1 frame per second.
*   **FR-1.2**: The system shall overlay bounding boxes around detected faces with matching status labels.

### 4.2 Biometric Student Recognition
*   **FR-2.1**: The system shall calculate confidence scores for identified faces.
*   **FR-2.2**: The system shall query the student database to fetch profiles corresponding to the matched biometric ID.

### 4.3 Real-Time Alerts
*   **FR-3.1**: The system shall push real-time events to all connected panels via Server-Sent Events (SSE).
*   **FR-3.2**: The frontend shall display a slide-in side-by-side verification popup upon receiving a recognition event.

### 4.4 Attendance Grid and Reset
*   **FR-4.1**: The system shall display aggregated daily logs and a monthly matrix grid.
*   **FR-4.2**: The system shall generate styled Multi-Sheet Excel Workbooks containing daily logs and monthly matrices upon reset.
*   **FR-4.3**: The system shall delete attendance database rows for the archived month to complete the reset.

---

## 5. Non-Functional Requirements

### 5.1 Performance
*   **Latency**: Face detection latency should be under 200ms per frame.
*   **SSE Syncing**: Real-time popups must trigger within 500ms of a successful match.

### 5.2 Security
*   **Directory Traversal Guard**: Download endpoints must sanitize requested file names.
*   **Database Constraints**: SQLite UNIQUE constraints shall prevent double marking on the same date.

### 5.3 Reliability
*   The system shall fall back to initials-based mock avatars if student profile photos are missing.
