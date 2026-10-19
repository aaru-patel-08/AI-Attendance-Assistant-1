const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const modal = document.getElementById('attendanceModal');

let stream = null;
let scanInterval = null;
let isPaused = false;


// ===============================
// START SCANNER
// ===============================
startBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        video.srcObject = stream;

        statusText.textContent = "Scanner active. Looking for faces...";

        startBtn.style.display = 'none';

        isPaused = false;

        // Start checking camera every 1.5 seconds
        scanInterval = setInterval(processFrame, 1500);

    } catch (err) {
        statusText.textContent =
            "Error accessing camera: " + err.message;

        console.error("Camera error:", err);
    }
});


// ===============================
// STOP SCANNER
// ===============================
stopBtn.addEventListener('click', () => {
    stopScanner();
});


// ===============================
// STOP SCANNER FUNCTION
// ===============================
function stopScanner() {

    // Stop repeated recognition requests
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }

    // Stop camera
    if (stream) {
        stream.getTracks().forEach(track => track.stop());

        video.srcObject = null;
        stream = null;
    }

    isPaused = true;

    statusText.textContent = "Camera inactive";

    startBtn.style.display = 'inline-block';
}


// ===============================
// PROCESS CAMERA FRAME
// ===============================
function processFrame() {

    if (isPaused || !stream) {
        return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const dataURL = canvas.toDataURL(
        'image/jpeg',
        0.8
    );

    fetch('/recognize', {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            image: dataURL
        })
    })
    .then(response => response.json())

    .then(data => {

        if (
            data.recognitions &&
            data.recognitions.length > 0
        ) {
            showModal(data.recognitions[0]);
        }

    })

    .catch(err => {
        console.error(
            "Recognition error:",
            err
        );
    });
}


// ===============================
// SHOW ATTENDANCE POPUP
// ===============================
function showModal(data) {

    // Prevent further recognition
    isPaused = true;


    // =====================================
    // STOP SCANNER IMMEDIATELY
    // =====================================

    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }


    // =====================================
    // STOP CAMERA
    // =====================================

    if (stream) {

        stream.getTracks().forEach(track => {
            track.stop();
        });

        video.srcObject = null;
        stream = null;
    }


    // =====================================
    // UPDATE STATUS
    // =====================================

    statusText.textContent =
        "Attendance marked. Scanner stopped.";

    startBtn.style.display = 'inline-block';


    // =====================================
    // SHOW CAPTURED FACE
    // =====================================

    document.getElementById('capturedFace').src =
        'data:image/jpeg;base64,' +
        data.snippet;


    // =====================================
    // SHOW STORED PROFILE
    // =====================================

    document.getElementById('storedFace').src =
        'data:image/jpeg;base64,' +
        data.student.profile_base64;


    // =====================================
    // STUDENT DETAILS
    // =====================================

    document.getElementById('mName').textContent =
        data.student.name;

    document.getElementById('mEnroll').textContent =
        data.student.enrollment;

    document.getElementById('mBranch').textContent =
        data.student.branch;

    document.getElementById('mDiv').textContent =
        data.student.division;


    // =====================================
    // ATTENDANCE STATUS
    // =====================================

    const statusBadge =
        document.getElementById('mStatus');

    if (data.status === "Logged") {

        statusBadge.textContent =
            "Attendance Logged at " + data.time;

        statusBadge.className =
            "status-badge success";

    } else {

        statusBadge.textContent =
            "Already Logged Today";

        statusBadge.className =
            "status-badge warning";
    }


    // =====================================
    // SHOW POPUP
    // =====================================

    modal.classList.add('active');


    // =====================================
    // CLOSE POPUP AFTER 4 SECONDS
    // =====================================

    setTimeout(() => {

        modal.classList.remove('active');

    }, 4000);
}