from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal

class createProductSchema(BaseModel):
    product_name: str
    cid: int
    unit: Optional[str] = None
    price: Decimal

class getProductSchema(BaseModel):
    pid: int
    cid: int
    product_name: str
    unit: Optional[str] = None
    price: Decimal
    is_active: bool
    created_at: datetime
    image_url: Optional[str] = None  # built as "/products/image/{pid}" if an image exists

    class Config:
        from_attributes = True

class updateProductSchema(BaseModel):
    product_name: Optional[str] = None
    cid: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[Decimal] = None

class deleteProductResponseSchema(BaseModel):
    pid: int
    product_name: str

    class Config:
        from_attributes = True

class imageActionResponseSchema(BaseModel):
    message: str
    pid: int