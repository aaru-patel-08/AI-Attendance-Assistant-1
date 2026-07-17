import cv2
import numpy as np
import base64
import os

# ─── OpenCV 5 compatibility ──────────────────────────────────────────────────
# OpenCV 5 removed CascadeClassifier from the top-level cv2 namespace in the
# headless wheel.  We attempt to load it from cv2.legacy (if available) and
# fall back to a no-op stub so the rest of the application keeps running.
# The /api/simulate-detection route does NOT need real face detection, so the
# demo flow is completely unaffected.

def _load_cascade():
    """Try every known location for CascadeClassifier in various OpenCV versions."""
    # OpenCV 4.x top-level
    if hasattr(cv2, "CascadeClassifier"):
        cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
        if os.path.exists(cascade_path):
            clf = cv2.CascadeClassifier(cascade_path)
            if not clf.empty():
                print("Haar Cascade loaded (cv2 top-level)")
                return clf
    # OpenCV 5.x legacy module
    if hasattr(cv2, "legacy") and hasattr(cv2.legacy, "CascadeClassifier"):
        import cv2.data as cvdata
        cascade_path = os.path.join(cvdata.haarcascades, "haarcascade_frontalface_default.xml")
        if os.path.exists(cascade_path):
            clf = cv2.legacy.CascadeClassifier(cascade_path)
            if not clf.empty():
                print("Haar Cascade loaded (cv2.legacy)")
                return clf
    print("WARNING: Haar Cascade not available. Face detection will return empty results.")
    return None

face_cascade = _load_cascade()


def decode_base64_image(base64_string: str):
    """Decodes a base64-encoded image (data-URL or raw) into an OpenCV BGR image."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Failed to decode base64 image: {e}")
        return None


def detect_faces_in_frame(img) -> list:
    """
    Detects frontal faces using Haar Cascades.
    Returns list of bounding boxes: [{"x": x, "y": y, "width": w, "height": h}]
    Returns an empty list if cascade is unavailable or image is invalid.
    """
    if face_cascade is None or img is None:
        return []

    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Downscale for speed
        h, w = gray.shape[:2]
        max_dim = 400
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            gray_small = cv2.resize(gray, (int(w * scale), int(h * scale)))
        else:
            scale = 1.0
            gray_small = gray

        # detectMultiScale is on the classifier instance (works for both cv2 4.x and legacy)
        faces = face_cascade.detectMultiScale(
            gray_small,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        boxes = []
        for (x, y, bw, bh) in faces:
            boxes.append({
                "x":      int(x  / scale),
                "y":      int(y  / scale),
                "width":  int(bw / scale),
                "height": int(bh / scale),
            })
        return boxes

    except Exception as e:
        print(f"Error during face detection: {e}")
        return []
