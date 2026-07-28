import os
import sqlite3
import base64
import webbrowser

def generate_pdf_html(db_path, yil, ay, output_html):
    if not os.path.exists(db_path):
        raise FileNotFoundError("Veritabanı bulunamadı.")
        
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        SELECT P.isim || ' ' || P.soyisim AS ad_soyad, G.unvan, G.birim 
        FROM Gorev G 
        JOIN Personel P ON G.personel_id = P.id 
        WHERE G.yil = ? AND G.ay = ?
        ORDER BY 
            CASE 
                WHEN G.birim LIKE '%ARŞİV%' THEN 2
                WHEN G.birim LIKE '%KOMİSYON%' THEN 1 
                ELSE 0 
            END,
            G.birim, P.isim
    ''', (yil, ay))
    rows = c.fetchall()
    conn.close()

    # Eğer o dönemde hiç kayıt yoksa bile boş bir sayfa çıksın veya hata versin.
    if not rows:
        raise ValueError(f"{yil} Yılı {ay}. Ayı için veri bulunamadı!")

    # Verileri Birimlere göre grupla
    birimler = {}
    for ad_soyad, unvan, birim in rows:
        if birim not in birimler:
            birimler[birim] = []
        birimler[birim].append((ad_soyad, unvan))

    import locale
    try:
        locale.setlocale(locale.LC_COLLATE, 'turkish')
    except:
        pass
        
    def tr_sort_key(b):
        b_upper = b.upper()
        if "ARŞİV" in b_upper:
            return (2, locale.strxfrm(b))
        elif "KOMİSYON" in b_upper:
            return (1, locale.strxfrm(b))
        return (0, locale.strxfrm(b))

    sorted_birimler = {}
    for birim in sorted(birimler.keys(), key=tr_sort_key):
        sorted_birimler[birim] = sorted(birimler[birim], key=lambda x: locale.strxfrm(x[0]))
        
    # Aylar sözlüğü
    aylar_tr = {
        1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan", 
        5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos", 
        9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
    }
    ay_adi = aylar_tr.get(int(ay), str(ay))
    
    # Logo
    logo_b64 = ""
    logo_path = os.path.join(os.path.dirname(db_path), "logo_0_5.png")
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            logo_b64 = base64.b64encode(f.read()).decode("utf-8")

    logo_img_tag = f'<img src="data:image/png;base64,{logo_b64}" alt="Logo">' if logo_b64 else ""

    html = f"""
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <title>Çalışma Birimleri Tablosu</title>
        <style>
            @media print {{
                @page {{ margin: 15mm; size: A4; }}
                body {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
                /* Hide anything else, just print table */
            }}
            body {{
                font-family: Calibri, Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: white;
            }}
            .header-container {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }}
            .header-container img {{
                height: 50px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                font-size: 11pt;
            }}
            th, td {{
                border: 1px solid black;
                padding: 4px 8px;
                text-align: left;
            }}
            .main-title {{
                text-align: center;
                font-weight: bold;
                background-color: #f2f2f2;
                font-size: 12pt;
            }}
            .col-headers {{
                font-weight: bold;
                background-color: #ffffff;
            }}
            .group-header {{
                background-color: #d9d9d9;
                font-weight: bold;
            }}
        </style>
    </head>
    <body onload="window.print()">
        <div class="header-container">
            {logo_img_tag}
        </div>
        
        <table>
            <tr>
                <td colspan="2" class="main-title">
                    ORTA ANADOLU KALKINMA AJANSI<br>
                    ÇALIŞMA BİRİMLERİ TABLOSU ({ay_adi} {yil})
                </td>
            </tr>
            <tr class="col-headers">
                <td style="width: 50%;">ADI SOYADI</td>
                <td style="width: 50%;">ÜNVANI</td>
            </tr>
    """

    for birim, personeller in sorted_birimler.items():
        html += f"""
            <tr class="group-header">
                <td colspan="2">{birim}</td>
            </tr>
        """
        for p in personeller:
            html += f"""
            <tr>
                <td>{p[0]}</td>
                <td>{p[1]}</td>
            </tr>
            """

    html += """
        </table>
    </body>
    </html>
    """

    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html)
        
    webbrowser.open(f"file://{os.path.abspath(output_html)}")
