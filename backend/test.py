from sql.sql_orders import fetchOrderProducts, fetchOrders




from rich.console import Console
import asyncio



console = Console()


# console.print(asyncio.run(fetchOrderProducts("1")))
console.print(asyncio.run(fetchOrders(0, 5)))