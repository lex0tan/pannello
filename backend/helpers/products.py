from fastapi import APIRouter, Query, Path
from fastapi.responses import JSONResponse, Response
from schemas import SyncProductTagsRequest, productExportIn
from sql.master_data.sql_product_tags import getProductTagsByProductId, syncProductTagsForProduct
import csv, io
    

from schemas import (
    StandardResponse,
    productCreateIn,
    productSearchIn
)
from sql.orders.sql_products import (
    # fetchProduct,
    getTotalProductsCount,
    getUnderstockCount,
    addProduct,
    quickFetchProduct,
)
from helpers.config import console # for logging, non cancellare
from utils.decorators import standard_error_handler

router = APIRouter(prefix="/products")

@router.get("/total", response_model=StandardResponse)
@standard_error_handler("il conteggio dei prodotti")
async def getProductsCount():
    total_count = await getTotalProductsCount()
    if not total_count["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": total_count.get("error")})
    return {"success": True, "data": {"total_count": total_count["data"]}, "error": ""}

@router.get("/understock", response_model=StandardResponse)
@standard_error_handler("il conteggio dei prodotti sotto stock")
async def getUnderstockProductsCount():
    understock_count = await getUnderstockCount()
    if not understock_count["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": understock_count.get("error")})
    return {"success": True, "data": {"understock_count": understock_count["data"]}, "error": ""}

@router.get("/{product_id}/tags", response_model=StandardResponse)
@standard_error_handler("il caricamento dei tag del prodotto")
async def getTagsForProduct(
    product_id: int = Path(..., gt=0),
    include_inactive: bool = Query(False)
):
    tagsData = await getProductTagsByProductId(product_id=product_id, include_inactive=include_inactive)
    if not tagsData["success"]:
        return JSONResponse(
            status_code=500,
            content={"success": False, "data": None, "error": tagsData.get("error")}
        )
    return {"success": True, "data": tagsData["data"], "error": ""}

@router.put("/{product_id}/tags", response_model=StandardResponse)
@standard_error_handler("l'aggiornamento dei tag del prodotto")
async def syncTagsForProduct(
    payload: SyncProductTagsRequest,
    product_id: int = Path(..., gt=0)
):
    syncData = await syncProductTagsForProduct(product_id=product_id, tag_ids=payload.tag_ids)
    if not syncData["success"]:
        return JSONResponse(
            status_code=400,
            content={"success": False, "data": None, "error": syncData.get("error")}
        )
    return {"success": True, "data": True, "error": ""}

@router.post("/quickFetch", response_model=StandardResponse)
@standard_error_handler("il fetch dei prodotti")
async def fetchProducts(data: productSearchIn):
    productsData = await quickFetchProduct(**data.model_dump())
    if not productsData["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": productsData.get("error")})
    return {"success": True, "data": productsData["data"], "error": ""}

@router.post('/export')
@standard_error_handler("l'esportazione dei prodotti")
async def exportProducts(data: productExportIn):
    productsData = await quickFetchProduct(**data.model_dump(exclude={"export_format"}), export=True)
    if not productsData["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": productsData.get("error")})
    buffer = io.StringIO()
    if data.export_format == "csv":
        writer = csv.writer(buffer)
        writer.writerow([row for row in productsData["data"][0].keys()])
        for product in productsData["data"]: writer.writerow(list(product.values()))
        return Response(content=buffer.getvalue(), media_type='text/csv', headers={
            'Content-Disposition': 'attachment; filename="products_export.csv"',
            "Content-Length": str(len(buffer.getvalue())),
            "Cache-Control": "no-cache"
        })

@router.post("/newProduct", response_model=StandardResponse)
@standard_error_handler("l'aggiunta di un nuovo prodotto")
async def addNewProduct(product: productCreateIn):
    console.print(f"Aggiunta nuovo prodotto: {product}")
    res = await addProduct(**product.model_dump())
    if not res["success"]:
        return JSONResponse(status_code=res.get("code", 500),content={"success": False, "data": None, "error": res.get("error")})

    return {"success": True, "data": res["data"], "error": ""}

