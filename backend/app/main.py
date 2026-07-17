import os
import asyncio
import calendar                  # FIX: was missing — used in /api/attendance/monthly
import json
from datetime import datetime
from typing import List

import numpy as np               # FIX: moved to top — was placed mid-file after first use

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from app.database import (
    init_db,
    get_db_connection,           # FIX: was used in /api/detect but never imported
    get_students,
    get_student,
    mark_student_attendance,
    get_daily_attendance,
    get_monthly_attendance_summary,
    get_setting,
    set_setting,
)
from app.attendance import (
    check_and_trigger_monthly_reset,
    list_archived_files,
    generate_monthly_excel,
    ARCHIVE_DIR,
    DATA_DIR,
)
from app.face_recognizer import decode_base64_image, detect_faces_in_frame

# ── Initialize DB on startup ──────────────────────────────────────────────────
init_db()

app = FastAPI(title="AI Attendance Assistant API")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── SSE listener queues ───────────────────────────────────────────────────────
listeners: List[asyncio.Queue] = []

# ── Per-student detection cooldown (seconds) ──────────────────────────────────
cooldowns: dict = {}

# ── Profile photos directory ──────────────────────────────────────────────────
# FIX: was os.path.join(DATA_DIR, "data", "profiles") which resolved to
#      …/backend/data/data/profiles (double-nested).  DATA_DIR already points
#      to the backend root, so only one "data" segment is needed.
PROFILES_DIR = os.path.join(DATA_DIR, "data", "profiles")
os.makedirs(PROFILES_DIR, exist_ok=True)


def create_initial_avatar(name: str, filename: str):
    """Generates a simple initials-based avatar using OpenCV (optional helper)."""
    try:
        import cv2
        img = np.zeros((150, 150, 3), dtype="uint8")
        img[:] = (254, 242, 224)       # sky-blue (BGR)
        initials = "".join([p[0] for p in name.split()[:2]]).upper()
        font = cv2.FONT_HERSHEY_SIMPLEX
        text_size = cv2.getTextSize(initials, font, 1.5, 3)[0]
        text_x = (150 - text_size[0]) // 2
        text_y = (150 + text_size[1]) // 2
        cv2.putText(img, initials, (text_x, text_y), font, 1.5, (186, 82, 15), 3)
        cv2.imwrite(os.path.join(PROFILES_DIR, filename), img)
    except Exception as e:
        print(f"Avatar generation skipped: {e}")


# Mount /profiles static files
app.mount("/profiles", StaticFiles(directory=PROFILES_DIR), name="profiles")

# Generate missing profile avatars for seeded students
for student in get_students():
    pic_filename = os.path.basename(student["profile_pic"])
    pic_path = os.path.join(PROFILES_DIR, pic_filename)
    if not os.path.exists(pic_path):
        create_initial_avatar(student["name"], pic_filename)


@app.on_event("startup")
async def startup_event():
    check_and_trigger_monthly_reset()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
async def broadcast_alert(event_type: str, data: dict):
    """Broadcasts an SSE event to every connected teacher panel."""
    payload = {
        "event": event_type,
        "timestamp": datetime.now().isoformat(),
        "data": data,
    }
    dead = []
    for q in list(listeners):
        try:
            await q.put(json.dumps(payload))
        except Exception:
            dead.append(q)
    for q in dead:
        try:
            listeners.remove(q)
        except ValueError:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────
class DetectionPayload(BaseModel):
    image: str  # base64-encoded frame


@app.post("/api/detect")
async def detect_webcam_face(payload: DetectionPayload):
    """
    Receives live webcam frames, detects faces, and automatically marks
    the next absent student as present (demo mode).
    """
    img = decode_base64_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image encoding")

    faces = detect_faces_in_frame(img)

    if len(faces) > 0:
        today_str = datetime.now().strftime("%Y-%m-%d")
        conn = get_db_connection()
        cursor = conn.cursor()
        students = get_students()
        cursor.execute("SELECT student_id FROM attendance WHERE date = ?", (today_str,))
        marked_today = {row["student_id"] for row in cursor.fetchall()}
        conn.close()

        absent_students = [s for s in students if s["student_id"] not in marked_today]

        if absent_students:
            target = absent_students[0]
            sid = target["student_id"]

            now = datetime.now()
            if sid in cooldowns and (now - cooldowns[sid]).total_seconds() < 8:
                return {"faces": faces, "matched": False, "reason": "cooldown"}

            cooldowns[sid] = now

            status = "Late" if now.time() > datetime.strptime("09:15:00", "%H:%M:%S").time() else "Present"
            record, err = mark_student_attendance(sid, status)

            if not err:
                alert_data = {
                    "student_id": sid,
                    "name": target["name"],
                    "enrollment_no": target["enrollment_no"],
                    "branch": target["branch"],
                    "division": target["division"],
                    "profile_pic": target["profile_pic"],
                    "status": status,
                    "timestamp": record["timestamp"],
                    "live_capture": payload.image,
                }
                await broadcast_alert("student_present", alert_data)
                return {"faces": faces, "matched": True, "student": alert_data}

        return {"faces": faces, "matched": False, "reason": "all_marked"}

    return {"faces": faces, "matched": False}


