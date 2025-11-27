from pydantic import BaseModel
from typing import List, Optional


# getOrders
class orderOut(BaseModel):
    id: int
    name: str
    platform: str
    customerHandle: str
    creationDate: str
    LastModified: str
    product: int
    status: str
    notes: str | None

class ordersResponse(BaseModel):
    success: bool
    data: List[orderOut]

# getOrderProducts
class orderProductOut(BaseModel):
    id: int
    orderId: int
    productId: int | None
    productName: str
    sku: str
    quantity: int
    price: float
    positionId: int

class orderProductsResponse(BaseModel):
    success: bool
    data: List[orderProductOut]


# getOrderNotes
class orderNotesOut(BaseModel):
    id: int
    note: str
    createdAt: str
    addedBy: str

class orderNotesResponse(BaseModel):
    success: bool
    data: List[orderNotesOut]
