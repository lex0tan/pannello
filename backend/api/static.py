import json
from fastapi import APIRouter
from fastapi.responses import JSONResponse, FileResponse
from helpers.config import console ## for logging, non cancellare
from pathlib import Path

router = APIRouter(prefix="/config")


@router.get("/status.json")
async def get_status():
    return JSONResponse(content={"success": True,"data": json.loads(Path("api/src/status.json").read_text(encoding="utf-8"))})

@router.get("/positions.json")
async def get_positions():
    return JSONResponse(content={"success": True,"data": json.loads(Path("api/src/positions.json").read_text(encoding="utf-8"))})

@router.get("/paymentsMethods.json")
async def get_payments():
    return JSONResponse(content={"success": True,"data": json.loads(Path("api/src/paymentMethods.json").read_text(encoding="utf-8"))})

@router.get("/clientTags.json")
async def get_tags():
    return JSONResponse(content={"success": True,"data": json.loads(Path("api/src/tags.json").read_text(encoding="utf-8"))})

@router.get("/logo.png")
async def get_logo():
    return FileResponse("api/src/logo.png", media_type="image/png")
