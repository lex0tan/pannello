from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Any

# ---- Modelli "dato" ----

class orderOut(BaseModel):
    id: int
    name: str
    platform: str
    customerHandle: str
    creationDate: datetime      # <-- tolto alias
    lastModified: datetime
    productCount: int
    status: str
    notes: str | None

class orderProductOut(BaseModel):
    id: int
    orderId: int
    productId: int | None
    productName: str
    sku: str
    quantity: int
    price: float
    positionId: int

class orderNotesOut(BaseModel):
    id: int
    note: str
    createdAt: datetime
    addedBy: str


class orderNotesIn(BaseModel):
    note: str = Field(..., min_length=1, max_length=1000)
    addedBy: str = Field(..., min_length=1, max_length=100)
    
# ---- Standard response ----
class StandardResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None

class ordersResponse(StandardResponse):
    data: Optional[List[orderOut]] = None

class orderProductsResponse(StandardResponse):
    data: Optional[List[orderProductOut]] = None

class orderNotesResponse(StandardResponse):
    data: Optional[List[orderNotesOut]] = None