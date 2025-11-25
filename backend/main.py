from fastapi.middleware.cors import CORSMiddleware


from fastapi import FastAPI
from helpers import orders


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # permetti tutte le origini (per ora)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/status")
def home():
    return {"success": True, "message": "API attiva!"}

app.include_router(orders.router)
