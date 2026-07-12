# Proj-PBI-API

Power BI REST API 项目 —— 使用 Python 与 Power BI 服务进行交互。

## 功能

- 连接 Power BI REST API
- 数据集管理
- 报表操作
- 工作区管理

## 环境要求

- Python 3.10+
- 详见 `requirements.txt`

## 快速开始

```bash
# 创建虚拟环境
python -m venv venv
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 复制环境变量模板
copy .env.example .env
# 编辑 .env 填入你的配置

# 运行
python src/main.py
```

## 项目结构

```
Proj-PBI-API/
├── src/
│   ├── __init__.py
│   ├── main.py          # 入口文件
│   ├── config.py        # 配置管理
│   └── pbi_client.py    # Power BI API 客户端
├── tests/
│   └── __init__.py
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt
```

## License

MIT
