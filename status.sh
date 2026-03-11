#!/bin/bash

# Crontab Manager - Status Script
# Shows current status of production services
# Usage: ./status.sh

cd "$(dirname "$0")" 2>/dev/null || cd "$(dirname "$BASH_SOURCE")"
PROJECT_PATH="$(pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f "$PROJECT_PATH/.env" ]; then
    export $(grep -v '^#' "$PROJECT_PATH/.env" | xargs)
fi

# Default values
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Crontab Manager Status${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to check service status
check_service() {
    local port=$1
    local name=$2
    local color=$3
    local pid
    
    pid=$(lsof -Pi :"$port" -sTCP:LISTEN -t 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo -e "${color}✓ $name${NC}"
        echo "  Status: Running"
        echo "  Port: $port"
        echo "  PID: $pid"
        
        # Try to get process info
        if ps -p "$pid" -o command= 2>/dev/null | grep -q "python"; then
            echo "  Type: Python (Backend)"
        elif ps -p "$pid" -o command= 2>/dev/null | grep -q "node"; then
            echo "  Type: Node.js (Frontend)"
        fi
        return 0
    else
        echo -e "${RED}✗ $name${NC}"
        echo "  Status: Stopped"
        echo "  Port: $port"
        return 1
    fi
}

# Check backend
echo "[Backend Service]"
check_service "$BACKEND_PORT" "Backend" "$GREEN"
echo "  URL: http://$BACKEND_HOST:$BACKEND_PORT"

# Check if we can connect to backend API
echo ""
echo "  Testing API connection..."
if curl -s "http://$BACKEND_HOST:$BACKEND_PORT/" > /dev/null 2>&1; then
    echo -e "  ${GREEN}API: Responsive${NC}"
else
    echo -e "  ${YELLOW}API: Not responding (may be starting)${NC}"
fi

echo ""

# Check frontend
echo "[Frontend Service]"
check_service "$FRONTEND_PORT" "Frontend" "$GREEN"
echo "  URL: http://localhost:$FRONTEND_PORT"

# Check if we can connect to frontend
echo ""
echo "  Testing frontend connection..."
if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo -e "  ${GREEN}Frontend: Responsive${NC}"
else
    echo -e "  ${YELLOW}Frontend: Not responding (may be starting)${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo "Summary:"

# Count running services
RUNNING=0
if lsof -Pi :"$BACKEND_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    RUNNING=$((RUNNING + 1))
fi
if lsof -Pi :"$FRONTEND_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    RUNNING=$((RUNNING + 1))
fi

if [ "$RUNNING" -eq 2 ]; then
    echo -e "${GREEN}  All services running (2/2)${NC}"
elif [ "$RUNNING" -eq 1 ]; then
    echo -e "${YELLOW}  Partially running (1/2)${NC}"
else
    echo -e "${RED}  No services running (0/2)${NC}"
fi

echo -e "${BLUE}================================${NC}"
echo ""
echo "Commands:"
echo "  Start:   ./start_prod.sh"
echo "  Stop:    ./stop.sh"
echo "  Restart: ./start_prod.sh --restart"
echo ""
