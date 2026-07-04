from sqlalchemy import Column, Integer, String, TIMESTAMP, func,Boolean

from src.utils.db import Base

class admin(Base):
    __tablename__ = "admin"
    id = Column(Integer, primary_key=True)
    username = Column(String)
    email = Column(String)
    password = Column(String)
    is_verified = Column(Boolean, default=False) 
    created_at = Column(
        TIMESTAMP(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )
    
class OTPVerification(Base):                
    __tablename__ = "otp_verifications"
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())    