"""Power BI API 项目入口"""

from src.config import Config
from src.pbi_client import PBIClient


def main():
    """主函数"""
    config = Config()
    client = PBIClient(config)

    print("=== Power BI API 客户端 ===")
    print(f"租户 ID: {config.TENANT_ID}")
    print(f"客户端 ID: {config.CLIENT_ID}")
    print()

    try:
        # 获取工作区列表
        workspaces = client.get_workspaces()
        print(f"找到 {len(workspaces)} 个工作区:")
        for ws in workspaces:
            print(f"  - {ws.get('name')} (ID: {ws.get('id')})")
    except Exception as e:
        print(f"错误: {e}")
        print("请检查 .env 文件中的配置是否正确。")


if __name__ == "__main__":
    main()
