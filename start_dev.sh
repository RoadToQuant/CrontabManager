#!/bin/bash

# Crontab Manager - Development Startup Script
# Starts backend and frontend in development mode with hot reload
# Usage: ./start_dev.sh

set -e

cd "$(dirname "$0")"
PROJECT_PATH="$(pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f "$PROJECT_PATH/.env" ]; then
    set -a
    source "$PROJECT_PATH/.env"
    set +a
fi

# Default values
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
PYTHON_ENV_TYPE="${PYTHON_ENV_TYPE:-venv}"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Crontab Manager - DEV Mode${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Backend:${NC}  http://$BACKEND_HOST:$BACKEND_PORT (with hot reload)"
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT (with hot reload)"
echo ""

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Error: Port $1 is already in use"
        return 1
    fi
    return 0
}

echo -e "${YELLOW}[1/2] Starting Backend (Development Mode)...${NC}"
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

if ! check_port "$BACKEND_PORT"; then
    exit 1
fi

# Start backend with auto-reload
echo "  Starting FastAPI with hot reload..."
python -c "
import uvicorn
uvicorn.run(
    'main:app',
    host='$BACKEND_HOST',
    port=$BACKEND_PORT,
    reload=True,
    reload_dirs=['.'],
    log_level='info'
)
" &
BACKEND_PID=$!

echo -e "${GREEN}  Backend started (PID: $BACKEND_PID)${NC}"

echo ""
echo -e "${YELLOW}[2/2] Starting Frontend (Development Mode)...${NC}"
cd "$PROJECT_PATH/frontend"

if ! check_port "$FRONTEND_PORT"; then
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend with hot reload
echo "  Starting Next.js dev server..."
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}  Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Development servers running!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${BLUE}Backend:${NC}  http://$BACKEND_HOST:$BACKEND_PORT"
echo -e "${BLUE}API Docs:${NC} http://$BACKEND_HOST:$BACKEND_PORT/docs"
echo ""
echo -e "${YELLOW}Features:${NC}"
echo "  - Backend hot reload: Python code changes auto-restart"
echo "  - Frontend hot reload: React components auto-refresh"
echo "  - Real-time logs displayed below"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
wait
