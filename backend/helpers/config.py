from rich.console import Console
from typing import Optional
import asyncpg

console = Console()

POSTGRES_DSN = "postgresql://postgres:kekko@localhost:5432/Orders"


async def getOrdersPerPage():
    return 20


_pool: Optional[asyncpg.Pool] = None

async def init_pool(dsn: str, min_size: int = 1, max_size: int = 10) -> None:
    global _pool
    _pool = await asyncpg.create_pool(dsn=dsn, min_size=min_size, max_size=max_size)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    return _pool