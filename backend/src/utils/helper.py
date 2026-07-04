from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session
import jwt
from src.utils.settings import settings
from src.admin.model import admin
from jwt import InvalidTokenError
from src.utils.db import get_db


def is_authenticated(request:Request, db:Session = Depends(get_db)):
        token = request.headers.get("authorization")
        print(token)
    #     if not token:
    #         raise HTTPException(401, detail="Unauthorizaed Entery: Token not founded")
    #     tokens = token.split(" ")[-1]
    #     data = jwt.decode(tokens, settings.SECRET_KEY, settings.ALGORITHM)
        
    #     _id = data.get("_id")
    #     exp = data.get("exp")
        
    #     user = db.query(admin).filter(admin.uid == _id).first()
        
    #     if not user:
    #         raise HTTPException(401, detail="Username is invalid") 
    #     if user.role != "admin":
    #         raise HTTPException(401, detail="this section is not allowed for user")
    #     return user

    # except InvalidTokenError:
    #     raise HTTPException(401, detail="unauthorized access")