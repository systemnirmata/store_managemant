from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

app = FastAPI()

# Handle OPTIONS preflight manually
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": str(request.headers.get("origin", "*")),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://localhost:5173",
        "https://store-managemant-eta.vercel.app",
        "https://store-managemant-dtn01cxug-system-nirmata.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from src.utils.db import Base, engine
from src.admin.model import admin as admin_model, OTPVerification
from src.admin.router import admin as admin_router
from src.categories.model import categories
from src.categories.router import categories_route
from src.products.model import products
from src.products.router import products_route
from src.customer.router import customer_route
from src.bill.router import bill_route
from src.bill.model import bill, bill_items
from src.history.model import payment_history
from src.history.router import history_route

Base.metadata.create_all(engine)

app.include_router(admin_router)
app.include_router(categories_route)
app.include_router(products_route)
app.include_router(customer_route)
app.include_router(bill_route)
app.include_router(history_route)

@app.get("/")
def home():
    return {"status": "ok"}