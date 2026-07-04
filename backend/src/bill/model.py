from src.utils.db import Base
from sqlalchemy import Column, Integer, String, TIMESTAMP, func, ForeignKey, DECIMAL

class bill(Base):
    __tablename__ = "bill"
    bid          = Column(Integer, primary_key=True)
    cid          = Column(Integer, ForeignKey("customer.cid"), nullable=False)
    total_amount = Column(DECIMAL(10, 2), server_default="0")
    payment_type = Column(String, default="Cash")
    created_at   = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )

class bill_items(Base):
    __tablename__ = "bill_items"
    biid       = Column(Integer, primary_key=True)
    bid        = Column(Integer, ForeignKey("bill.bid"), nullable=False)
    pid        = Column(Integer, ForeignKey("products.pid"), nullable=False)
    quantity   = Column(Integer)
    unit_price = Column(DECIMAL(10, 2))
    subtotal   = Column(DECIMAL(10, 2))
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )