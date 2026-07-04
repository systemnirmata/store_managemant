from fastapi import HTTPException
from src.admin.dtos import loginSchema, RegisterSchema, SendOTPSchema, VerifyOTPSchema
from src.utils.db import get_db
from sqlalchemy.orm import Session
from src.admin.model import admin, OTPVerification
from src.utils.settings import settings
from datetime import datetime, timedelta, timezone
import jwt
import random
import requests
from src.utils.auth import hash_password, verify_password, create_access_token

def admin_registar(body: RegisterSchema, db: Session):

    existing = db.query(admin).all()
    if existing:
        raise HTTPException(400, detail="Only One admin allowed")

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # ✅ Always use SENDER_EMAIL from ENV, not body.email
    owner_email = settings.SENDER_EMAIL

    new_otp = OTPVerification(
        email=owner_email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(new_otp)
    db.commit()

    # ✅ OTP always goes to owner ENV email
    send_otp_email_via_brevo(owner_email, otp_code, body.username)

    hashed_pw = hash_password(body.password)

    new_admin = admin(
        username=body.username,
        email=owner_email,   # ✅ save ENV email in DB too
        password=hashed_pw,
        is_verified=False
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return {"message": "Registered successfully. OTP sent to owner email. Please verify."}


def send_otp(body: SendOTPSchema, db: Session):
    owner = db.query(admin).first()

    if not owner:
        raise HTTPException(404, detail="No admin account found")

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # ✅ Always use SENDER_EMAIL from ENV
    owner_email = settings.SENDER_EMAIL

    new_otp = OTPVerification(
        email=owner_email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(new_otp)
    db.commit()

    # ✅ OTP always goes to ENV email no matter what anyone types
    send_otp_email_via_brevo(owner_email, otp_code, owner.username)

    return {"message": "OTP sent to registered email. Valid for 10 minutes."}


def send_otp_email_via_brevo(email: str, otp_code: str, username: str):
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }
    payload = {
        "sender": {
            "name": settings.SHOP_NAME,
            "email": settings.SENDER_EMAIL   # FROM = ENV email
        },
        "to": [{"email": email, "name": username}],  # TO = ENV email
        "subject": "Your OTP for Smart Shop Login",
        "htmlContent": f"""
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                <h2 style="color: #2563eb;">Smart Shop Billing System</h2>
                <p>Hello <strong>{username}</strong>,</p>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="letter-spacing: 8px; color: #1d4ed8; font-size: 36px;">{otp_code}</h1>
                <p>This OTP is valid for <strong>10 minutes</strong>.</p>
                <p>Do not share this OTP with anyone.</p>
                <hr/>
                <small style="color: #6b7280;">Smart Shop Billing System</small>
            </div>
        """
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code not in [200, 201]:
        raise HTTPException(500, detail=f"Failed to send OTP email: {response.text}")


def verify_otp(body: VerifyOTPSchema, db: Session):
    now = datetime.now(timezone.utc)

    # ✅ Always use ENV email, not body.email
    owner_email = settings.SENDER_EMAIL

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == owner_email,
            OTPVerification.is_used == False
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(400, detail="No OTP found. Please request a new OTP.")

    if otp_record.expires_at < now:
        raise HTTPException(400, detail="OTP has expired. Please request a new OTP.")

    if otp_record.otp_code != body.otp_code:
        raise HTTPException(400, detail="Wrong OTP. Please try again.")

    otp_record.is_used = True

    owner = db.query(admin).first()
    if owner:
        owner.is_verified = True

    db.commit()

    return {"message": "Email verified successfully. You can now login."}


def admin_login(body: loginSchema, db: Session):
    owner = db.query(admin).filter(
        admin.username == body.username
    ).first()

    if not owner:
        raise HTTPException(400, detail="No user found with given username")

    if not verify_password(body.password, owner.password):
        raise HTTPException(401, detail="Incorrect password")

    if not owner.is_verified:
        raise HTTPException(403, detail="Email not verified. Please verify your email first.")

    token = create_access_token({
        "admin_id": owner.id,
        "username": owner.username
    })

    return {
        "token": token,
        "admin": {
            "id": owner.id,
            "username": owner.username,
            "email": owner.email
        }
    }