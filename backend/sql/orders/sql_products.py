from helpers.config import console
from typing import Any, Dict, Optional
from helpers.config import get_pool
from asyncpg.exceptions import UniqueViolationError

async def getTotalProductsCount() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}
    try:
        async with pool.acquire() as conn:
            retval = await conn.fetchrow("SELECT COUNT(*) AS count FROM public.products")
            return {"success": True, "data": int(retval["count"]), "error": ""}
    except Exception as e:
        console.print("[red]Error fetching total products count:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}

async def getUnderstockCount() -> dict[str, Any]:
    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}
    try:
        async with pool.acquire() as conn:
            retval = await conn.fetchrow("""
                SELECT COUNT(*) AS count
                FROM public.products
                WHERE status = 1
                  AND stock <= min_stock
                  AND min_stock > 0
                  OR (stock <= 0 AND min_stock = 0);
            """)
            return {"success": True, "data": int(retval["count"]), "error": ""}
    except Exception as e:
        console.print("[red]Error fetching understock products count:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}

async def quickFetchProduct(limit: int = 50,lookup: str = None,brand: str = None, category: str = None, supplier: int = None,
                            status: int = None, understock: bool = False, sort_by: str = None, sort_dir: str = None,
                            export: bool = False) -> dict[str, dict[str, Any]]:

    def _toIntOrNone(v):
        if v is None:
            return None
        if isinstance(v, bool):
            return None
        if isinstance(v, int):
            return None if v == 0 else v
        s = str(v).strip()
        if s == "" or s == "0" or s.lower() == "null" or s.lower() == "none":
            return None
        try:
            n = int(s)
            return None if n == 0 else n
        except Exception:
            return None

    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}
    try:
        clauses: list[str] = []
        params: list[Any] = []

        lookup_val   = (lookup.strip() if isinstance(lookup, str) else lookup) or None
        brand_id     = _toIntOrNone(brand)
        category_id  = _toIntOrNone(category)
        supplier_id  = _toIntOrNone(supplier)
        status_val   = _toIntOrNone(status)

        try: limit_val = int(limit) if limit is not None else 50
        except Exception: limit_val = 50
        if limit_val <= 0: limit_val = 50
        elif limit_val > 200: limit_val = 200

        allowed_sort = {
            "id": "p.id",
            "sku": "p.sku",
            "name": "p.name",
            "brand_name": "b.brand_name",
            "category_name": "c.category_name",
            "supplier_name": "s.name",
            "sell_price": "p.sell_price",
            "stock": "p.stock",
            "min_stock": "p.min_stock",
            "status": "p.status",
            "updated_at": "p.updated_at",
            "created_at": "p.created_at",
            "position_name": "sp.position_name",
        }

        sort_key = (sort_by.strip() if isinstance(sort_by, str) else "") or ""
        sort_col = allowed_sort.get(sort_key, "p.id")  # default = comportamento attuale

        dir_raw = (sort_dir.strip().lower() if isinstance(sort_dir, str) else "") or ""
        sort_direction = "ASC" if dir_raw != "desc" else "DESC"

        if lookup_val:
            params.append(f"%{lookup_val}%")
            n = len(params)
            clauses.append(f"(p.sku ILIKE ${n} OR p.name ILIKE ${n})")

        if status_val is not None:
            params.append(status_val)
            clauses.append(f"p.status = ${len(params)}")

        if supplier_id is not None:
            params.append(supplier_id)
            clauses.append(f"p.supplier_id = ${len(params)}")

        if brand_id is not None:
            params.append(brand_id)
            clauses.append(f"p.brand_id = ${len(params)}")

        if category_id is not None:
            params.append(category_id)
            clauses.append(f"p.category_id = ${len(params)}")

        if understock:
            # IMPORTANT: parentesi per non sballare le precedenze con altri filtri in AND
            clauses.append("((p.min_stock > 0 AND p.stock <= p.min_stock) OR (p.min_stock = 0 AND p.stock <= 0))")

        where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""

        params.append(limit_val)
        limit_ph = len(params)



        sql = f"""
            SELECT
                p.id, p.sku, p.name,
                p.brand_id, p.category_id, p.supplier_id,
                p.status, p.sell_price, p.stock, p.min_stock,
                p.updated_at, p.created_at,
                p.position AS location,
                b.brand_name, c.category_name, s.name AS supplier_name,
                sp.position_name AS position_name
            FROM public.products p
            LEFT JOIN public.brands b ON p.brand_id = b.id
            LEFT JOIN public.categories c ON p.category_id = c.id
            LEFT JOIN public.suppliers s ON p.supplier_id = s.id
            LEFT JOIN public.stock_positions sp ON p.position = sp.id
            {where_sql}
            ORDER BY {sort_col} {sort_direction}, p.id ASC
            LIMIT ${limit_ph};
        """ if not export else f"""
            SELECT
            p.id, p.sku, p.name,
            p.brand_id, p.category_id, p.supplier_id,
            p.status, p.sell_price, p.stock, p.min_stock,
            p.ean, p.weight_grams, p.updated_at, p.created_at,
            p.internal_notes, p.description, p.position AS location,
            b.brand_name, c.category_name, s.name AS supplier_name,
            sp.position_name AS position_name

            FROM public.products p
            LEFT JOIN public.brands b ON p.brand_id = b.id
            LEFT JOIN public.categories c ON p.category_id = c.id
            LEFT JOIN public.suppliers s ON p.supplier_idd = s.id
            LEFT JOIN public.stock_positions sp ON p.position = sp.id
            {where_sql}
            ORDER BY {sort_col} {sort_direction}, p.id ASC
            LIMIT ${limit_ph};
        """
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql, *params)

        products: list[dict[str, Any]] = [dict(r) for r in rows]

        return {"success": True, "data": products, "error": ""}

    except Exception as e:
        console.print("[red]Error fetching products:[/red]", e)
        return {"success": False, "data": None, "error": str(e)}



