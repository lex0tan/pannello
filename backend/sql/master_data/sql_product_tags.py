from helpers.config import console
from typing import Any
from helpers.config import get_pool


async def getProductTagsList(include_inactive: bool = False) -> dict[str, Any]:
    try:
        pool = get_pool()
    except RuntimeError as e:
        console.log(f"[red]Error getting DB pool: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, tag_name, status, color, notes, created_at, updated_at
                FROM public.product_tags
                WHERE ($1 = true) OR (status = 1)
                ORDER BY tag_name ASC;
            """, include_inactive)

            data = [
                {
                    "id": r["id"],
                    "tag_name": r["tag_name"],
                    "status": r["status"],
                    "color": r["color"],
                    "notes": r["notes"],
                }
                for r in rows
            ]

            return {"success": True, "data": data, "error": ""}
    except Exception as e:
        console.print("[red]Error loading product tags:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}


async def createOrGetProductTag(tag_name: str, color: str | None = None, notes: str | None = None) -> dict[str, Any]:
    tag_name = (tag_name or "").strip()
    if not tag_name:
        return {"success": False, "data": None, "error": "tag_name is required"}

    try:
        pool = get_pool()
    except RuntimeError as e:
        console.log(f"[red]Error getting DB pool: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow("""
                WITH ins AS (
                  INSERT INTO public.product_tags (tag_name, color, notes)
                  VALUES ($1, $2, $3)
                  ON CONFLICT DO NOTHING
                  RETURNING id, tag_name, status, color, notes, created_at, updated_at
                )
                SELECT * FROM ins
                UNION ALL
                SELECT id, tag_name, status, color, notes, created_at, updated_at
                FROM public.product_tags
                WHERE lower(btrim(tag_name)) = lower(btrim($1))
                LIMIT 1;
            """, tag_name, color, notes)

            if not row:
                return {"success": False, "data": None, "error": "Unable to create or fetch tag"}

            data = {
                "id": row["id"],
                "tag_name": row["tag_name"],
                "status": row["status"],
                "color": row["color"],
                "notes": row["notes"],
            }

            return {"success": True, "data": data, "error": ""}
    except Exception as e:
        console.print("[red]Error creating product tag:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}


async def getProductTagsByProductId(product_id: int, include_inactive: bool = False) -> dict[str, Any]:
    if not isinstance(product_id, int) or product_id <= 0:
        return {"success": False, "data": None, "error": "Invalid product_id"}

    try:
        pool = get_pool()
    except RuntimeError as e:
        console.log(f"[red]Error getting DB pool: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT t.id, t.tag_name, t.status, t.color
                FROM public.product_tag_map m
                JOIN public.product_tags t ON t.id = m.tag_id
                WHERE m.product_id = $1
                  AND (($2 = true) OR (t.status = 1))
                ORDER BY t.tag_name ASC;
            """, product_id, include_inactive)

            data = [
                {
                    "id": r["id"],
                    "tag_name": r["tag_name"],
                    "status": r["status"],
                    "color": r["color"],
                }
                for r in rows
            ]

            return {"success": True, "data": data, "error": ""}
    except Exception as e:
        console.print("[red]Error loading tags for product:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}


async def syncProductTagsForProduct(product_id: int, tag_ids: list[int]) -> dict[str, Any]:
    if not isinstance(product_id, int) or product_id <= 0:
        return {"success": False, "data": None, "error": "Invalid product_id"}

    try:
        normalized = sorted({int(x) for x in (tag_ids or []) if int(x) > 0})
    except Exception:
        return {"success": False, "data": None, "error": "Invalid tag_ids"}

    try:
        pool = get_pool()
    except RuntimeError as e:
        console.log(f"[red]Error getting DB pool: {e}[/red]")
        return {"success": False, "data": None, "error": str(e)}

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                exists = await conn.fetchval("""
                    SELECT 1 FROM public.products WHERE id = $1 LIMIT 1;
                """, product_id)
                if not exists:
                    return {"success": False, "data": None, "error": "Product not found"}

                await conn.execute("""
                    DELETE FROM public.product_tag_map
                    WHERE product_id = $1;
                """, product_id)

                if not normalized:
                    return {"success": True, "data": True, "error": ""}

                valid_rows = await conn.fetch("""
                    SELECT id
                    FROM public.product_tags
                    WHERE id = ANY($1::int[])
                      AND status = 1;
                """, normalized)

                valid_set = {r["id"] for r in valid_rows}
                invalid = [x for x in normalized if x not in valid_set]
                if invalid:
                    raise ValueError(f"Invalid or inactive tag_ids: {invalid}")

                await conn.execute("""
                    INSERT INTO public.product_tag_map (product_id, tag_id)
                    SELECT $1, x.tag_id
                    FROM unnest($2::int[]) AS x(tag_id)
                    ON CONFLICT DO NOTHING;
                """, product_id, normalized)

                return {"success": True, "data": True, "error": ""}
    except ValueError as e:
        console.print("[yellow]Tag sync validation error:[/yellow]", e)
        return {"success": False, "data": None, "error": str(e)}
    except Exception as e:
        console.print("[red]Error syncing product tags:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}
