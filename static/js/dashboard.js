document.addEventListener("DOMContentLoaded", () => {
    // Load attendance data on page load
    loadAttendance();

    // Filter by date
    document.getElementById('dateFilter').addEventListener('change', (e) => {
        loadAttendance(e.target.value);
    });

    // Download Excel trigger
    document.getElementById('downloadBtn').addEventListener('click', () => {
        window.location.href = '/api/download_attendance';
    });

    // Notify trigger (Simulation)
    document.getElementById('notifyBtn').addEventListener('click', () => {
        alert("Success! Daily summary notification has been triggered to the registered teacher.");
    });
});

function loadAttendance(dateStr = "") {
    let url = '/api/attendance';
    if (dateStr) {
        url += `?date=${dateStr}`;
    }

    fetch(url)
    .then(res => res.json())
    .then(data => {
        const tbody = document.querySelector('#attendanceTable tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No attendance records found.</td></tr>';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // Format time nicely if possible, or leave as string
            tr.innerHTML = `
                <td>${row.Date}</td>
                <td>${row.Time}</td>
                <td><strong>${row.Enrollment}</strong></td>
                <td>${row.Name}</td>
                <td>${row.Branch}</td>
                <td>${row.Division}</td>
                <td class="status-cell">${row.Status || 'Present'}</td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => {
        console.error("Error fetching attendance data:", err);
        const tbody = document.querySelector('#attendanceTable tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: red;">Error loading data. Is the backend running?</td></tr>';
    });
}
