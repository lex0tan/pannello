from fastapi import APIRouter

from sql.sql_orders import fetchOrders, fetchOrderProducts


router = APIRouter(prefix="/orders")

@router.get("/getOrders")
async def getOrders():
    return await fetchOrders()

@router.get("/getOrderProducts/{orderId}")
async def getOrderProducts(orderId: str):
    return await fetchOrderProducts(orderId)


