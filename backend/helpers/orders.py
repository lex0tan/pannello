from fastapi.responses import JSONResponse
from fastapi import APIRouter


from schemas import ordersResponse, orderOut, orderProductsResponse, orderProductOut, orderNotesResponse, orderNotesOut, orderNotesIn
from sql.sql_orders import fetchOrders, fetchOrderProducts, fetchOrderNotes, addOrderNotes, removeOrderNote
from helpers.config import console ## for logging, non cancellare
from helpers.decorators import standard_error_handler

router = APIRouter(prefix="/orders")

@router.get("", response_model=ordersResponse)
@standard_error_handler("il caricamento degli ordini")
async def getOrders():
    ordersData = await fetchOrders()
    if not ordersData["success"]: return JSONResponse(status_code=500,content={"success": False, "data" : None,  "error": ordersData.get("error")})
    return {"success": True, "data": [orderOut(**row) for row in ordersData["data"]]}

@router.get("/{orderId}/products", response_model=orderProductsResponse)
@standard_error_handler("il caricamento dei prodotti")
async def getOrderProducts(orderId: int):
    productsData = (await fetchOrderProducts(orderId))
    if not productsData["success"]: return JSONResponse(status_code=500, content={"success": False, "data" : None, "error": productsData.get("error")})
    return {"success": True, "data": [orderProductOut(**row) for row in productsData["data"]]}

@router.get("/{orderId}/notes", response_model=orderNotesResponse)
@standard_error_handler("il caricamento delle note")
async def getOrderNotes(orderId: int):
    orderNotes = await fetchOrderNotes(orderId)
    if  not orderNotes["success"]: return JSONResponse(status_code=500, content={"success": False, "data" : None, "error": orderNotes.get("error")})
    return {"success": True, "data": [orderNotesOut(**row) for row in orderNotes["data"]]}

@router.post("/{orderId}/addNotes")
@standard_error_handler("l'aggiunta di una nuova nota")
async def addNotes(orderId: int, items : orderNotesIn):
    success = await addOrderNotes(orderId, items.note, items.addedBy)
    if not success["success"]: return JSONResponse(status_code=500, content={"success": False, "error": "errore nell'aggiunta della nota"})
    return {"success": True, "data": success["data"], "message": "Nota aggiunta con successo"}

@router.delete("/{orderId}/deleteNote/{noteId}")
@standard_error_handler("la cancellazione della nota")
async def deleteNote(orderId: int, noteId: int):
    success = await removeOrderNote(orderId, noteId)
    if not success["success"]: return JSONResponse(status_code=500, content={"success": False, "error": "errore nella cancellazione della nota"})
    return {"success": True, "data" : None, "message": "Nota cancellata con successo"}