from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer, Image
)
from reportlab.platypus.flowables import KeepTogether
import os, io

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
RED        = colors.HexColor("#dc2626")
BLUE_LIGHT = colors.HexColor("#eff6ff")
LINE_COLOR = colors.HexColor("#e2e8f0")
WHITE      = colors.white

def generate_monthly_statement_pdf(data: dict) -> bytes:
    buffer = io.BytesIO()
    c      = data["customer"]
    styles_normal = ParagraphStyle("n", fontName="Helvetica", fontSize=8)

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=12*mm, bottomMargin=20*mm
    )
    story = []

    # ── HEADER ────────────────────────────────────────────────
    sn  = ParagraphStyle("sn", fontName="Helvetica-Bold",
            fontSize=15, textColor=WHITE, spaceAfter=2)
    ss  = ParagraphStyle("ss", fontName="Helvetica",
            fontSize=8, textColor=colors.HexColor("#93c5fd"), spaceAfter=1)
    il  = ParagraphStyle("il", fontName="Helvetica-Bold",
            fontSize=11, textColor=GOLD, alignment=2)
    iv  = ParagraphStyle("iv", fontName="Helvetica",
            fontSize=8, textColor=WHITE, alignment=2, spaceAfter=1)

    logo_cell = ""
    if os.path.exists(LOGO_PATH):
        try: logo_cell = Image(LOGO_PATH, width=22*mm, height=22*mm)
        except: pass

    header_table = Table([[
        logo_cell,
        [Paragraph(STORE_NAME, sn),
         Paragraph(STORE_ADDRESS, ss),
         Paragraph(f"{STORE_PHONE}   |   {STORE_GSTIN}", ss)],
        [Paragraph("MONTHLY STATEMENT", il),
         Paragraph(f"Generated : {data['generated_date']}", iv),
         Paragraph(f"Total Bills : {data['total_bills']}", iv)]
    ]], colWidths=[26*mm, 110*mm, 49*mm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), DARK_BLUE),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # ── CUSTOMER INFO ─────────────────────────────────────────
    lbl = ParagraphStyle("lbl", fontName="Helvetica-Bold",
            fontSize=8, textColor=DARK_BLUE)
    val = ParagraphStyle("val", fontName="Helvetica",
            fontSize=8, textColor=colors.black)

    cust_table = Table([[
        Paragraph("Customer :", lbl),
        Paragraph(c["cname"], val),
        Paragraph("Phone :", lbl),
        Paragraph(c["cphone"], val),
        Paragraph("Email :", lbl),
        Paragraph(c.get("cmail","") or "-", val),
    ]], colWidths=[22*mm, 45*mm, 16*mm, 38*mm, 16*mm, 48*mm])
    cust_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), LIGHT_GRAY),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 4*mm))

    # ── ITEMS TABLE ───────────────────────────────────────────
    th = lambda txt, align=0: Paragraph(
        f"<b>{txt}</b>",
        ParagraphStyle("th", fontName="Helvetica-Bold",
            fontSize=8, textColor=WHITE, alignment=align))

    table_data = [[th("Item Name"), th("Qty",1), th("Rate",2), th("Amount",2)]]

    for item in data["all_items"]:
        if item.get("is_header"):
            table_data.append([
                Paragraph(f"<b>{item['product_name']}</b>",
                    ParagraphStyle("bh", fontName="Helvetica-Bold",
                        fontSize=8, textColor=DARK_BLUE)),
                "", "", ""
            ])
        elif item.get("is_total"):
            table_data.append([
                Paragraph(f"<b>{item['product_name']}</b>",
                    ParagraphStyle("bt", fontName="Helvetica-Bold",
                        fontSize=8, textColor=GREEN)),
                "", "",
                Paragraph(f"<b>Rs.{item['subtotal']}</b>",
                    ParagraphStyle("bta", fontName="Helvetica-Bold",
                        fontSize=8, textColor=GREEN, alignment=2))
            ])
        else:
            table_data.append([
                Paragraph(item["product_name"],
                    ParagraphStyle("n", fontName="Helvetica", fontSize=8)),
                Paragraph(str(item["quantity"]),
                    ParagraphStyle("q", fontName="Helvetica",
                        fontSize=8, alignment=1)),
                Paragraph(f"Rs.{item['unit_price']}",
                    ParagraphStyle("r", fontName="Helvetica",
                        fontSize=8, alignment=2)),
                Paragraph(f"Rs.{item['subtotal']}",
                    ParagraphStyle("a", fontName="Helvetica",
                        fontSize=8, alignment=2)),
            ])

    # build row backgrounds
    row_styles = [
        ("BACKGROUND",    (0,0), (-1,0),  DARK_BLUE),
        ("TOPPADDING",    (0,0), (-1,0),  6),
        ("BOTTOMPADDING", (0,0), (-1,0),  6),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,0), (-1,-1), 0.3, LINE_COLOR),
    ]
    for i, item in enumerate(data["all_items"], start=1):
        if item.get("is_header"):
            row_styles.append(("BACKGROUND", (0,i), (-1,i), BLUE_LIGHT))
            row_styles.append(("SPAN",       (0,i), (-1,i)))
            row_styles.append(("TOPPADDING", (0,i), (-1,i), 5))
            row_styles.append(("BOTTOMPADDING",(0,i),(-1,i),5))
        elif item.get("is_total"):
            row_styles.append(("BACKGROUND", (0,i), (-1,i),
                                colors.HexColor("#f0fdf4")))
            row_styles.append(("TOPPADDING", (0,i), (-1,i), 5))
            row_styles.append(("BOTTOMPADDING",(0,i),(-1,i),5))
        else:
            bg = WHITE if i % 2 == 0 else LIGHT_GRAY
            row_styles.append(("BACKGROUND",    (0,i), (-1,i), bg))
            row_styles.append(("TOPPADDING",    (0,i), (-1,i), 4))
            row_styles.append(("BOTTOMPADDING", (0,i), (-1,i), 4))

    items_table = Table(
        table_data,
        colWidths=[100*mm, 20*mm, 30*mm, 35*mm],
        repeatRows=1
    )
    items_table.setStyle(TableStyle(row_styles))
    story.append(items_table)
    story.append(Spacer(1, 4*mm))

    # ── SUMMARY BOX ───────────────────────────────────────────
    tl = ParagraphStyle("tl", fontName="Helvetica",   fontSize=9)
    tv = ParagraphStyle("tv", fontName="Helvetica",   fontSize=9, alignment=2)
    gl = ParagraphStyle("gl", fontName="Helvetica-Bold", fontSize=11, textColor=WHITE)
    gv = ParagraphStyle("gv", fontName="Helvetica-Bold", fontSize=11,
            textColor=WHITE, alignment=2)
    rl = ParagraphStyle("rl", fontName="Helvetica-Bold", fontSize=10,
            textColor=RED)
    rv = ParagraphStyle("rv", fontName="Helvetica-Bold", fontSize=10,
            textColor=RED, alignment=2)

    summary = Table([
        [Paragraph("Total Bills",    tl),
         Paragraph(str(data["total_bills"]), tv)],
        [Paragraph("Grand Total",    tl),
         Paragraph(f"Rs. {data['grand_total']}", tv)],
        [Paragraph("Amount Paid",    tl),
         Paragraph(f"Rs. {c['last_paid_amount']}", tv)],
        [Paragraph("Balance Due",    rl),
         Paragraph(f"Rs. {c['currently_due_amount']}", rv)],
        [Paragraph("Please clear your dues at the earliest.", gl),
         Paragraph("Thank You!", gv)],
    ], colWidths=[100*mm, 85*mm])
    summary.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,3),  LIGHT_GRAY),
        ("BACKGROUND",    (0,4), (-1,4),  DARK_BLUE),
        ("BACKGROUND",    (0,3), (-1,3),  colors.HexColor("#fef2f2")),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("LINEABOVE",     (0,3), (-1,3),  1, RED),
        ("LINEABOVE",     (0,4), (-1,4),  1.5, GREEN),
        ("LINEBELOW",     (0,0), (-1,3),  0.3, LINE_COLOR),
    ]))
    story.append(KeepTogether(summary))
    # ── SIGNATURE ────────────────────────────────────────────
    SIGN_PATH = "static/sign.png"

    sign_style = ParagraphStyle("ss",
        fontName="Helvetica", fontSize=8,
        textColor=colors.black, alignment=1)
    sign_label = ParagraphStyle("sl",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=DARK_BLUE, alignment=1)

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

    # ── FOOTER ────────────────────────────────────────────────
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

  