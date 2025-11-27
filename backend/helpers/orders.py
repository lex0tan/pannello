from fastapi import APIRouter
from fastapi import HTTPException
from pydantic import ValidationError


import traceback




from sql.sql_orders import fetchOrders, fetchOrderProducts, fetchOrderNotes
from schemas import ordersResponse, orderOut, orderProductsResponse, orderProductOut, orderNotesResponse, orderNotesOut
from helpers.config import console

router = APIRouter(prefix="/orders")

@router.get("/getOrders", response_model=ordersResponse)
async def getOrders():
    async def parseOrders():
        try:
            ordersData = (await fetchOrders())
            if ordersData["success"] is False:
                raise HTTPException(status_code=500, detail=ordersData.get("error"))
            return [orderOut(**row) for row in ordersData["data"]]

        except ValidationError as ve:
            console.print("Errore di validazione durante fetch degli ordini", style="bold red")
            for i in ve.errors(): console.print(f"Errore nella validazione di \'{i['loc'][0]}\', valore ricevuto: {i['input']}\n {i['msg'].strip()}", style="red")
            raise HTTPException(status_code=422,detail=f"Errore nella struttura dei dati ricevuti dal database: {ve.errors()}")
    try:
        orders = await parseOrders()
        return {"success": True, "data": orders}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella validazione dei dati ordine: {e.__traceback__}")

@router.get("/getOrderNotes")
@router.get("/getOrderProducts")
async def _404():
    raise HTTPException(status_code=404, detail="orderId mancante nell'URL. Usa /getOrderProducts/{orderId}")

@router.get("/getOrderProducts/{orderId}", response_model=orderProductsResponse)
async def getOrderProducts(orderId: str):
    async def parseOrderProducts():
        try:
            productsData = (await fetchOrderProducts(orderId))
            if productsData["success"] is False:
                raise HTTPException(status_code=500, detail=productsData.get("error"))
            return [orderProductOut(**row) for row in productsData["data"]]

        except ValidationError as ve:
            console.print("Errore di validazione durante fetch dei prodotti dell'ordine", style="bold red")
            for i in ve.errors(): console.print(f"Errore nella validazione di \'{i['loc'][0]}\', valore ricevuto: {i['input']}\n {i['msg'].strip()}", style="red")
            raise HTTPException(status_code=422,detail=f"Errore nella struttura dei dati ricevuti dal database: {ve.errors()}")
    try:
        products = await parseOrderProducts()
        return {"success": True, "data": products}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella validazione dei dati dei prodotti dell'ordine: {e.__traceback__}")


@router.get("/getOrderNotes/{orderId}", response_model=orderNotesResponse)
async def getOrderNotes(orderId: str):
    async def parseOrderNotes():
        try:
            orderNotes = await fetchOrderNotes(orderId)
            if orderNotes["success"] is False:
                raise HTTPException(status_code=500, detail=orderNotes.get("error"))
            return [orderNotesOut(**row) for row in orderNotes["data"]]

        except ValidationError as ve:
            console.print("Errore di validazione durante fetch delle note dell'ordine", style="bold red")
            for i in ve.errors(): console.print(f"Errore nella validazione di \'{i['loc'][0]}\', valore ricevuto: {i['input']}\n {i['msg'].strip()}", style="red")
            raise HTTPException(status_code=422,detail=f"Errore nella struttura dei dati ricevuti dal database: {ve.errors()}")
        except Exception as e:
            console.print("Errore sconosciuto durante il parsing delle note dell'ordine", style="bold red")
            console.print(traceback.format_exc(), style="red")
            raise HTTPException(status_code=500, detail=f"Errore sconosciuto durante il parsing delle note dell'ordine: {str(e)}")

    try:
        notes = await parseOrderNotes()
        return {"success": True, "data": notes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore nella validazione dei dati delle note dell'ordine: {e.__traceback__}")


