import os
import cv2
import base64
import numpy as np
import pandas as pd
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
import face_recognition

app = Flask(__name__)

# Folders for storage
KNOWN_FACES_DIR = "known_faces"
ATTENDANCE_DIR = "attendance_records"

os.makedirs(KNOWN_FACES_DIR, exist_ok=True)
os.makedirs(ATTENDANCE_DIR, exist_ok=True)

known_face_encodings = []
known_face_details = []

def load_known_faces():
    global known_face_encodings, known_face_details
    known_face_encodings.clear()
    known_face_details.clear()
    
    for filename in os.listdir(KNOWN_FACES_DIR):
        if filename.endswith((".jpg", ".jpeg", ".png")):
            # Filename format expected: Enrollment_Name_Branch_Division.jpg
            # Example: 101_John Doe_CS_A.jpg
            parts = os.path.splitext(filename)[0].split('_')
            if len(parts) >= 4:
                enrollment, name, branch, division = parts[0], parts[1], parts[2], parts[3]
            else:
                enrollment, name, branch, division = "Unknown", filename, "Unknown", "Unknown"
            
            filepath = os.path.join(KNOWN_FACES_DIR, filename)
            image = face_recognition.load_image_file(filepath)
            encodings = face_recognition.face_encodings(image)
            
            if len(encodings) > 0:
                known_face_encodings.append(encodings[0])
                # Prepare base64 string for the UI popup
                _, buffer = cv2.imencode('.jpg', cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
                b64_img = base64.b64encode(buffer).decode('utf-8')
                known_face_details.append({
                    "enrollment": enrollment,
                    "name": name,
                    "branch": branch,
                    "division": division,
                    "profile_base64": b64_img
                })
                print(f"Loaded: {name}")

# Load faces on startup
load_known_faces()

def get_excel_file_path(date_obj):
    month_year = date_obj.strftime("%B_%Y")
    return os.path.join(ATTENDANCE_DIR, f"attendance_{month_year}.xlsx")

def mark_attendance(student):
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    filepath = get_excel_file_path(now)
    
    columns = ["Date", "Time", "Enrollment", "Name", "Branch", "Division", "Status"]
    
    if os.path.exists(filepath):
        df = pd.read_excel(filepath)
    else:
        df = pd.DataFrame(columns=columns)
        
    # Check if already logged today to prevent duplicates
    # Since enrollment is unique, we check date and enrollment
    already_logged = not df[(df["Date"] == date_str) & (df["Enrollment"] == student["enrollment"])].empty
    
    if not already_logged:
        new_row = {
            "Date": date_str,
            "Time": time_str,
            "Enrollment": student["enrollment"],
            "Name": student["name"],
            "Branch": student["branch"],
            "Division": student["division"],
            "Status": "Present"
        }
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df.to_excel(filepath, index=False)
        return True, time_str
    
    return False, None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/reload_faces', methods=['POST'])
def reload_faces():
    """Endpoint to trigger a reload if new photos are added"""
    load_known_faces()
    return jsonify({"message": "Faces reloaded", "count": len(known_face_encodings)})

@app.route('/recognize', methods=['POST'])
def recognize():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No image provided"}), 400
        
    image_data = data['image'].split(",")[1]
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Scale down for faster processing
    small_frame = cv2.resize(rgb_frame, (0, 0), fx=0.25, fy=0.25)
    
    face_locations = face_recognition.face_locations(small_frame)
    face_encodings = face_recognition.face_encodings(small_frame, face_locations)
    
    results = []
    
    for face_encoding, face_location in zip(face_encodings, face_locations):
        if not known_face_encodings:
            continue
            
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        
        if len(face_distances) > 0:
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                student = known_face_details[best_match_index]
                
                # Extract original face bounding box from full frame
                top, right, bottom, left = face_location
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4
                
                face_snippet = frame[top:bottom, left:right]
                if face_snippet.size > 0:
                    _, buffer = cv2.imencode('.jpg', face_snippet)
                    snippet_b64 = base64.b64encode(buffer).decode('utf-8')
                else:
                    snippet_b64 = ""
                
                # Log attendance
                logged, log_time = mark_attendance(student)
                
                results.append({
                    "status": "Logged" if logged else "Already Logged",
                    "time": log_time,
                    "student": student,
                    "snippet": snippet_b64
                })
                
    return jsonify({"recognitions": results})

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    """Fetch attendance data, filtered by optional date"""
    month_filter = request.args.get('month') # expected YYYY-MM
    date_filter = request.args.get('date')   # expected YYYY-MM-DD
    
    now = datetime.now()
    if month_filter:
        try:
            target_date = datetime.strptime(month_filter, "%Y-%m")
        except ValueError:
            target_date = now
    else:
        target_date = now
        
    filepath = get_excel_file_path(target_date)
    
    if not os.path.exists(filepath):
        return jsonify([])
        
    df = pd.read_excel(filepath)
    
    if date_filter:
        df = df[df['Date'] == date_filter]
        
    df.fillna("", inplace=True)
    return jsonify(df.to_dict(orient="records"))

@app.route('/api/download_attendance', methods=['GET'])
def download_attendance():
    """Download the current month's Excel sheet"""
    now = datetime.now()
    filepath = get_excel_file_path(now)
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True)
    return "No records found for current month", 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
