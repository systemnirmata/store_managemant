from src.utils.db import Base
from sqlalchemy import Column,String, Integer, TIMESTAMP, func

class customer(Base):
    __tablename__ = "customer"
    cid = Column(Integer, primary_key=True)
    cname = Column(String)
    cphone = Column(String)
    cmail = Column(String)
    currently_due_amount = Column(Integer, default=0)
    last_paid_amount = Column(Integer, default=0)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )