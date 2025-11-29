import os
from rich.console import Console

console = Console()

POSTGRES_DSN = os.getenv("POSTGRES_DSN", "postgresql://postgres:postgres@localhost:5432/Orders")
ORDERS_DB_PATH = "sql/databases/orders.db"

async def getOrdersPerPage():
    return 10