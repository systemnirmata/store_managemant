from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle,
    Paragraph, Spacer
)
from reportlab.platypus.flowables import KeepTogether
import io

STORE_NAME    = "SYSTEM NIRMATA"
STORE_ADDRESS = ""   # fill in when available
STORE_PHONE   = ""   # fill in when available
STORE_GSTIN   = ""   # fill in when available (leave blank if not GST registered)

BLACK      = colors.black
RED        = colors.HexColor("#dc2626")
LINE_COLOR = colors.HexColor("#e2e8f0")
LIGHT_GRAY = colors.HexColor("#f8fafc")
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
            fontSize=16, textColor=BLACK, spaceAfter=2)
    ss  = ParagraphStyle("ss", fontName="Helvetica",
            fontSize=8, textColor=colors.HexColor("#6B7280"), spaceAfter=1)
    il  = ParagraphStyle("il", fontName="Helvetica-Bold",
            fontSize=11, textColor=BLACK, alignment=2)
    iv  = ParagraphStyle("iv", fontName="Helvetica",
            fontSize=8, textColor=BLACK, alignment=2, spaceAfter=1)

    store_lines = [Paragraph(STORE_NAME, sn)]
    contact_bits = " | ".join(filter(None, [STORE_ADDRESS, STORE_PHONE, STORE_GSTIN]))
    if contact_bits:
        store_lines.append(Paragraph(contact_bits, ss))

    header_table = Table([[
        store_lines,
        [Paragraph("MONTHLY STATEMENT", il),
         Paragraph(f"Generated : {data['generated_date']}", iv),
         Paragraph(f"Total Bills : {data['total_bills']}", iv)]
    ]], colWidths=[110*mm, 75*mm])
    header_table.setStyle(TableStyle([
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LINEBELOW",     (0,0), (-1,-1), 1, BLACK),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # ── CUSTOMER INFO ─────────────────────────────────────────
    lbl = ParagraphStyle("lbl", fontName="Helvetica-Bold",
            fontSize=8, textColor=BLACK)
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
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,0), (-1,-1), 0.5, LINE_COLOR),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 4*mm))

    # ── ITEMS TABLE ───────────────────────────────────────────
    th = lambda txt, align=0: Paragraph(
        f"<b>{txt}</b>",
        ParagraphStyle("th", fontName="Helvetica-Bold",
            fontSize=8, textColor=BLACK, alignment=align))

    table_data = [[th("Item Name"), th("Qty",1), th("Rate",2), th("Amount",2)]]

    for item in data["all_items"]:
        if item.get("is_header"):
            table_data.append([
                Paragraph(f"<b>{item['product_name']}</b>",
                    ParagraphStyle("bh", fontName="Helvetica-Bold",
                        fontSize=8, textColor=BLACK)),
                "", "", ""
            ])
        elif item.get("is_total"):
            table_data.append([
                Paragraph(f"<b>{item['product_name']}</b>",
                    ParagraphStyle("bt", fontName="Helvetica-Bold",
                        fontSize=8, textColor=BLACK)),
                "", "",
                Paragraph(f"<b>Rs.{item['subtotal']}</b>",
                    ParagraphStyle("bta", fontName="Helvetica-Bold",
                        fontSize=8, textColor=BLACK, alignment=2))
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

    # build row styles — plain white/black, no colored bands
    row_styles = [
        ("LINEBELOW",     (0,0), (-1,0),  1, BLACK),
        ("TOPPADDING",    (0,0), (-1,0),  6),
        ("BOTTOMPADDING", (0,0), (-1,0),  6),
        ("LEFTPADDING",   (0,0), (-1,-1), 4),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,1), (-1,-1), 0.3, LINE_COLOR),
    ]
    for i, item in enumerate(data["all_items"], start=1):
        if item.get("is_header"):
            row_styles.append(("SPAN",       (0,i), (-1,i)))
            row_styles.append(("TOPPADDING", (0,i), (-1,i), 8))
            row_styles.append(("BOTTOMPADDING",(0,i),(-1,i),3))
        elif item.get("is_total"):
            row_styles.append(("LINEABOVE",  (0,i), (-1,i), 0.75, BLACK))
            row_styles.append(("TOPPADDING", (0,i), (-1,i), 5))
            row_styles.append(("BOTTOMPADDING",(0,i),(-1,i),5))
        else:
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
    gl = ParagraphStyle("gl", fontName="Helvetica-Bold", fontSize=11, textColor=BLACK)
    gv = ParagraphStyle("gv", fontName="Helvetica-Bold", fontSize=11,
            textColor=BLACK, alignment=2)
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
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("LINEABOVE",     (0,3), (-1,3),  1, RED),
        ("LINEABOVE",     (0,4), (-1,4),  1, BLACK),
        ("LINEBELOW",     (0,0), (-1,3),  0.3, LINE_COLOR),
    ]))
    story.append(KeepTogether(summary))

    # ── SIGNATURE ────────────────────────────────────────────
    sign_label = ParagraphStyle("sl",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=BLACK, alignment=1)
    sign_style = ParagraphStyle("ss",
        fontName="Helvetica", fontSize=8,
        textColor=colors.black, alignment=1)

    sign_table = Table([
        [Paragraph("", sign_style), Paragraph("", sign_style)],
        [Paragraph("", sign_style), Paragraph("Authorised Signatory", sign_label)],
    ], colWidths=[140*mm, 45*mm])
    sign_table.setStyle(TableStyle([
        ("ALIGN",         (1,0), (1,-1), "CENTER"),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LINEABOVE",     (1,1), (1,1), 0.5, BLACK),
    ]))
    story.append(Spacer(1, 8*mm))
    story.append(sign_table)
    story.append(Spacer(1, 6*mm))

    # ── FOOTER ────────────────────────────────────────────────
    footer_style = ParagraphStyle("ft",
        fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#6B7280"), alignment=1)

    story.append(Paragraph("Thank You! Visit Again", footer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()