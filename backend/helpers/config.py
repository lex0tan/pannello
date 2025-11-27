from rich.console import Console

console = Console()

POSTGRES_DSN = "postgresql://postgres:kekko@localhost:5432/Orders"
ORDERS_DB_PATH = "sql/databases/orders.db"

async def getOrdersPerPage():
    return 10