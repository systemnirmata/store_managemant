from pydantic import BaseModel
from datetime import datetime
from pydantic import BaseModel, EmailStr
class RegisterSchema(BaseModel):
    username : str
    email : str
    password : str

class loginSchema(BaseModel):
    username : str
    password : str

class SendOTPSchema(BaseModel):    
    email: EmailStr

class VerifyOTPSchema(BaseModel): 
    email: EmailStr
    otp_code: str