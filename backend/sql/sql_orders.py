from helpers.config import ORDERS_DB_PATH, POSTGRES_DSN, console, getOrdersPerPage
import asyncpg

async def fetchOrders(start: int | None = None, finish: int | None = None):
    if start is None:
        start = 0
    if finish is None:
        page_size = await getOrdersPerPage()
    else:
        page_size = finish - start

    console.print(f"Fetching orders from {start} to {start + page_size}...")

    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        try:
            rows = await conn.fetch(
                """
                SELECT
                    o.id,
                    o.name,
                    o.platform,
                    o.customer_handle,
                    o.creation_date,
                    o.last_modified,
                    o.status,
                    o.notes,
                    COALESCE(COUNT(p.id), 0) AS product_count
                FROM Orders o
                LEFT JOIN order_products p ON p.order_id = o.id
                GROUP BY
                    o.id,
                    o.name,
                    o.platform,
                    o.customer_handle,
                    o.creation_date,
                    o.last_modified,
                    o.status,
                    o.notes
                ORDER BY o.id
                LIMIT $1 OFFSET $2
                """,
                page_size,
                start,
            )
            data = [{
                "id": r["id"],
                "name": r["name"],
                "platform": r["platform"],
                "customerHandle": r["customer_handle"],
                "creationDate": r["creation_date"],
                "lastModified": r["last_modified"],
                "productCount": r["product_count"],
                "status": r["status"],
                "notes": r["notes"],
            } for r in rows]

            return {"success": True, "data": data}

        finally:
            await conn.close()

    except Exception as e:
        console.print(f"❌ fetchOrders error: {e}")
        return {"success": False, "error": str(e)}

async def fetchOrderProducts(orderId: int):
    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        try:
            rows = await conn.fetch(
                """
                SELECT
                    id,
                    order_id,
                    product_id,
                    product_name,
                    sku,
                    quantity,
                    price,
                    position_id
                FROM order_products
                WHERE order_id = $1
                ORDER BY id
                """,
                orderId,
            )

            data = [{
                "id": r["id"],
                "orderId": r["order_id"],
                "productId": r["product_id"],
                "productName": r["product_name"],
                "sku": r["sku"],
                "quantity": r["quantity"],
                "price": float(r["price"]),  # NUMERIC -> float
                "positionId": r["position_id"],
            } for r in rows]

            return {"success": True, "data": data}

        finally:
            await conn.close()

    except Exception as e:
        console.print(f"❌ fetchOrderProducts error: {e}")
        return {"success": False, "error": str(e)}

async def fetchOrderNotes(orderId: int):
    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        try:
            rows = await conn.fetch(
                """
                SELECT
                    id,
                    order_id,
                    note,
                    created_at,
                    added_by
                FROM order_notes
                WHERE order_id = $1
                ORDER BY id
                """,
                orderId,
            )

            data = [{
                "id": r["id"],
                "note": r["note"],
                "createdAt": r["created_at"],
                "addedBy": r["added_by"],
            } for r in rows[::-1]]  # ordine inverso (più recenti prima)

            return {"success": True, "data": data}

        finally:
            await conn.close()

    except Exception as e:
        console.print(f"❌ fetchOrderNotes error: {e}")
        return {"success": False, "error": str(e)}

async def addOrderNotes(orderId: int, note: str, addedBy: str):
    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        try:
            data = await conn.fetchrow(
                """
                INSERT INTO order_notes (order_id, note, added_by)
                VALUES ($1, $2, $3)
                RETURNING id, note, added_by as addedBy, created_at as createdAt
                """,

                orderId,
                note,
                addedBy,
            )
            return {"success": True, "data": dict(data)}

        except Exception as e:
            console.print(f"❌ addOrderNotes error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            await conn.close()
    except Exception as e:
        console.print(f"❌ addOrderNotes connection error: {e}")
        return {"success": False, "error": str(e)}

async def removeOrderNote(orderId: int, noteId: int):
    try:
        conn = await asyncpg.connect(POSTGRES_DSN)
        try:
            result = await conn.execute(
                """
                DELETE FROM order_notes
                WHERE order_id = $1 AND id = $2
                """,
                orderId,
                noteId,
            )
            if result == "DELETE 0":
                return {"success": False, "error": "Note not found"}
            return {"success": True}
        except Exception as e:
            console.print(f"❌ removeOrderNote error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            await conn.close()
    except Exception as e:
        console.print(f"❌ removeOrderNote connection error: {e}")
        return {"success": False, "error": str(e)}