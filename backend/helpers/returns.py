from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas import (
    StandardResponse,

)

# from sql.returns.sql_returns import (
#     fetchProduct,
# )

from sql.returns.sql_returns_warehouse import (
    getReturnOrdersCount,
    getReturnedToHandleCount,
    getReturnedWithProblemCount,
)

from helpers.config import console # for logging, non cancellare
from utils.decorators import standard_error_handler

router = APIRouter(prefix="/returns")

@router.get("/returnOrdersCount", response_model=StandardResponse)
@standard_error_handler("getReturnOrdersCount")
async def getReturnOrdersCountHandler():
    count = await getReturnOrdersCount()
    if not count["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": count.get("error")})
    return {"success": True, "data": {"count": count["data"]}, "error": ""}

@router.get("/returnedToHandleCount", response_model=StandardResponse)
@standard_error_handler("getReturnedToHandleCount")
async def getReturnedToHandleCountHandler():
    count = await getReturnedToHandleCount()
    if not count["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": count.get("error")})
    return {"success": True, "data": {"count": count["data"]}, "error": ""}

@router.get("/returnedWithProblemCount", response_model=StandardResponse)
@standard_error_handler("getReturnedWithProblemCount")
async def getReturnedWithProblemCountHandler():
    count = await getReturnedWithProblemCount()
    if not count["success"]:
        return JSONResponse(status_code=500,content={"success": False, "data": None, "error": count.get("error")})
    return {"success": True, "data": {"count": count["data"]}, "error": ""}


@router.post("/quickFetch", response_model=StandardResponse)
@standard_error_handler("quickFetchReturns")
async def quickFetchReturnsHandler(payload: dict):
    # response = await fetchProduct(payload)
    # if not response["success"]:
    #     return JSONResponse(status_code=500,content={"success": False, "data": None, "error": response.get("error")})
    # return {"success": True, "data": response["data"], "error": ""}
    return {"success": True, "data": {"message": "quickFetchReturnsHandler not yet implemented"}, "error": ""}