# Contributing Guide

感谢你对 Crontab Manager 项目的关注！

## 开发环境设置

### 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 代码规范

### Python

- 使用 4 空格缩进
- 最大行长度 100
- 使用类型注解
- 文档字符串使用双引号

```python
def example_function(param: str) -> bool:
    """函数说明."""
    return True
```

### TypeScript

- 使用 2 空格缩进
- 使用单引号
- 分号可选

```typescript
const example = (param: string): boolean => {
  return true;
};
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式（不影响代码运行的变动）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建过程或辅助工具的变动

### 示例

```
feat(tasks): 添加批量导入功能

支持从 JSON 文件批量导入任务到 crontab

Closes #123
```

## 分支策略

- `main`: 稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支
- `release/*`: 发布分支

## 发布流程

1. 更新 `CHANGELOG.md`
2. 更新版本号
3. 创建 PR 到 `main`
4. 合并后打标签：`git tag v2.0.0`
5. 推送标签：`git push origin v2.0.0`
