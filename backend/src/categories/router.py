from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.utils.db import get_db
from src.utils.auth import get_current_admin
from src.categories.dtos import createCategoriesSchema, getCategoriesSchema, updateCategoriesSchema, updteCategoriesResponseSchema, deleteCategoriesRespsonseSchema
from src.categories import controller

categories_route = APIRouter(prefix="/categories", tags=["categories"])



@categories_route.post("/create_category", status_code=status.HTTP_201_CREATED)
def create_category(body: createCategoriesSchema, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return controller.create_category(body, db)

@categories_route.get("/get_category", response_model=list[getCategoriesSchema], status_code=status.HTTP_200_OK)
def get_categories(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return controller.get_categories(db)

@categories_route.patch("/update_category/{category_id}", response_model=updteCategoriesResponseSchema, status_code=status.HTTP_201_CREATED)
def update_category(category_id: int, body: updateCategoriesSchema, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return controller.update_category(category_id, body, db)

@categories_route.delete("/delete_category/{category_id}", response_model=deleteCategoriesRespsonseSchema, status_code=status.HTTP_200_OK)
def delete_category(category_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return controller.delete_category(category_id, db)