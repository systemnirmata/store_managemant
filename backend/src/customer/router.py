from fastapi import APIRouter, Depends, status
from src.customer.dtos import customerResponseScema, createCustomerSchema
from sqlalchemy.orm import Session
from src.utils.db import get_db
from src.customer import controller
from pydantic import BaseModel
from src.utils.auth import get_current_admin


customer_route = APIRouter(prefix="/customer", tags=["customer"])

class PaymentSchema(BaseModel):
    amount: float

class DeleteMonthSchema(BaseModel):
    month_key: str


@customer_route.post("/create_customer", response_model=customerResponseScema, status_code=status.HTTP_201_CREATED)
def create_customer(body: createCustomerSchema, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.createCustomer(body, db)

@customer_route.get("/get_all_customer")
def get_all_customer(db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_all_customer(db)


@customer_route.get("/get_monthly_customers")
def get_monthly_customers(db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_monthly_customers(db)

@customer_route.get("/get_customer/{cid}")
def get_customer(cid: int, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_customer(cid, db)

@customer_route.post("/pay_customer/{cid}", status_code=status.HTTP_200_OK)
def pay_customer(cid: int, body: PaymentSchema, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.pay_customer(cid, body.amount, db)

@customer_route.post("/delete_month_bills/{cid}", status_code=status.HTTP_200_OK)
def delete_month_bills(cid: int, body: DeleteMonthSchema, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.delete_month_bills(cid, body.month_key, db)