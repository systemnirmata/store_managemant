from src.categories.model import categories
from sqlalchemy.orm import Session
from fastapi import HTTPException

def get_categories(db: Session):
    return db.query(categories).filter(categories.is_active == True).all() 

def create_category(body, db: Session):
    existing = db.query(categories).filter(
        categories.cname == body.cname
    ).first()
    if existing:
        raise HTTPException(400, detail="Category already exists")
    new_cat = categories(
        cname=body.cname,
        description=body.description
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat


def delete_category(cid: int, db: Session):
    cat = db.query(categories).filter(
        categories.cid == cid,
        categories.is_active == True  # ✅ can't delete already deleted
    ).first()
    if not cat:
        raise HTTPException(404, detail="Category not found")
    cat.is_active = False
    db.commit()
    db.refresh(cat)
    return cat  # ✅ return object not dict
