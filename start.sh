#!/bin/bash

# Terminate background processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "=============================================="
echo " Starting AI Attendance Assistant Setup...   "
echo "=============================================="

# 1. Setup Python Virtual Environment
echo "👉 Checking Python virtual environment..."
if [ ! -d "backend/venv" ]; then
    echo "⚙️ Creating backend/venv virtual environment..."
    python3 -m venv backend/venv
fi

echo "🔌 Activating virtual environment..."
source backend/venv/bin/activate

echo "📦 Installing/Updating Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# 2. Setup Frontend dependencies
echo "👉 Verifying frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "⚙️ Running npm install in frontend..."
    (cd frontend && npm install)
fi

# 3. Start Backend Server
echo "🚀 Launching FastAPI backend on http://localhost:8000..."
(cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &

# Give backend a moment to spin up
sleep 2

# 4. Start Frontend Server
echo "🚀 Launching Vite frontend on http://localhost:5173..."
(cd frontend && npm run dev) &

# Keep script running
wait
