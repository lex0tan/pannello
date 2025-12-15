from helpers.config import console
from typing import Any, Dict, Optional
from helpers.config import get_pool
from asyncpg.exceptions import UniqueViolationError



async def getReturnOrdersCount() -> int:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT COUNT(*) AS return_orders_count
                FROM orders o
                WHERE o.status IN (4)
                """
            )
            return {"success": True, "data": rows[0]["return_orders_count"]}

    except Exception as e:
        console.log(f"[red]Error in getReturnOrdersCount: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}


async def getReturnedToHandleCount() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT COUNT(*) AS returned_to_handle_count
                FROM orders o
                WHERE o.status IN (5)
                """
            )
            return {"success": True, "data": rows[0]["returned_to_handle_count"]}

    except Exception as e:
        console.log(f"[red]Error in getReturnedToHandleCount: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}

async def getReturnedWithProblemCount() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT COUNT(*) AS returned_with_problem_count
                FROM orders o
                WHERE o.status IN (7)
                """
            )
            return {"success": True, "data": rows[0]["returned_with_problem_count"]}

    except Exception as e:
        console.log(f"[red]Error in getReturnedToHandleCount: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}