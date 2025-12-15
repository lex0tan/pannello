from fastapi.responses import JSONResponse
from fastapi import APIRouter, Path, Query
from typing import Optional

from schemas import (
    StandardResponse, CreateProductTagRequest
)

from sql.master_data.sql_master_data import (
    getBrandsList, getCategoriesList, getSuppliersList,
    getStatuses
)

from sql.master_data.sql_product_tags import (
    getProductTagsList,
    createOrGetProductTag,
)

from helpers.config import console # for logging, non cancellare
from utils.decorators import standard_error_handler


router = APIRouter(prefix="/master-data")


@router.get("/brands", response_model=StandardResponse)
@standard_error_handler("il caricamento delle marche")
async def getBrands():
    brandsData = await getBrandsList()
    if not brandsData["success"]:
        return JSONResponse(status_code=500,content={"success": False,"data": None,"error": brandsData.get("error")})
    return {"success": True, "data": brandsData["data"], "error": ""}

@router.get("/categories", response_model=StandardResponse)
@standard_error_handler("il caricamento delle categorie")
async def getCategories():
    categoriesData = await getCategoriesList()
    if not categoriesData["success"]:
        return JSONResponse(status_code=500,content={"success": False,"data": None,"error": categoriesData.get("error")})
    return {"success": True, "data": categoriesData["data"], "error": ""}

@router.get("/suppliers", response_model=StandardResponse)
@standard_error_handler("il caricamento dei fornitori")
async def getSuppliers():
    suppliersData = await getSuppliersList()
    if not suppliersData["success"]:
        return JSONResponse(status_code=500,content={"success": False,"data": None,"error": suppliersData.get("error")})
    return {"success": True, "data": suppliersData["data"], "error": ""}


@router.get("/product-tags", response_model=StandardResponse)
@standard_error_handler("il caricamento dei tag prodotto")
async def getProductTags(include_inactive: bool = Query(False)):
    tagsData = await getProductTagsList(include_inactive=include_inactive)
    if not tagsData["success"]:
        return JSONResponse(
            status_code=500,
            content={"success": False, "data": None, "error": tagsData.get("error")}
        )
    return {"success": True, "data": tagsData["data"], "error": ""}

@router.post("/product-tags", response_model=StandardResponse)
@standard_error_handler("la creazione del tag prodotto")
async def createProductTag(payload: CreateProductTagRequest):
    tagData = await createOrGetProductTag(tag_name=payload.tag_name,color=payload.color,notes=payload.notes)
    if not tagData["success"]:
        return JSONResponse(
            status_code=400,
            content={"success": False, "data": None, "error": tagData.get("error")}
        )
    return {"success": True, "data": tagData["data"], "error": ""}


@router.get("/statuses", response_class=JSONResponse)
async def master_data_status():
    statuses = await getStatuses()
    if not statuses["success"]:
        return JSONResponse(status_code=500, content={"success": False, "message": "Errore nel recupero degli stati master data.", "error": statuses.get("error")})
    return {"success": True, "data": statuses, "error": ""}