import asyncio
import sys
sys.path.insert(0, ".")
from src.dax_executor import execute_dax_via_ps

async def main():
    try:
        result = await execute_dax_via_ps("59496", "EVALUATE INFO.TABLES()")
        print(f"Success! Rows: {len(result) if isinstance(result, list) else 'N/A'}")
        if isinstance(result, list) and len(result) > 0:
            print(f"First row: {result[0]}")
    except Exception as e:
        print(f"Exception: {repr(e)}")

asyncio.run(main())
