import os
import calendar
from datetime import datetime, timedelta
import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.database import (
    get_db_connection,
    get_setting,
    set_setting,
    get_monthly_attendance_summary,
    DB_PATH
)

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE_DIR = os.path.join(DATA_DIR, "data", "archive")

def ensure_dirs():
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "data", "profiles"), exist_ok=True)

def get_days_in_month(year, month):
    num_days = calendar.monthrange(year, month)[1]
    return [datetime(year, month, day) for day in range(1, num_days + 1)]

def generate_monthly_excel(year_month):
    """
    Generates a beautifully styled Excel workbook for the given month.
    Contains two sheets: 'Attendance Log' and 'Monthly Grid Summary'.
    """
    ensure_dirs()
    year, month = map(int, year_month.split("-"))
    month_name = calendar.month_name[month]
    
    students, att_map = get_monthly_attendance_summary(year_month)
    
    if not students:
        return None
        
    excel_path = os.path.join(ARCHIVE_DIR, f"attendance_{year}_{month:02d}.xlsx")
    
    # ------------------
    # Sheet 1: Daily Log
    # ------------------
    log_rows = []
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.date, a.timestamp, s.student_id, s.name, s.enrollment_no, s.branch, s.division, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE a.date LIKE ?
        ORDER BY a.date ASC, a.timestamp ASC
    """, (f"{year_month}-%",))
    for r in cursor.fetchall():
        log_rows.append(dict(r))
    conn.close()
    
    df_log = pd.DataFrame(log_rows)
    if df_log.empty:
        df_log = pd.DataFrame(columns=["date", "timestamp", "student_id", "name", "enrollment_no", "branch", "division", "status"])
        
    df_log.columns = [c.replace("_", " ").title() for c in df_log.columns]
    
    # ------------------
    # Sheet 2: Monthly Grid
    # ------------------
    num_days = calendar.monthrange(year, month)[1]
    grid_headers = ["Student ID", "Name", "Enrollment No", "Branch", "Division"]
    day_cols = [f"{d:02d}" for d in range(1, num_days + 1)]
    grid_headers.extend(day_cols)
    grid_headers.extend(["Present Days", "Total Weekdays", "Attendance %"])
    
    grid_rows = []
    for stu in students:
        row = [
            stu["student_id"],
            stu["name"],
            stu["enrollment_no"],
            stu["branch"],
            stu["division"]
        ]
        
        present_count = 0
        weekday_count = 0
        
        student_att = att_map.get(stu["student_id"], {})
        
        for d in range(1, num_days + 1):
            date_str = f"{year_month}-{d:02d}"
            dt = datetime(year, month, d)
            is_weekend = dt.weekday() >= 5
            
            if not is_weekend:
                weekday_count += 1
                
            if date_str in student_att:
                status = student_att[date_str]["status"]
                short_status = "P" if status == "Present" else "L" if status == "Late" else "A"
                if short_status in ["P", "L"]:
                    present_count += 1
                row.append(short_status)
            else:
                row.append("A" if not is_weekend else "-")  # Absent on weekday, dash on weekend
                
        att_pct = (present_count / weekday_count * 100) if weekday_count > 0 else 0.0
        row.extend([present_count, weekday_count, round(att_pct, 1)])
        grid_rows.append(row)
        
    df_grid = pd.DataFrame(grid_rows, columns=grid_headers)
    
    # Write to Excel with styling
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        df_grid.to_excel(writer, sheet_name="Monthly Summary Matrix", index=False)
        df_log.to_excel(writer, sheet_name="Daily Scan Logs", index=False)
        
        # Styles
        font_family = "Segoe UI"
        header_fill = PatternFill(start_color="0F52BA", end_color="0F52BA", fill_type="solid") # Deep Trust Blue
        header_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")
        title_font = Font(name=font_family, size=14, bold=True, color="0F52BA")
        normal_font = Font(name=font_family, size=10)
        bold_font = Font(name=font_family, size=10, bold=True)
        
        border_thin = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        present_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid") # Light green
        late_fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid") # Light yellow
        absent_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid") # Light red
        weekend_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid") # Grey
        
        # Style Sheet 1: Monthly Summary Matrix
        ws_grid = writer.sheets["Monthly Summary Matrix"]
        ws_grid.views.sheetView[0].showGridLines = True
        
        # Add a title row if we want, or just style the headers
        ws_grid.row_dimensions[1].height = 28
        for col_idx in range(1, len(grid_headers) + 1):
            cell = ws_grid.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            
        for row_idx in range(2, len(grid_rows) + 2):
            ws_grid.row_dimensions[row_idx].height = 20
            # Zebra stripe
            is_stripe = row_idx % 2 == 0
            row_fill = zebra_fill if is_stripe else None
            
            for col_idx in range(1, len(grid_headers) + 1):
                cell = ws_grid.cell(row=row_idx, column=col_idx)
                cell.font = normal_font
                cell.border = border_thin
                cell.alignment = Alignment(horizontal="center", vertical="center")
                
                # Check column value for status color
                header_name = grid_headers[col_idx - 1]
                if header_name in day_cols:
                    val = cell.value
                    if val == "P":
                        cell.fill = present_fill
                        cell.font = Font(name=font_family, size=10, bold=True, color="166534")
                    elif val == "L":
                        cell.fill = late_fill
                        cell.font = Font(name=font_family, size=10, bold=True, color="854D0E")
                    elif val == "A":
                        cell.fill = absent_fill
                        cell.font = Font(name=font_family, size=10, bold=True, color="991B1B")
                    elif val == "-":
                        cell.fill = weekend_fill
                        cell.font = Font(name=font_family, size=10, color="94A3B8")
                else:
                    if row_fill:
                        cell.fill = row_fill
                    if header_name in ["Student ID", "Name"]:
                        cell.alignment = Alignment(horizontal="left", vertical="center")
                    if header_name == "Attendance %":
                        cell.font = bold_font
                        val = cell.value
                        if val is not None:
                            if val >= 90:
                                cell.font = Font(name=font_family, size=10, bold=True, color="166534")
                            elif val < 75:
                                cell.font = Font(name=font_family, size=10, bold=True, color="991B1B")
                                
        # Autofit columns
        for col in ws_grid.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_grid.column_dimensions[col_letter].width = max(max_len + 3, 10)
            
        # Style Sheet 2: Daily Scan Logs
        ws_log = writer.sheets["Daily Scan Logs"]
        ws_log.views.sheetView[0].showGridLines = True
        ws_log.row_dimensions[1].height = 28
        
        for col_idx in range(1, len(df_log.columns) + 1):
            cell = ws_log.cell(row=1, column=col_idx)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            
        for row_idx in range(2, len(df_log) + 2):
            ws_log.row_dimensions[row_idx].height = 20
            is_stripe = row_idx % 2 == 0
            row_fill = zebra_fill if is_stripe else None
            
            status_val = ws_log.cell(row=row_idx, column=8).value # Status column
            
            for col_idx in range(1, len(df_log.columns) + 1):
                cell = ws_log.cell(row=row_idx, column=col_idx)
                cell.font = normal_font
                cell.border = border_thin
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if row_fill:
                    cell.fill = row_fill
                
                # Align text columns left
                col_name = df_log.columns[col_idx - 1]
                if col_name in ["Student Id", "Name", "Enrollment No"]:
                    cell.alignment = Alignment(horizontal="left", vertical="center")
                
                # Color code status
                if col_name == "Status":
                    if status_val == "Present":
                        cell.fill = present_fill
                        cell.font = Font(name=font_family, size=10, bold=True, color="166534")
                    elif status_val == "Late":
                        cell.fill = late_fill
                        cell.font = Font(name=font_family, size=10, bold=True, color="854D0E")
                    else:
                        cell.fill = absent_fill
                        cell.font = Font(name=font_family, size=10, bold=True, color="991B1B")

        for col in ws_log.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_log.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
    return excel_path

def check_and_trigger_monthly_reset(force_month=None):
    """
    Checks if we have transitioned to a new calendar month.
    If so, archives the previous month's data into an Excel sheet and resets
    the active reporting.
    Can be run with 'force_month' to manually trigger archiving for testing.
    """
    ensure_dirs()
    
    current_time = datetime.now()
    current_month_str = current_time.strftime("%Y-%m")
    
    # Get last archived month from settings
    last_archived = get_setting("last_archived_month")
    
    if force_month:
        # User explicitly requested archiving a specific month
        archive_month = force_month
        excel_path = generate_monthly_excel(archive_month)
        if excel_path:
            # FIX: Reset active database logs for the archived month
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM attendance WHERE date LIKE ?", (f"{archive_month}-%",))
            conn.commit()
            conn.close()
            return {
                "success": True,
                "message": f"Successfully archived and reset active database logs for month {archive_month} to {os.path.basename(excel_path)}",
                "filename": os.path.basename(excel_path)
            }
        else:
            return {
                "success": False,
                "message": f"No student registry or records found for {archive_month} to archive."
            }
            
    if not last_archived:
        # If no archive history, initialize it to the current month and do nothing
        set_setting("last_archived_month", current_month_str)
        return {"success": True, "message": f"Initialized monthly reset system to current month: {current_month_str}"}
        
    if last_archived == current_month_str:
        return {"success": True, "message": f"No reset required. Currently in the same month: {current_month_str}"}
        
    # We transitioned to a new month!
    # Let's archive the last_archived month
    print(f"Calendar month transitioned. Archiving previous month: {last_archived}")
    excel_path = generate_monthly_excel(last_archived)
    
    if excel_path:
        # Reset active database logs for the transitioned month
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM attendance WHERE date LIKE ?", (f"{last_archived}-%",))
        conn.commit()
        conn.close()
        
    # Update last archived to current
    set_setting("last_archived_month", current_month_str)
    
    if excel_path:
        return {
            "success": True,
            "message": f"Calendar month reset triggered. Archived and reset {last_archived} data.",
            "filename": os.path.basename(excel_path),
            "archived_month": last_archived
        }
    else:
        return {
            "success": True,
            "message": f"Calendar month reset triggered. No data found to archive for {last_archived}.",
            "archived_month": last_archived
        }


def list_archived_files():
    ensure_dirs()
    files = []
    for f in os.listdir(ARCHIVE_DIR):
        if f.endswith(".xlsx") and f.startswith("attendance_"):
            full_path = os.path.join(ARCHIVE_DIR, f)
            size = os.path.getsize(full_path)
            created = datetime.fromtimestamp(os.path.getctime(full_path)).strftime("%Y-%m-%d %H:%M:%S")
            # Parse month from filename, format is attendance_YYYY_MM.xlsx
            parts = f.replace(".xlsx", "").split("_")
            month_label = f"{parts[1]}-{parts[2]}" if len(parts) >= 3 else "Unknown"
            files.append({
                "filename": f,
                "month": month_label,
                "size_bytes": size,
                "created_at": created
            })
    # Sort files by filename desc (latest first)
    files.sort(key=lambda x: x["filename"], reverse=True)
    return files
