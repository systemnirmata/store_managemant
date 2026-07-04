from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
class createCategoriesSchema(BaseModel):
    cname : str
    description : str

class getCategoriesSchema(BaseModel):
    cid : int
    cname : str
    description : str
    created_at : datetime

class updateCategoriesSchema(BaseModel):
    cname : str
    description : str

class updteCategoriesResponseSchema(BaseModel):
    cid : int
    cname : str
    description : str
    created_at : datetime

class deleteCategoriesRespsonseSchema(BaseModel):
    cid : int