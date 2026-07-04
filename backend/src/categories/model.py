
from src.utils.db import Base
from sqlalchemy import Column, String, Integer, TIMESTAMP, func,Boolean

class categories(Base):
    __tablename__ = "categories"
    cid         = Column(Integer, primary_key=True)
    cname       = Column(String)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at  = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )
