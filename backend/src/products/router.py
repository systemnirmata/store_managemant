from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from src.utils.db import get_db
from src.products import controller
from src.utils.auth import get_current_admin

from src.products.dtos import (
    createProductSchema, getProductSchema, updateProductSchema,
    deleteProductResponseSchema, imageActionResponseSchema
)

products_route = APIRouter(prefix="/products", tags=["products"])

@products_route.post("/create_product", status_code=status.HTTP_201_CREATED)
def create_product(body: createProductSchema, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.create_product(body, db)

@products_route.get("/get_products", response_model=list[getProductSchema], status_code=status.HTTP_200_OK)
def get_all_products(db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_all_products(db)

@products_route.get("/get_products/{cid}", response_model=list[getProductSchema], status_code=status.HTTP_200_OK)
def get_products_by_category(cid: int, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_products_by_category(cid, db)

@products_route.patch("/update_product/{pid}", response_model=getProductSchema, status_code=status.HTTP_200_OK)
def update_product(pid: int, body: updateProductSchema, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.update_product(pid, body, db)

@products_route.delete("/delete_product/{pid}", response_model=deleteProductResponseSchema, status_code=status.HTTP_200_OK)
def delete_product(pid: int, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.delete_product(pid, db)

@products_route.post("/upload_image/{pid}", response_model=imageActionResponseSchema, status_code=status.HTTP_200_OK)
async def upload_product_image(pid: int, file: UploadFile = File(...), db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return await controller.upload_product_image(pid, file, db)

@products_route.get("/image/{pid}")
def get_product_image(pid: int, db: Session = Depends(get_db)):
    return controller.get_product_image(pid, db)

@products_route.delete("/delete_image/{pid}", response_model=imageActionResponseSchema, status_code=status.HTTP_200_OK)
def delete_product_image(pid: int, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.delete_product_image(pid, db)