async def addProduct(sku: str, name: str, brand_id: int | None, category_id: int | None, supplier_id: int | None,
                             supplier_sku: str | None, status: int, sell_price: float, stock: int, min_stock: int, ean: str | None,
                             weight_grams: int | None, internal_notes: str | None, description: str | None, tag_ids: list[int] | None = None,
                             ) -> dict[str, Any]:

    try: pool = get_pool()
    except RuntimeError as e: console.log(f"[red]Error getting DB pool: {e}[/red]"); return {"success": False, "data": None, "error": str(e)}

    try: normalized_tag_ids = sorted({int(x) for x in (tag_ids or []) if int(x) > 0})
    except Exception: return {"success": False, "data": None, "error": "Invalid tag_ids"}

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():

                row = await conn.fetchrow("""
                    INSERT INTO public.products(
                        sku, name,
                        brand_id, category_id, supplier_id,
                        supplier_sku,
                        status, sell_price, stock, min_stock,
                        ean, weight_grams,
                        internal_notes, description
                    )
                    VALUES (
                        $1, $2,
                        $3, $4, $5,
                        $6,
                        $7, $8, $9, $10,
                        $11, $12,
                        $13, $14
                    )
                    RETURNING id;
                """,
                sku, name,
                brand_id, category_id, supplier_id,
                supplier_sku,
                status, sell_price, stock, min_stock,
                ean, weight_grams,
                internal_notes, description)

                if not row or row["id"] is None:
                    return {"success": False, "data": None, "error": "Insert product failed (missing id)"}

                product_id = int(row["id"])

                if not normalized_tag_ids:
                    return {"success": True, "data": {"product_id": product_id}, "error": ""}

                valid_rows = await conn.fetch("""
                    SELECT id
                    FROM public.product_tags
                    WHERE id = ANY($1::int[])
                        AND status = 1;
                """, normalized_tag_ids)

                valid_set = {r["id"] for r in valid_rows}
                invalid = [x for x in normalized_tag_ids if x not in valid_set]
                if invalid:
                    raise ValueError(f"Invalid or inactive tag_ids: {invalid}")

                await conn.execute("""
                    INSERT INTO public.product_tag_map (product_id, tag_id)
                    SELECT $1, x.tag_id
                    FROM unnest($2::int[]) AS x(tag_id)
                    ON CONFLICT DO NOTHING;
                """, product_id, normalized_tag_ids)

                return {"success": True, "data": {"product_id": product_id}, "error": ""}

    except UniqueViolationError as e:
        console.print("[yellow]Duplicate SKU error adding product[/yellow]", e)
        return {"success": False, "data": None, "error": "Sku gia' esistente", "code": 402}






