from helpers.config import console, getOrdersPerPage
from typing import Any, Dict, Optional
from helpers.config import get_pool


VALID_SORT_FIELDS = {
    "id": "o.id",
    "name": "o.name",
    "platform": "o.platform",
    "created": "o.creation_date",
    "lastModified": "o.last_modified",
    "total": "o.ordertotal",
}


async def fetchOrders(page: int = 0,status: Optional[int] = None,sort_by: str = "creationDate",sort_dir: str = "desc") -> Dict[str, Any]:
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:
                # page_size dinamico da config / file
                page_size = await getOrdersPerPage()
                if not isinstance(page_size, int) or page_size <= 0:
                    page_size = 20  # fallback di sicurezza

                start = page * page_size

                sort_map = {
                    "id": "o.id",
                    "name": "o.name",
                    "platform": "o.platform",
                    "creationDate": "o.creation_date",
                    "lastModified": "o.last_modified",
                    "orderTotal": "o.order_total",
                }
                order_by_col = sort_map.get(sort_by, "o.creation_date")
                order_dir_sql = "ASC" if sort_dir.lower() == "asc" else "DESC"

                where_clauses = []
                params = []
                idx = 1

                if status is not None:
                    where_clauses.append(f"o.status = ${idx}")
                    params.append(status)
                    idx += 1

                where_sql = ""
                if where_clauses:
                    where_sql = "WHERE " + " AND ".join(where_clauses)

                limit_placeholder = f"${idx}"
                offset_placeholder = f"${idx + 1}"
                params.extend([page_size, start])

                query = f"""
                    SELECT
                        o.id,
                        o.name,
                        o.platform,
                        o.customer_handle,
                        o.creation_date,
                        o.last_modified,
                        o.status,
                        o.notes,
                        o.shippingprice,
                        o.payment_method,
                        o.tag,
                        o.order_total,
                        COALESCE(COUNT(p.id), 0) AS product_count
                    FROM orders o
                    LEFT JOIN order_products p ON p.order_id = o.id
                    {where_sql}
                    GROUP BY
                        o.id,
                        o.name,
                        o.platform,
                        o.customer_handle,
                        o.creation_date,
                        o.last_modified,
                        o.status,
                        o.notes,
                        o.shippingprice,
                        o.payment_method,
                        o.tag,
                        o.order_total
                    ORDER BY {order_by_col} {order_dir_sql}
                    LIMIT {limit_placeholder}
                    OFFSET {offset_placeholder}
                """

                rows = await conn.fetch(query, *params)

                data = [
                    {
                        "id": r["id"],
                        "name": r["name"],
                        "platform": r["platform"],
                        "customerHandle": r["customer_handle"],
                        "creationDate": r["creation_date"],
                        "lastModified": r["last_modified"],
                        "status": r["status"],
                        "notes": r["notes"],
                        "shippingPrice": r["shippingprice"],
                        "paymentMethod": r["payment_method"],
                        "tag": r["tag"],
                        "orderTotal": r["order_total"],
                        "productCount": r["product_count"],
                    }
                    for r in rows
                ]

                return {"success": True, "data": data}
        except Exception as e:
            console.print_exception()
            return {"success": False, "data": None, "error": str(e),}

    except Exception as e:
        console.print_exception()
        return {
            "success": False,
            "data": None,
            "error": str(e),
        }

async def fetchOrderProducts(orderId: int):
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:

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

        except Exception as e:
            console.print(f"❌ fetchOrderProducts inner error: {e}")
            return {"success": False, "error": str(e)}

    except Exception as e:
        console.print(f"❌ fetchOrderProducts error: {e}")
        return {"success": False, "error": str(e)}

async def fetchOrderNotes(orderId: int):
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:

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

                if not rows:
                    return {"success": True, "data": []}

                data = [{
                    "id": r["id"],
                    "note": r["note"],
                    "createdAt": r["created_at"],
                    "addedBy": r["added_by"],
                } for r in rows[::-1]]  # ordine inverso (più recenti prima)

                return {"success": True, "data": data}

        except Exception as e:
            console.print(f"❌ fetchOrderNotes inner error: {e}")
            return {"success": False, "error": str(e)}

    except Exception as e:
        console.print(f"❌ fetchOrderNotes error: {e}")
        return {"success": False, "error": str(e)}

async def addOrderNotes(orderId: int, note: str, addedBy: str):
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:
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
            console.print(f"❌ updateOrderNotes error: {e}")
    except Exception as e:
        console.print(f"❌ updateOrderNotes connection error: {e}")
        return {"success": False, "error": str(e)}

async def removeOrderNote(orderId: int, noteId: int):
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:

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
    except Exception as e:
        console.print(f"❌ removeOrderNote connection error: {e}")
        return {"success": False, "error": str(e)}

async def countOrders():
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetchrow(
                    """
                    SELECT count(*) as count FROM Orders

                    """
                )
                return {"success": True, "data": rows["count"]}
        except Exception as e:
            console.print(f"❌ countOrders inner error: {e}")
            return {"success": False, "error": str(e)}

    except Exception as e:
        console.print(f"❌ countOrders error: {e}")
        return {"success": False, "error": str(e)}

async def countOrders_sorted(column: str, value: str):
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:

                query = f"SELECT count(*) as count FROM Orders WHERE {column} = $1"
                rows = await conn.fetchrow(
                    query,
                    value
                )
                return {"success": True, "data": rows["count"]}
        except Exception as e:
            console.print(f"❌ countOrders_sorted error: {e}")
            return {"success": False, "error": str(e)}

    except Exception as e:
        console.print(f"❌ countOrders_sorted connection error: {e}")
        return {"success": False, "error": str(e)}

async def setOrderStatus(orderId: int, newStatus: int):
    try:
        pool = get_pool()
        try:
            async with pool.acquire() as conn:
                result = await conn.execute(
                    """
                    UPDATE Orders
                    SET status = $1
                    WHERE id = $2
                    """,
                    newStatus,
                    orderId,
                )
                if result == "UPDATE 0":
                    return {"success": False, "error": "Order not found"}
                return {"success": True}
        except Exception as e:
            console.print(f"❌ setOrderStatus error: {e}")
            return {"success": False, "error": str(e)}
    except Exception as e:
        console.print(f"❌ setOrderStatus connection error: {e}")
        return {"success": False, "error": str(e)}





