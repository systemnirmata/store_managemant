from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, Image
)
from reportlab.platypus.flowables import KeepTogether
import os
import io  # ← key change

STORE_NAME    = "GANGADHAR PROVISION STORE"
STORE_ADDRESS = """1, Ravikunj Flat, Arunodaya Soc.,

B.M.C. Gas Supply Road, Alkapuri,

Vadodara - 7"""
STORE_PHONE   = "Mobile: 95860 52965"
STORE_GSTIN   = "GSTIN: 24ADHPP9881D1Z9"
LOGO_PATH     = "static/logo.png"

DARK_BLUE  = colors.HexColor("#1e3a5f")
GOLD       = colors.HexColor("#b8860b")
LIGHT_GRAY = colors.HexColor("#f8fafc")
GREEN      = colors.HexColor("#15803d")
LINE_COLOR = colors.HexColor("#e2e8f0")
WHITE      = colors.white

def generate_bill_pdf(bill_data: dict, items: list) -> bytes:  # ← returns bytes now
    buffer = io.BytesIO()  # ← memory buffer, no file saved

    doc = SimpleDocTemplate(
        buffer,            # ← buffer instead of filename
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=12 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── HEADER ───────────────────────────────────────────────
    store_name_style = ParagraphStyle("sn",
        fontName="Helvetica-Bold", fontSize=15,
        textColor=WHITE, spaceAfter=2)
    store_sub_style = ParagraphStyle("ss",
        fontName="Helvetica", fontSize=8,
        textColor=colors.HexColor("#93c5fd"), spaceAfter=1)
    inv_label_style = ParagraphStyle("il",
        fontName="Helvetica-Bold", fontSize=12,
        textColor=GOLD, alignment=2)
    inv_val_style = ParagraphStyle("iv",
        fontName="Helvetica", fontSize=8,
        textColor=WHITE, alignment=2, spaceAfter=1)

    logo_cell = ""
    if os.path.exists(LOGO_PATH):
        try:
            logo_cell = Image(LOGO_PATH, width=22*mm, height=22*mm)
        except Exception:
            logo_cell = Paragraph("", styles["Normal"])

    store_cell = [
        Paragraph(STORE_NAME, store_name_style),
        Paragraph(STORE_ADDRESS, store_sub_style),
        Paragraph(f"{STORE_PHONE}   |   {STORE_GSTIN}", store_sub_style),
    ]
    inv_cell = [
        Paragraph("INVOICE", inv_label_style),
        Paragraph(f"Invoice No : INV-{str(bill_data['bid']).zfill(4)}", inv_val_style),
        Paragraph(f"Date : {bill_data['created_at']}", inv_val_style),
    ]

    header_table = Table(
        [[logo_cell, store_cell, inv_cell]],
        colWidths=[26*mm, 110*mm, 49*mm]
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), DARK_BLUE),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # ── CUSTOMER INFO ─────────────────────────────────────────
    pay_type    = bill_data.get("payment_type", "Cash")
    badge_color = GREEN if pay_type == "Cash" else GOLD

    label_style = ParagraphStyle("lbl",
        fontName="Helvetica-Bold", fontSize=8, textColor=DARK_BLUE)
    value_style = ParagraphStyle("val",
        fontName="Helvetica", fontSize=8, textColor=colors.black)
    badge_style = ParagraphStyle("badge",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=WHITE, alignment=1)

    badge_tbl = Table(
        [[Paragraph(pay_type.upper(), badge_style)]],
        colWidths=[32*mm]
    )
    badge_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), badge_color),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))

    cust_table = Table([
        [
            Paragraph("Customer Name :", label_style),
            Paragraph(bill_data.get("cname", ""), value_style),
            Paragraph("Phone :", label_style),
            Paragraph(bill_data.get("phone", ""), value_style),
            badge_tbl
        ]
    ], colWidths=[32*mm, 55*mm, 18*mm, 40*mm, 34*mm])
    cust_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), LIGHT_GRAY),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 4*mm))

    # ── ITEMS TABLE ───────────────────────────────────────────
    item_name_style = ParagraphStyle("iname",
        fontName="Helvetica", fontSize=8, textColor=colors.black)

    table_data = [[
        Paragraph("<b>Item Name</b>", ParagraphStyle("th",
            fontName="Helvetica-Bold", fontSize=8, textColor=WHITE)),
        Paragraph("<b>Qty</b>", ParagraphStyle("th2",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=WHITE, alignment=1)),
        Paragraph("<b>Rate</b>", ParagraphStyle("th3",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=WHITE, alignment=2)),
        Paragraph("<b>Amount</b>", ParagraphStyle("th4",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=WHITE, alignment=2)),
    ]]

    for idx, item in enumerate(items):
        table_data.append([
            Paragraph(item["product_name"], item_name_style),
            Paragraph(str(item["quantity"]),
                ParagraphStyle("q", fontName="Helvetica", fontSize=8, alignment=1)),
            Paragraph(f"Rs.{item['unit_price']}",
                ParagraphStyle("r", fontName="Helvetica", fontSize=8, alignment=2)),
            Paragraph(f"Rs.{item['subtotal']}",
                ParagraphStyle("a", fontName="Helvetica-Bold", fontSize=8, alignment=2)),
        ])

    items_table = Table(
        table_data,
        colWidths=[100*mm, 20*mm, 30*mm, 35*mm],
        repeatRows=1
    )
    items_table.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0),  DARK_BLUE),
        ("TOPPADDING",     (0, 0), (-1, 0),  6),
        ("BOTTOMPADDING",  (0, 0), (-1, 0),  6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("TOPPADDING",     (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING",  (0, 1), (-1, -1), 5),
        ("LEFTPADDING",    (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 4),
        ("LINEBELOW",      (0, 0), (-1, -1), 0.3, LINE_COLOR),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4*mm))

    # ── TOTALS ────────────────────────────────────────────────
    total_style_label = ParagraphStyle("tl",
        fontName="Helvetica", fontSize=9, textColor=colors.black)
    total_style_value = ParagraphStyle("tv",
        fontName="Helvetica", fontSize=9,
        textColor=colors.black, alignment=2)
    grand_label = ParagraphStyle("gl",
        fontName="Helvetica-Bold", fontSize=11, textColor=WHITE)
    grand_value = ParagraphStyle("gv",
        fontName="Helvetica-Bold", fontSize=11,
        textColor=WHITE, alignment=2)

    totals_table = Table([
        [Paragraph("Subtotal",    total_style_label),
         Paragraph(f"Rs. {bill_data['total_amount']}", total_style_value)],
        [Paragraph("GST (0%)",    total_style_label),
         Paragraph("Rs. 0.00",    total_style_value)],
        [Paragraph("Grand Total", grand_label),
         Paragraph(f"Rs. {bill_data['total_amount']}", grand_value)],
    ], colWidths=[100*mm, 85*mm])
    totals_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 1), LIGHT_GRAY),
        ("BACKGROUND",    (0, 2), (-1, 2), DARK_BLUE),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("LINEABOVE",     (0, 2), (-1, 2),  1.5, GREEN),
        ("LINEBELOW",     (0, 0), (-1, 1),  0.3, LINE_COLOR),
    ]))
    story.append(KeepTogether(totals_table))
    story.append(Spacer(1, 6*mm))

