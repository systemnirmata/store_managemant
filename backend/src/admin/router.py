from fastapi import APIRouter, Depends, status
from src.admin import controller
from sqlalchemy.orm import Session
from src.admin.dtos import RegisterSchema, loginSchema, SendOTPSchema, VerifyOTPSchema
from src.utils.db import get_db

admin = APIRouter(prefix="/admin")

@admin.post("/create_admin", status_code=status.HTTP_201_CREATED)
def create_admin(body: RegisterSchema, db: Session = Depends(get_db)):
    return controller.admin_registar(body, db)

@admin.post("/send-otp", status_code=status.HTTP_200_OK)
def send_otp(body: SendOTPSchema, db: Session = Depends(get_db)):
    return controller.send_otp(body, db)

@admin.post("/verify_signup_otp", status_code=status.HTTP_200_OK)
def verify_otp(body: VerifyOTPSchema, db: Session = Depends(get_db)):
    return controller.verify_otp(body, db)

@admin.post("/login", status_code=status.HTTP_200_OK)
def login_admin(body: loginSchema, db: Session = Depends(get_db)):
    return controller.admin_login(body, db)