from src.utils.db import Base
from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, func

class payment_history(Base):
    __tablename__ = "payment_history"
    hid          = Column(Integer, primary_key=True)
    cid          = Column(Integer, nullable=False)
    cname        = Column(String, nullable=False)
    cphone       = Column(String, nullable=False)
    bid          = Column(Integer, nullable=False)
    product_name = Column(String, nullable=False)
    quantity     = Column(Integer, nullable=False)
    unit_price   = Column(DECIMAL(10, 2), nullable=False)
    subtotal     = Column(DECIMAL(10, 2), nullable=False)
    bill_total   = Column(DECIMAL(10, 2), nullable=False)
    month_key    = Column(String, nullable=False)  # "2026-06"
    month_label  = Column(String, nullable=False)  # "June 2026"
    created_at   = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )