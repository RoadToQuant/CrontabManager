#!/bin/bash

# Crontab Manager - Production Startup Script
# Builds and starts backend and frontend for production
# Usage: ./start_prod.sh

set -e

cd "$(dirname "$0")" 2>/dev/null || cd "$(dirname "$BASH_SOURCE")"
PROJECT_PATH="$(pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment variables
if [ -f "$PROJECT_PATH/.env" ]; then
    export $(grep -v '^#' "$PROJECT_PATH/.env" | xargs)
fi

# Default values
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PYTHON_ENV_TYPE="${PYTHON_ENV_TYPE:-venv}"
CONDA_ACTIVATE="${CONDA_ACTIVATE:-/home/ubuntu/miniconda3/bin/activate}"
CONDA_ENV="${CONDA_ENV:-py39-sm}"

# Number of backend workers (adjust based on CPU cores)
BACKEND_WORKERS="${BACKEND_WORKERS:-4}"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Crontab Manager - PROD Mode${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Error: Port $1 is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to stop existing services
stop_services() {
    echo -e "${YELLOW}Stopping existing services...${NC}"
    
    # Stop by port
    BACKEND_PID=$(lsof -Pi :"$BACKEND_PORT" -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || kill -9 "$BACKEND_PID" 2>/dev/null || true
        echo "  Backend stopped"
    fi
    
    FRONTEND_PID=$(lsof -Pi :"$FRONTEND_PORT" -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || kill -9 "$FRONTEND_PID" 2>/dev/null || true
        echo "  Frontend stopped"
    fi
    
    # Also try by process name as fallback
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "next start" 2>/dev/null || true
    
    sleep 2
}

# Check if we should stop existing services first
if [ "$1" == "--restart" ] || [ "$1" == "-r" ]; then
    stop_services
fi

echo -e "${YELLOW}[1/4] Checking ports...${NC}"

if ! check_port "$BACKEND_PORT"; then
    echo -e "${YELLOW}Use './start_prod.sh --restart' to stop existing services first${NC}"
    exit 1
fi

if ! check_port "$FRONTEND_PORT"; then
    echo -e "${YELLOW}Use './start_prod.sh --restart' to stop existing services first${NC}"
    exit 1
fi

echo -e "${GREEN}  Ports available${NC}"

echo ""
echo -e "${YELLOW}[2/4] Building Frontend...${NC}"

cd "$PROJECT_PATH/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install
fi

# Build for production
echo "  Building Next.js application..."
npm run build

echo -e "${GREEN}  Frontend build complete${NC}"

echo ""
echo -e "${YELLOW}[3/4] Starting Backend (Production)...${NC}"

cd "$PROJECT_PATH/backend"

# Activate Python environment
if [ "$PYTHON_ENV_TYPE" == "conda" ]; then
    if [ -f "$CONDA_ACTIVATE" ]; then
        source "$CONDA_ACTIVATE"
        conda activate "$CONDA_ENV"
        echo "  Activated conda environment: $CONDA_ENV"
    else
        echo -e "${RED}Error: Conda not found at $CONDA_ACTIVATE${NC}"
        exit 1
    fi
else
    source venv/bin/activate
    echo "  Activated venv environment"
fi

# Ensure log directory exists
mkdir -p "$PROJECT_PATH/logs"

# Check if gunicorn is available, otherwise use uvicorn
if pip show gunicorn >/dev/null 2>&1; then
    echo "  Starting with Gunicorn ($BACKEND_WORKERS workers)..."
    nohup gunicorn main:app \
        --bind "$BACKEND_HOST:$BACKEND_PORT" \
        --workers "$BACKEND_WORKERS" \
        --worker-class uvicorn.workers.UvicornWorker \
        --access-logfile "$PROJECT_PATH/logs/backend_access.log" \
        --error-logfile "$PROJECT_PATH/logs/backend_error.log" \
        --daemon
else
    echo "  Starting with Uvicorn ($BACKEND_WORKERS workers)..."
    nohup python -c "
import uvicorn
uvicorn.run(
    'main:app',
    host='$BACKEND_HOST',
    port=$BACKEND_PORT,
    workers=$BACKEND_WORKERS,
    log_level='warning'
)
" > "$PROJECT_PATH/logs/backend.log" 2>&1 &
fi

BACKEND_PID=$!
echo -e "${GREEN}  Backend started (Port: $BACKEND_PORT)${NC}"

# Wait a moment for backend to start
sleep 2

echo ""
echo -e "${YELLOW}[4/4] Starting Frontend (Production)...${NC}"

cd "$PROJECT_PATH/frontend"

# Start Next.js in production mode
nohup npm run start -- -p "$FRONTEND_PORT" > "$PROJECT_PATH/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}  Frontend started (Port: $FRONTEND_PORT)${NC}"

# Wait a moment and check if services are actually running
sleep 3

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Production servers started!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if services are running
if lsof -Pi :"$BACKEND_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend:  http://$BACKEND_HOST:$BACKEND_PORT${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check logs/backend.log${NC}"
fi

if lsof -Pi :"$FRONTEND_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend: http://localhost:$FRONTEND_PORT${NC}"
else
    echo -e "${RED}✗ Frontend failed to start. Check logs/frontend.log${NC}"
fi

echo ""
echo "Logs:"
echo "  Backend:  $PROJECT_PATH/logs/backend.log"
echo "  Frontend: $PROJECT_PATH/logs/frontend.log"
echo ""
echo "Commands:"
echo "  Check status: ./status.sh"
echo "  Stop:         ./stop.sh"
echo "  Restart:      ./start_prod.sh --restart"
echo ""
