from fastapi.responses import JSONResponse
from fastapi import APIRouter, Query
from typing import Optional

from schemas import (
    OrdersResponse,
    OrderOut,
    OrderProductsResponse,
    OrderProductOut,
    OrderNotesResponse,
    OrderNotesOut,
    OrderNotesIn,
)
from sql.sql_orders import (
    fetchOrders,
    fetchOrderProducts,
    fetchOrderNotes,
    addOrderNotes,
    removeOrderNote,
    countOrders,
    setOrderStatus,
    countOrders_sorted,
)
from helpers.config import console # for logging, non cancellare
from helpers.decorators import standard_error_handler

router = APIRouter(prefix="/orders")

@router.get("", response_model=OrdersResponse)
@standard_error_handler("il caricamento degli ordini")
async def getOrders(page: int = Query(0, ge=0),status: Optional[int] = Query(None),sort_by: str = Query("creationDate"),sort_dir: str = Query("desc"),):
    if sort_by not in ["asc", "desc", "id", "name", "platform", "customerHandle", "creationDate", "lastModified", "productCount", "status", "orderTotal"]:
        sort_by = "creationDate"; console.log("[yellow]Parametro sort_by non valido, impostato a default 'creationDate'[/yellow]")
    if sort_dir not in ["asc", "desc"]: sort_dir = "desc"; console.log("[yellow]Parametro sort_dir non valido, impostato a default 'desc'[/yellow]")
    ordersData = await fetchOrders(page=page,status=status,sort_by=sort_by,sort_dir=sort_dir,)

    if not ordersData["success"]: return JSONResponse(status_code=500,content={"success": False,"data": None,"error": ordersData.get("error"),},)
    return {"success": True,"data": [OrderOut(**row) for row in ordersData["data"]],}

@router.get("/{orderId}/products", response_model=OrderProductsResponse)
@standard_error_handler("il caricamento dei prodotti")
async def getOrderProducts(orderId: int):
    productsData = (await fetchOrderProducts(orderId))
    if not productsData["success"]: return JSONResponse(status_code=500, content={"success": False, "data" : None, "error": productsData.get("error")})  # noqa: E701
    return {"success": True, "data": [OrderProductOut(**row) for row in productsData["data"]]}

@router.get("/{orderId}/notes", response_model=OrderNotesResponse)
@standard_error_handler("il caricamento delle note")
async def getOrderNotes(orderId: int):
    orderNotes = await fetchOrderNotes(orderId)
    if  not orderNotes["success"]: return JSONResponse(status_code=500, content={"success": False, "data" : None, "error": orderNotes.get("error")})  # noqa: E701
    return {"success": True, "data": [OrderNotesOut(**row) for row in orderNotes["data"]]}

@router.post("/{orderId}/addNotes")
@standard_error_handler("l'aggiunta di una nuova nota")
async def addNotes(orderId: int, items : OrderNotesIn):
    success = await addOrderNotes(orderId, items.note, items.addedBy)
    if not success["success"]: return JSONResponse(status_code=500, content={"success": False, "error": "errore nell'aggiunta della nota"})  # noqa: E701
    return {"success": True, "data": success["data"], "message": "Nota aggiunta con successo"}

@router.post("/updateStatus/{orderId}")
@standard_error_handler("l'aggiornamento dello stato dell'ordine")
async def updateOrderStatus(orderId: int, payload: dict):
    success = await setOrderStatus(orderId, payload.get("newStatus"))
    if not success["success"]: return JSONResponse(status_code=500, content={"success": False, "error": "errore nell'aggiornamento dello stato"})  # noqa: E701
    return {"success": True, "data": None, "message": "Stato aggiornato con successo"}


@router.delete("/{orderId}/deleteNote/{noteId}")
@standard_error_handler("la cancellazione della nota")
async def deleteNote(orderId: int, noteId: int):
    success = await removeOrderNote(orderId, noteId)
    if not success["success"]: return JSONResponse(status_code=500, content={"success": False, "error": "errore nella cancellazione della nota"})  # noqa: E701
    return {"success": True, "data" : None, "message": "Nota cancellata con successo"}

@router.get("/ordersCount")
@standard_error_handler("il caricamento del conteggio ordini")
async def getOrdersCount():
    count = await countOrders()
    if not count["success"]: return JSONResponse(status_code=500,content={"success": False, "data" : None,  "error": count.get("error")})  # noqa: E701
    return {"success": True, "data": count["data"]}

@router.get("/problemCount")
@standard_error_handler("il caricamento del conteggio ordini con problemi")
async def getProblemOrdersCount():
    count = await countOrders_sorted("status", 6)
    if not count["success"]: return JSONResponse(status_code=500,content={"success": False, "data" : None,  "error": count.get("error")})  # noqa: E701
    return {"success": True, "data": count["data"]}

@router.get("/toShipCount")
@standard_error_handler("il caricamento del conteggio ordini da spedire")
async def getToShipOrdersCount():
    count = await countOrders_sorted("status", 7)
    if not count["success"]: return JSONResponse(status_code=500,content={"success": False, "data" : None,  "error": count.get("error")})  # noqa: E701
    return {"success": True, "data": count["data"]}

@router.get("/waitingForProductsCount")
@standard_error_handler("il caricamento del conteggio ordini in attesa di prodotti")
async def getWaitingForProductsCount():
    count = await countOrders_sorted("status", 2)
    if not count["success"]: return JSONResponse(status_code=500,content={"success": False, "data" : None,  "error": count.get("error")})  # noqa: E701
    return {"success": True, "data": count["data"]}