# ── SIGNATURE + FOOTER ───────────────────────────────────
    SIGN_PATH = "static/sign.png"

    sign_style = ParagraphStyle("ss",
        fontName="Helvetica", fontSize=8,
        textColor=colors.black, alignment=1)
    sign_label = ParagraphStyle("sl",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=DARK_BLUE, alignment=1)

    # Build signature cell
    if os.path.exists(SIGN_PATH):
        try:
            sign_img = Image(SIGN_PATH, width=35*mm, height=18*mm)
        except Exception:
            sign_img = Paragraph("", sign_style)
    else:
        sign_img = Paragraph("", sign_style)

    sign_table = Table([
        [Paragraph("", sign_style),
         sign_img],
        [Paragraph("", sign_style),
         Paragraph("Authorised Signatory", sign_label)],
    ], colWidths=[140*mm, 45*mm])
    sign_table.setStyle(TableStyle([
        ("ALIGN",         (1,0), (1,-1), "CENTER"),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LINEABOVE",     (1,1), (1,1), 0.5, DARK_BLUE),
    ]))
    story.append(Spacer(1, 4*mm))
    story.append(sign_table)
    story.append(Spacer(1, 4*mm))

    footer_style = ParagraphStyle("ft",
        fontName="Helvetica-Bold", fontSize=10,
        textColor=WHITE, alignment=1)

    footer_table = Table([
        [Paragraph("Thank You! Visit Again", footer_style)],
    ], colWidths=[185*mm])
    footer_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), DARK_BLUE),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(KeepTogether(footer_table))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()