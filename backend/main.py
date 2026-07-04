from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# ✅ STEP 1 — Create app FIRST
app = FastAPI()

# ✅ STEP 2 — Then add middleware
origins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "https://store-managemant-eta.vercel.app",
    "https://store-managemant-dtn01cxug-system-nirmata.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ✅ STEP 3 — Then import everything else
from src.utils.db import Base, engine
from src.admin.model import admin, OTPVerification
from src.admin.router import admin
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

# ✅ STEP 4 — Then include routers
app.include_router(admin)
app.include_router(categories_route)
app.include_router(products_route)
app.include_router(customer_route)
app.include_router(bill_route)
app.include_router(history_route)

@app.get("/")
def home():
    print("Home")