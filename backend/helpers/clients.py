from fastapi.responses import JSONResponse
from fastapi import APIRouter, Query
from typing import Optional

from schemas import (ClientInfo, clientIn)
from backend.sql.orders.sql_orders import ()
from helpers.config import console # for logging, non cancellare
from helpers.decorators import standard_error_handler

router = APIRouter(prefix="/clients")

@router.get("")
@standard_error_handler("il caricamento dei clienti")
async def clientApi():
    return {"success": True, "data": []}


