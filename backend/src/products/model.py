from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, Boolean, ForeignKey, LargeBinary, func

from src.utils.db import Base

class products(Base):
    __tablename__ = "products"

    pid = Column(Integer, primary_key=True)
    cid = Column(Integer, ForeignKey("categories.cid"), nullable=False)

    product_name = Column(String(150), nullable=False)
    unit = Column(String(50))
    price = Column(DECIMAL(10, 2), nullable=False)

    image = Column(LargeBinary, nullable=True)
    image_type = Column(String(50), nullable=True) 

    is_active = Column(Boolean, default=True)

    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )