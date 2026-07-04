from fastapi import HTTPException, UploadFile, Response
from sqlalchemy.orm import Session
from src.products.model import products
from src.products.dtos import createProductSchema, updateProductSchema
from src.categories.model import categories

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024  # 2MB


def serialize_product(p: products) -> dict:
    return {
        "pid": p.pid,
        "cid": p.cid,
        "product_name": p.product_name,
        "unit": p.unit,
        "price": p.price,
        "is_active": p.is_active,
        "created_at": p.created_at,
        "image_url": f"/products/image/{p.pid}" if p.image else None,
    }


def create_product(body: createProductSchema, db: Session):
    # Check category exists — remove is_active check
    cat = db.query(categories).filter(
        categories.cid == body.cid
    ).first()

    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check existing product
    existing = db.query(products).filter(
        products.product_name == body.product_name,
        products.cid == body.cid, products.is_active == True
    ).first()

    if existing:
        if existing.is_active == False:
            # Reactivate
            existing.is_active = True
            existing.unit  = body.unit
            existing.price = body.price
            db.commit()
            db.refresh(existing)
            return {
                "message": "Product reactivated successfully",
                "product_id": existing.pid
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Product already exists in this category"
            )

    # Create new
    new_product = products(
        product_name=body.product_name,
        cid=body.cid,
        unit=body.unit,
        price=body.price,
        is_active=True
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return {
        "message": "Product created successfully",
        "product_id": new_product.pid
    }


def get_all_products(db: Session):
    items = db.query(products).filter(products.is_active == True).all()
    return [serialize_product(p) for p in items]


def get_products_by_category(cid: int, db: Session):
    cat = db.query(categories).filter(categories.cid == cid).first()
    if not cat:
        raise HTTPException(404, detail="Category not found")
    items = db.query(products).filter(
        products.cid == cid,
        products.is_active == True
    ).all()
    return [serialize_product(p) for p in items]


def update_product(pid: int, body: updateProductSchema, db: Session):
    product = db.query(products).filter(products.pid == pid).first()
    if not product:
        raise HTTPException(404, detail="Product not found")

    if body.product_name is not None:
        product.product_name = body.product_name
    if body.cid is not None:
        product.cid = body.cid
    if body.unit is not None:
        product.unit = body.unit
    if body.price is not None:
        product.price = body.price

    db.commit()
    db.refresh(product)
    return serialize_product(product)


def delete_product(pid: int, db: Session):
    product = db.query(products).filter(products.pid == pid).first()
    if not product:
        raise HTTPException(404, detail="Product not found")
    product.is_active = False
    db.commit()
    return product


async def upload_product_image(pid: int, file: UploadFile, db: Session):
    product = db.query(products).filter(products.pid == pid).first()
    if not product:
        raise HTTPException(404, detail="Product not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, detail="Only JPG, PNG, or WEBP images are allowed")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(400, detail="Image must be smaller than 2MB")

    product.image = image_bytes
    product.image_type = file.content_type
    db.commit()
    return {"message": "Image uploaded successfully", "pid": product.pid}


def get_product_image(pid: int, db: Session):
    product = db.query(products).filter(products.pid == pid).first()
    if not product or not product.image:
        raise HTTPException(404, detail="Image not found")
    return Response(content=product.image, media_type=product.image_type or "image/jpeg")


def delete_product_image(pid: int, db: Session):
    product = db.query(products).filter(products.pid == pid).first()
    if not product:
        raise HTTPException(404, detail="Product not found")
    product.image = None
    product.image_type = None
    db.commit()
    return {"message": "Image removed", "pid": product.pid}