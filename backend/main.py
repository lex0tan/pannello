from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pathlib import Path

from helpers.config import POSTGRES_DSN, init_pool, close_pool
from api import static as staticRouter
from helpers import orders as ordersRouter

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool(POSTGRES_DSN)
    try:
        yield
    finally:
        await close_pool()

app = FastAPI(lifespan=lifespan)

BASE_DIR = Path(__file__).resolve().parent          # → .../backend
FRONTEND_DIR = BASE_DIR.parent / "source"           # → .../source

app.mount(
    "/static",
    StaticFiles(directory=str(FRONTEND_DIR), html=False),
    name="static",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000"],  # permetti tutte le origini (per ora)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/status")
def home():
    return {"success": True, "message": "API attiva!"}

@app.get("/", response_class=FileResponse)
async def root():
    return FileResponse(str(FRONTEND_DIR / "html" / "main.html"))

@app.get("/ordini++.html", response_class=FileResponse)
async def orders_page():
    # pagina ordini
    return FileResponse(str(FRONTEND_DIR / "html" / "ordini++.html"))

@app.get("/.well-known/appspecific/com.chrome.devtools.json")
async def ignore():
    return {}


app.include_router(ordersRouter.router)
app.include_router(staticRouter.router)



