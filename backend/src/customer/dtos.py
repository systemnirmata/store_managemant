from pydantic import BaseModel
from datetime import datetime

class createCustomerSchema(BaseModel):
    cname : str
    cphone : str 
    cmail : str
    currently_due_amount : int
    last_paid_amount : int

class customerResponseScema(BaseModel):
    cid : int
    cname : str
    cphone : str
    cmail : str
    currently_due_amount : int
    last_paid_amount : int
    created_at : datetime