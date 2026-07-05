from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
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
LINE_COLOR = colors.HexColor("#e2e8f0")
LIGHT_GRAY = colors.HexColor("#f8fafc")
WHITE      = colors.white

def generate_bill_pdf(bill_data: dict, items: list) -> bytes:
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
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
        fontName="Helvetica-Bold", fontSize=16,
        textColor=BLACK, spaceAfter=2)
    store_sub_style = ParagraphStyle("ss",
        fontName="Helvetica", fontSize=8,
        textColor=colors.HexColor("#6B7280"), spaceAfter=1)
    inv_label_style = ParagraphStyle("il",
        fontName="Helvetica-Bold", fontSize=12,
        textColor=BLACK, alignment=2)
    inv_val_style = ParagraphStyle("iv",
        fontName="Helvetica", fontSize=8,
        textColor=BLACK, alignment=2, spaceAfter=1)

    store_lines = [Paragraph(STORE_NAME, store_name_style)]
    contact_bits = " | ".join(filter(None, [STORE_ADDRESS, STORE_PHONE, STORE_GSTIN]))
    if contact_bits:
        store_lines.append(Paragraph(contact_bits, store_sub_style))

    inv_cell = [
        Paragraph("INVOICE", inv_label_style),
        Paragraph(f"Invoice No : INV-{str(bill_data['bid']).zfill(4)}", inv_val_style),
        Paragraph(f"Date : {bill_data['created_at']}", inv_val_style),
    ]

    header_table = Table(
        [[store_lines, inv_cell]],
        colWidths=[110*mm, 75*mm]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW",     (0, 0), (-1, -1), 1, BLACK),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # ── CUSTOMER INFO ─────────────────────────────────────────
    pay_type = bill_data.get("payment_type", "Cash")

    label_style = ParagraphStyle("lbl",
        fontName="Helvetica-Bold", fontSize=8, textColor=BLACK)
    value_style = ParagraphStyle("val",
        fontName="Helvetica", fontSize=8, textColor=colors.black)
    badge_style = ParagraphStyle("badge",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=BLACK, alignment=1)

    badge_tbl = Table(
        [[Paragraph(pay_type.upper(), badge_style)]],
        colWidths=[32*mm]
    )
    badge_tbl.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 0.75, BLACK),
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
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,0), (-1,-1), 0.5, LINE_COLOR),
    ]))
    story.append(cust_table)
    story.append(Spacer(1, 4*mm))

    # ── ITEMS TABLE ───────────────────────────────────────────
    item_name_style = ParagraphStyle("iname",
        fontName="Helvetica", fontSize=8, textColor=colors.black)

    table_data = [[
        Paragraph("<b>Item Name</b>", ParagraphStyle("th",
            fontName="Helvetica-Bold", fontSize=8, textColor=BLACK)),
        Paragraph("<b>Qty</b>", ParagraphStyle("th2",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=BLACK, alignment=1)),
        Paragraph("<b>Rate</b>", ParagraphStyle("th3",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=BLACK, alignment=2)),
        Paragraph("<b>Amount</b>", ParagraphStyle("th4",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=BLACK, alignment=2)),
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
        ("LINEBELOW",      (0, 0), (-1, 0),  1, BLACK),
        ("TOPPADDING",     (0, 0), (-1, 0),  6),
        ("BOTTOMPADDING",  (0, 0), (-1, 0),  6),
        ("TOPPADDING",     (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING",  (0, 1), (-1, -1), 5),
        ("LEFTPADDING",    (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 4),
        ("LINEBELOW",      (0, 1), (-1, -1), 0.3, LINE_COLOR),
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
        fontName="Helvetica-Bold", fontSize=11, textColor=BLACK)
    grand_value = ParagraphStyle("gv",
        fontName="Helvetica-Bold", fontSize=11,
        textColor=BLACK, alignment=2)

    totals_table = Table([
        [Paragraph("Subtotal",    total_style_label),
         Paragraph(f"Rs. {bill_data['total_amount']}", total_style_value)],
        [Paragraph("GST (0%)",    total_style_label),
         Paragraph("Rs. 0.00",    total_style_value)],
        [Paragraph("Grand Total", grand_label),
         Paragraph(f"Rs. {bill_data['total_amount']}", grand_value)],
    ], colWidths=[100*mm, 85*mm])
    totals_table.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("LINEABOVE",     (0, 2), (-1, 2),  1, BLACK),
        ("LINEBELOW",     (0, 0), (-1, 1),  0.3, LINE_COLOR),
    ]))
    story.append(KeepTogether(totals_table))
    story.append(Spacer(1, 10*mm))

    # ── SIGNATURE + FOOTER ───────────────────────────────────
    sign_label = ParagraphStyle("sl",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=BLACK, alignment=1)

    sign_table = Table([
        [Paragraph("", sign_label), Paragraph("", sign_label)],
        [Paragraph("", sign_label), Paragraph("Authorised Signatory", sign_label)],
    ], colWidths=[140*mm, 45*mm])
    sign_table.setStyle(TableStyle([
        ("ALIGN",         (1,0), (1,-1), "CENTER"),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LINEABOVE",     (1,1), (1,1), 0.5, BLACK),
    ]))
    story.append(sign_table)
    story.append(Spacer(1, 6*mm))

    footer_style = ParagraphStyle("ft",
        fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#6B7280"), alignment=1)

    story.append(Paragraph("Thank You! Visit Again", footer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()