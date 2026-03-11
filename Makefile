# ============================================
# Makefile for Crontab Manager
# ============================================

.PHONY: help install dev build clean test lint format

# 默认目标
help:
	@echo "Available targets:"
	@echo "  install     - Install dependencies"
	@echo "  dev         - Start development servers"
	@echo "  build       - Build production frontend"
	@echo "  start       - Start production servers"
	@echo "  stop        - Stop all servers"
	@echo "  clean       - Clean build artifacts"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linters"
	@echo "  format      - Format code"
	@echo "  deploy      - Deploy to production"

# 安装依赖
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# 开发环境
dev:
	@echo "Starting development servers..."
	@make dev-backend &
	@make dev-frontend &

dev-backend:
	cd backend && python main.py

dev-frontend:
	cd frontend && npm run dev

# 构建
build:
	@echo "Building frontend..."
	cd frontend && npm run build

# 生产环境
start:
	@echo "Starting production servers..."
	./start.sh

stop:
	@echo "Stopping servers..."
	./stop.sh

# 清理
clean:
	@echo "Cleaning..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	cd frontend && rm -rf .next out 2>/dev/null || true

# 测试
test:
	@echo "Running tests..."
	cd backend && python -m pytest || true
	cd frontend && npm test || true

# 代码检查
lint:
	@echo "Linting backend..."
	cd backend && flake8 . || true
	@echo "Linting frontend..."
	cd frontend && npm run lint || true

# 格式化
format:
	@echo "Formatting backend..."
	cd backend && black . || true
	@echo "Formatting frontend..."
	cd frontend && npm run format || true

# 部署
deploy:
	@echo "Deploying..."
	./deploy.sh

# 数据库
db-init:
	cd backend && python -c "from models import init_db; init_db()"

db-reset:
	cd backend && rm -f data/monitor.db && python -c "from models import init_db; init_db()"

# 同步 crontab
sync:
	./sync-crontab.sh
