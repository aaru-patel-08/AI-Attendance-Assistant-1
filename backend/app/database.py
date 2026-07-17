import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "database.db")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        student_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enrollment_no TEXT NOT NULL UNIQUE,
        branch TEXT NOT NULL,
        division TEXT NOT NULL,
        profile_pic TEXT NOT NULL
    )
    """)
    
    # Create attendance table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students (student_id),
        UNIQUE(student_id, date)
    )
    """)
    
    # Create app_settings table to keep track of monthly reset state
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    
    # Check if we need to seed students
    cursor.execute("SELECT COUNT(*) FROM students")
    if cursor.fetchone()[0] == 0:
        seed_students = [
            ("STU001", "Aarav Sharma", "EN2024CS001", "Computer Engineering", "A", "/profiles/aarav.jpg"),
            ("STU002", "Ishita Patel", "EN2024IT042", "Information Technology", "B", "/profiles/ishita.jpg"),
            ("STU003", "Kabir Verma", "EN2024EC015", "Electronics & Communication", "A", "/profiles/kabir.jpg"),
            ("STU004", "Riya Sen", "EN2024CS089", "Computer Engineering", "B", "/profiles/riya.jpg"),
            ("STU005", "Neha Gupta", "EN2024CS023", "Computer Engineering", "A", "/profiles/neha.jpg"),
            ("STU006", "Dev Malhotra", "EN2024IT012", "Information Technology", "A", "/profiles/dev.jpg")
        ]
        cursor.executemany(
            "INSERT INTO students (student_id, name, enrollment_no, branch, division, profile_pic) VALUES (?, ?, ?, ?, ?, ?)",
            seed_students
        )
        
        # Seed some past attendance for testing the monthly dashboard
        # Let's seed for current month (July 2026) and previous month (June 2026)
        # Note: Let's assume dates are like 2026-06-01 to 2026-06-30
        past_attendance = []
        # June 2026: Seed some records to simulate past data
        for day in range(1, 31):
            date_str = f"2026-06-{day:02d}"
            # weekdays only
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            if dt.weekday() < 5:  # Monday - Friday
                # student 1 present 90%
                if day % 10 != 0:
                    past_attendance.append(("STU001", date_str, "09:05:12", "Present"))
                # student 2 present 80%
                if day % 5 != 0:
                    past_attendance.append(("STU002", date_str, "09:12:45", "Present"))
                # student 3 present 95%
                if day % 20 != 0:
                    past_attendance.append(("STU003", date_str, "08:58:30", "Present"))
                # student 4 present 70%
                if day % 3 != 0:
                    past_attendance.append(("STU004", date_str, "09:25:00", "Late"))
                # student 5 present 100%
                past_attendance.append(("STU005", date_str, "08:55:10", "Present"))
                # student 6 present 50%
                if day % 2 == 0:
                    past_attendance.append(("STU006", date_str, "09:02:15", "Present"))

        # July 2026 (current month: seed up to July 10, current date is July 11)
        for day in range(1, 11):
            date_str = f"2026-07-{day:02d}"
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            if dt.weekday() < 5:
                if day % 7 != 0:
                    past_attendance.append(("STU001", date_str, "09:02:11", "Present"))
                if day % 4 != 0:
                    past_attendance.append(("STU002", date_str, "09:08:44", "Present"))
                past_attendance.append(("STU003", date_str, "08:59:01", "Present"))
                if day % 3 != 0:
                    past_attendance.append(("STU004", date_str, "09:18:12", "Late"))
                past_attendance.append(("STU005", date_str, "08:54:18", "Present"))
                if day % 2 == 0:
                    past_attendance.append(("STU006", date_str, "09:04:12", "Present"))

        cursor.executemany(
            "INSERT OR IGNORE INTO attendance (student_id, date, timestamp, status) VALUES (?, ?, ?, ?)",
            past_attendance
        )
        
        # Set last archived month to June 2026 since we have June data (simulate that it hasn't archived July yet)
        cursor.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_archived_month', '2026-06')")
        
    conn.commit()
    conn.close()

def get_students():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students")
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return students

def get_student(student_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def mark_student_attendance(student_id, status="Present"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # Check if student exists
    cursor.execute("SELECT name FROM students WHERE student_id = ?", (student_id,))
    student = cursor.fetchone()
    if not student:
        conn.close()
        return None, "Student not found"
        
    # Check if already marked for today
    cursor.execute("SELECT * FROM attendance WHERE student_id = ? AND date = ?", (student_id, date_str))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return None, "Already marked today"
        
    cursor.execute(
        "INSERT INTO attendance (student_id, date, timestamp, status) VALUES (?, ?, ?, ?)",
        (student_id, date_str, time_str, status)
    )
    conn.commit()
    conn.close()
    
    return {
        "student_id": student_id,
        "name": student["name"],
        "date": date_str,
        "timestamp": time_str,
        "status": status
    }, None

def get_daily_attendance(date_str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.student_id, s.name, s.enrollment_no, s.branch, s.division, a.date, a.timestamp, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE a.date = ?
        ORDER BY a.timestamp DESC
    """, (date_str,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_monthly_attendance_summary(year_month):
    # returns list of students with attendance list for each day of the month
    # year_month format: YYYY-MM
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all students
    cursor.execute("SELECT student_id, name, enrollment_no, branch, division FROM students")
    students = [dict(row) for row in cursor.fetchall()]
    
    # Get attendance for the given month
    cursor.execute("""
        SELECT student_id, date, status, timestamp
        FROM attendance
        WHERE date LIKE ?
    """, (f"{year_month}-%",))
    attendance_records = cursor.fetchall()
    conn.close()
    
    # Build attendance map: student_id -> date -> {status, timestamp}
    att_map = {}
    for rec in attendance_records:
        sid = rec["student_id"]
        date = rec["date"]
        if sid not in att_map:
            att_map[sid] = {}
        att_map[sid][date] = {"status": rec["status"], "timestamp": rec["timestamp"]}
        
    return students, att_map

def get_setting(key, default=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_setting(key, value):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()
