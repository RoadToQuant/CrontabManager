#!/bin/bash

# Crontab Manager - Stop Script
# Stops production backend and frontend services
# Usage: ./stop.sh

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
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Stopping Crontab Manager${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Function to kill process by port
kill_by_port() {
    local port=$1
    local name=$2
    local pid
    
    pid=$(lsof -Pi :"$port" -sTCP:LISTEN -t 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Stopping $name (Port: $port, PID: $pid)...${NC}"
        kill "$pid" 2>/dev/null
        sleep 1
        
        # Check if still running, force kill if needed
        if kill -0 "$pid" 2>/dev/null; then
            echo "  Force killing $name..."
            kill -9 "$pid" 2>/dev/null
        fi
        
        echo -e "${GREEN}  $name stopped${NC}"
        return 0
    else
        echo -e "${YELLOW}$name not running (Port: $port)${NC}"
        return 1
    fi
}

# Stop backend
echo "[1/2] Stopping backend service..."
kill_by_port "$BACKEND_PORT" "Backend"

# Also try to kill by process pattern as fallback
pkill -f "python main.py" 2>/dev/null || true

# Stop frontend
echo ""
echo "[2/2] Stopping frontend service..."
kill_by_port "$FRONTEND_PORT" "Frontend"

# Also try to kill by process pattern as fallback
pkill -f "next start" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  All services stopped${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
