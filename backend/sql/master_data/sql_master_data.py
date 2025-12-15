# backend/sql/sql_brands.py backend/sql/sql_categories.py backend/sql/sql_suppliers.py raggruppati in un unico file

from helpers.config import console
from typing import Any, Dict, Optional
from helpers.config import get_pool


##################################
#             brands             #
##################################

async def getBrandsList() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            retval = await conn.fetch("""
                SELECT id, brand_name FROM brands
                ORDER BY brand_name ASC;
            """)
            brands = [{"id": row["id"], "name": row["brand_name"]} for row in retval]
            return {"success": True, "data": brands}

    except Exception as e:
        console.print("[red]Error fetching brands list:[/red]", e)
        return {"success": False, "error": str(e)}


##################################
#           categories           #
##################################

async def getCategoriesList() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            retval = await conn.fetch("""
                SELECT id, category_name FROM categories
                ORDER BY category_name ASC;
            """)
            categories = [{"id": row["id"], "name": row["category_name"]} for row in retval]
            return {"success": True, "data": categories}

    except Exception as e:
        console.print("[red]Error fetching categories list:[/red]", e)
        return {"success": False, "error": str(e)}



##################################
#            suppliers           #
##################################


async def getSuppliersList() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            retval = await conn.fetch("""
                SELECT id, name FROM suppliers
                ORDER BY name ASC;
            """)
            suppliers = [{"id": row["id"], "name": row["name"]} for row in retval]
            return {"success": True, "data": suppliers}
    except Exception as e:
        console.print("[red]Error fetching suppliers list:[/red]", e)
        return {"success": False, "error": str(e)}



##################################
#             status             #
##################################


async def getStatuses() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "error": str(e)}
    try:
        async with pool.acquire() as conn:
            statuses = await conn.fetch("""SELECT * FROM public.status""")
            console.print(statuses)
            return {"success": True, "data": statuses, "error": ""}
    except Exception as e:
        console.print("[red]Error fetching master data status:[/red]", e)
        return {"success": False, "error": str(e)}

    return {"success": True, "message": "Master Data SQL module attivo!"}


