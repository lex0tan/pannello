from helpers.config import console, getOrdersPerPage
import aiosqlite

async def fetchOrders(start : int = None, finish : int = None):
    if start is None: start = 0
    if finish is None: finish = await getOrdersPerPage()

    console.print(f"Fetching orders from {start} to {finish}...")
    try:
        async with aiosqlite.connect("sql/databases/orders.db") as db:
            cursor = await db.execute("SELECT * FROM orders LIMIT ? OFFSET ?", (finish - start, start))
            return {"success" : True, "data" : [{
                    "id": data[0],
                    "name": data[1],
                    "platform": data[2],
                    "customerHandle": data[3],
                    "cretionDate": data[4],
                    "LastModified": data[5],
                    "product": data[6],
                    "status": data[7],
                    "notes": data[8]
                } for data in await cursor.fetchall()]
            }
    except Exception as e:
        return {"success" : False, "error" : str(e)}


async def fetchOrderProducts(orderId : str):
    try:
        async with aiosqlite.connect("sql/databases/orders.db") as db:
            cursor = await db.execute("SELECT * FROM orderProduct WHERE orderId = ?", (orderId,))
            return {"success" : True, "data" : [{
                    "id": data[0],
                    "orderId": data[1],
                    "productId": data[2],
                    "productName": data[3],
                    "sku": data[4],
                    "quantity": data[5],
                    "price": data[6],
                    "position": data[7]
                } for data in await cursor.fetchall()]
            }
    except Exception as e:
        return {"success" : False, "error" : str(e)}
