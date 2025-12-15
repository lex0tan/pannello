from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Any

# ---- orders ----

class OrderOut(BaseModel):
    id: int
    name: str
    platform: str
    customerHandle: str
    creationDate: datetime
    lastModified: datetime
    productCount: int
    status: int
    notes: str | None
    shippingPrice : float | None
    paymentMethod: int | None
    tag : int | None
    orderTotal: float | None

class OrderProductOut(BaseModel):
    id: int
    orderId: int
    productId: int | None
    productName: str
    sku: str
    quantity: int
    price: float
    positionId: int

class OrderNotesOut(BaseModel):
    id: int
    note: str
    createdAt: datetime
    addedBy: str

class OrderNotesIn(BaseModel):
    note: str = Field(..., min_length=1, max_length=1000)
    addedBy: str = Field(..., min_length=1, max_length=100)

# ---- Standard response ----
class StandardResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None

class OrdersResponse(StandardResponse):
    data: Optional[List[OrderOut]] = None

class OrderProductsResponse(StandardResponse):
    data: Optional[List[OrderProductOut]] = None

class OrderNotesResponse(StandardResponse):
    data: Optional[List[OrderNotesOut]] = None



# ---- orders ----

class ClientInfo(BaseModel):
    id: int
    name: str
    funnel: int
    tag : int | None
    registrationDate: datetime
    notes: str | None
    status: int
    lang: str | None
    last_order_date: datetime | None
    total_spent: float | None


class clientIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    funnel: int
    tag : int | None
    notes: str | None
    status: int
    lang: str | None



# ---- products ----

class productCreateIn(BaseModel):
    sku: str
    name: str

    brand_id: Optional[int] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None

    supplier_sku: Optional[str] = None
    ean: Optional[str] = None
    weight_grams: Optional[int] = None

    status: int = 1
    sell_price: float = 0.00
    stock: int = 0
    min_stock: int = 0

    internal_notes: Optional[str] = None
    description: Optional[str] = None

    tag_ids: List[int] = Field(default_factory=list)


class productSearchIn(BaseModel):
    limit: int = 50
    lookup: Optional[str] = None
    brand: Optional[int] = None
    category: Optional[int] = None
    supplier: Optional[int] = None
    status: Optional[int] = None
    understock: bool = False
    sort_by: Optional[str] = None  # "id" | "name" | "sell_price" | "stock"
    sort_dir: Optional[str] = None  # "asc" | "desc"

class productExportIn(productSearchIn):
    export_format: str = "csv"  # "csv" | "xlsx"


# ---- tags ----
class CreateProductTagRequest(BaseModel):
    tag_name: str = Field(min_length=1)
    color: Optional[str] = None
    notes: Optional[str] = None

class SyncProductTagsRequest(BaseModel):
    tag_ids: List[int] = Field(default_factory=list)