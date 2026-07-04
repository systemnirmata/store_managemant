from fastapi import APIRouter, Depends
from src.utils.db import get_db
from sqlalchemy.orm import Session
from src.history import controller
from src.utils.auth import get_current_admin


history_route = APIRouter(prefix="/history", tags=["history"])

@history_route.get("/get_all")
def get_all_history(db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_all_history(db)

@history_route.get("/get_customer/{cid}")
def get_customer_history(cid: int, db: Session = Depends(get_db), _: any = Depends(get_current_admin)):
    return controller.get_customer_history(cid, db)