from src.history.model import payment_history
from src.bill.model import bill, bill_items
from src.products.model import products
from src.customer.model import customer
from sqlalchemy.orm import Session

def save_month_to_history(cid: int, month_key: str, db: Session):
    year, month = month_key.split("-")
    from sqlalchemy import extract

    # get customer
    cust = db.query(customer).filter(customer.cid == cid).first()
    if not cust:
        return

    # get all monthly bills for this month
    month_bills = db.query(bill).filter(
        bill.cid == cid,
        bill.payment_type == "Monthly Account",
        extract("year",  bill.created_at) == int(year),
        extract("month", bill.created_at) == int(month)
    ).all()

    from datetime import date
    month_label = date(int(year), int(month), 1).strftime("%B %Y")

    for b in month_bills:
        items = (
            db.query(bill_items, products.product_name)
            .join(products, products.pid == bill_items.pid)
            .filter(bill_items.bid == b.bid)
            .all()
        )
        for item, product_name in items:
            # check if already saved
            existing = db.query(payment_history).filter(
                payment_history.bid == b.bid,
                payment_history.product_name == product_name
            ).first()
            if not existing:
                db.add(payment_history(
                    cid=cid,
                    cname=cust.cname,
                    cphone=cust.cphone,
                    bid=b.bid,
                    product_name=product_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal,
                    bill_total=b.total_amount,
                    month_key=month_key,
                    month_label=month_label
                ))
    db.commit()

def get_all_history(db: Session):
    # get unique customers who have history
    rows = db.query(payment_history).all()
    customers_map = {}
    for row in rows:
        if row.cid not in customers_map:
            customers_map[row.cid] = {
                "cid": row.cid,
                "cname": row.cname,
                "cphone": row.cphone
            }
    return list(customers_map.values())

def get_customer_history(cid: int, db: Session):
    rows = db.query(payment_history).filter(
        payment_history.cid == cid
    ).order_by(payment_history.month_key.desc(), payment_history.bid).all()

    grouped = {}
    for row in rows:
        key = row.month_key
        if key not in grouped:
            grouped[key] = {
                "month_key": key,
                "month_label": row.month_label,
                "bills": {},
                "month_total": 0
            }
        bid = row.bid
        if bid not in grouped[key]["bills"]:
            grouped[key]["bills"][bid] = {
                "bid": bid,
                "bill_total": float(row.bill_total),
                "created_at": row.created_at,
                "items": []
            }
            grouped[key]["month_total"] += float(row.bill_total)
        grouped[key]["bills"][bid]["items"].append({
            "product_name": row.product_name,
            "quantity": row.quantity,
            "unit_price": float(row.unit_price),
            "subtotal": float(row.subtotal)
        })

    # convert bills dict to list
    result = []
    for key in sorted(grouped.keys(), reverse=True):
        g = grouped[key]
        result.append({
            "month_key": g["month_key"],
            "month_label": g["month_label"],
            "month_total": g["month_total"],
            "bills": list(g["bills"].values())
        })
    return result