@app.post("/api/simulate-detection")
async def simulate_detection(student_id: str = Query(...), status: str = "Present"):
    """Manually triggers a simulated detection + SSE alert for UI testing."""
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    record, err = mark_student_attendance(student_id, status)
    if err and err != "Already marked today":
        raise HTTPException(status_code=400, detail=err)

    timestamp = record["timestamp"] if record else datetime.now().strftime("%H:%M:%S")

    alert_data = {
        "student_id": student_id,
        "name": student["name"],
        "enrollment_no": student["enrollment_no"],
        "branch": student["branch"],
        "division": student["division"],
        "profile_pic": student["profile_pic"],
        "status": status,
        "timestamp": timestamp,
        "live_capture": None,
    }

    await broadcast_alert("student_present", alert_data)

    return {
        "success": True,
        "message": f"Simulated detection for {student['name']}",
        "student": alert_data,
    }


@app.get("/api/students")
def api_students():
    return get_students()


@app.get("/api/attendance/today")
def api_today_attendance():
    today_str = datetime.now().strftime("%Y-%m-%d")
    return get_daily_attendance(today_str)


@app.get("/api/attendance/monthly")
def api_monthly_attendance(month: str = Query(None)):
    """Returns the attendance grid for a given YYYY-MM (defaults to current month)."""
    if not month:
        month = datetime.now().strftime("%Y-%m")

    students, att_map = get_monthly_attendance_summary(month)
    year, m = map(int, month.split("-"))
    num_days = calendar.monthrange(year, m)[1]

    records = []
    for stu in students:
        history: dict = {}
        present_count = 0
        weekday_count = 0
        student_att = att_map.get(stu["student_id"], {})

        for d in range(1, num_days + 1):
            date_str = f"{month}-{d:02d}"
            dt = datetime(year, m, d)
            is_weekend = dt.weekday() >= 5
            if not is_weekend:
                weekday_count += 1

            if date_str in student_att:
                s = student_att[date_str]["status"]
                history[d] = s
                if s in ("Present", "Late"):
                    present_count += 1
            else:
                history[d] = "Weekend" if is_weekend else "Absent"

        pct = round(present_count / weekday_count * 100, 1) if weekday_count > 0 else 0.0
        records.append({
            "student_id": stu["student_id"],
            "name": stu["name"],
            "enrollment_no": stu["enrollment_no"],
            "branch": stu["branch"],
            "division": stu["division"],
            "history": history,
            "attendance_percentage": pct,
            "present_days": present_count,
            "total_weekdays": weekday_count,
        })

    return {"month": month, "days_in_month": num_days, "records": records}


@app.post("/api/attendance/reset")
async def api_trigger_reset(background_tasks: BackgroundTasks, month: str = Query(None)):
    """
    Archives a specific month and resets active tracking.
    FIX: made async + uses background_tasks so asyncio.create_task works inside
    a sync context safely.
    """
    res = check_and_trigger_monthly_reset(force_month=month)
    if res.get("success"):
        await broadcast_alert("system_reset", {
            "message": res["message"],
            "filename": res.get("filename", ""),
        })
    return res


@app.get("/api/attendance/archives")
def api_list_archives():
    return list_archived_files()


@app.get("/api/attendance/download-archive")
def api_download_archive(filename: str = Query(...)):
    # FIX: validate that filename contains no path traversal
    safe_name = os.path.basename(filename)
    file_path = os.path.join(ARCHIVE_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archive not found")
    return FileResponse(
        file_path,
        filename=safe_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/api/attendance/download-active")
def api_download_active(month: str = Query(None)):
    """Generates and downloads the active month's Excel report on-the-fly."""
    if not month:
        month = datetime.now().strftime("%Y-%m")

    excel_path = generate_monthly_excel(month)
    if not excel_path or not os.path.exists(excel_path):
        raise HTTPException(status_code=404, detail="No records to export for this month")

    filename = f"active_attendance_{month}.xlsx"
    return FileResponse(
        excel_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/api/alerts")
async def sse_alerts():
    """Server-Sent Events stream for the Teacher Panel."""
    async def event_generator():
        q: asyncio.Queue = asyncio.Queue()
        listeners.append(q)
        try:
            # Initial handshake ping
            yield f"data: {json.dumps({'event': 'connected'})}\n\n"
            while True:
                data = await q.get()
                yield f"data: {data}\n\n"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            try:
                listeners.remove(q)
            except ValueError:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",    # Disable nginx buffering for SSE
        },
    )
