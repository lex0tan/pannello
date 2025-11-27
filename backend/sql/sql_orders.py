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
                    "creationDate": data[4],
                    "LastModified": data[5],
                    "product": (await countProductsInOrder(data[0]))["data"],
                    "status": data[7],
                    "notes": data[8]
                } for data in await cursor.fetchall()]
            }

    except Exception as e:
        return {"success" : False, "error" : str(e)}


async def countProductsInOrder(orderId : str | int):
    try:
        async with aiosqlite.connect("sql/databases/orders.db") as db:
            cursor = await db.execute("SELECT COUNT(*) FROM orderProduct WHERE orderId = ?", (orderId,))
            data = await cursor.fetchone()
            return {"success" : True, "data" : data[0]}
    except Exception as e:
        console.print(e)
        return {"success" : False, "error" : str(e)}

async def fetchOrderProducts(orderId : str):
    try:
        async with aiosqlite.connect("sql/databases/orders.db") as db:
            cursor = await db.execute("SELECT * FROM orderProduct WHERE orderId = ?", (orderId,))
            return {"success" : True, "data" : [{
                    "id": int(data[0]),
                    "orderId": int(data[1]),
                    "productId": int(data[2]),
                    "productName": data[3],
                    "sku": data[4],
                    "quantity": int(data[5]),
                    "price": float(data[6]),
                    "positionId": int(data[7])
                } for data in await cursor.fetchall()]
            }
    except ValueError as ve:
        console.print("Errore di conversione tipo durante fetch dei prodotti dell'ordine", style="bold red")
        console.print(ve, style="red")
        return {"success" : False, "error" : str(ve)}

    except Exception as e:
        console.print(e)
        return {"success" : False, "error" : str(e)}


async def countOrderNotes(orderId : str | int):
    try:
        async with aiosqlite.connect("sql/databases/orders.db") as db:
            cursor = await db.execute("SELECT COUNT(*) FROM orderNotes WHERE orderId = ?", (orderId,))
            data = await cursor.fetchone()
            return {"success" : True, "data" : data[0]}
    except Exception as e:
        console.print(e)
        return {"success" : False, "error" : str(e)}

async def fetchOrderNotes(orderId : str | int):
    try:
        async with aiosqlite.connect("sql/databases/orders.db") as db:
            cursor = await db.execute("SELECT * FROM orderNotes WHERE OrderId = ?", (orderId,))
            data = await cursor.fetchall()
            if data:
                return {"success" : True, "data" : [{
                        "id": int(row[0]),
                        "note": row[2],
                        "createdAt": row[3],
                        "addedBy": row[4]
                    } for row in data]
                }
            else:
                return {"success" : False, "error" : "Order not found"}
    except Exception as e:
        console.print(e)
        return {"success" : False, "error" : str(e)}