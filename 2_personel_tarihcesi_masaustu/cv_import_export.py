import pandas as pd
import sqlite3
import os
import math
import webbrowser

def split_name(ad_soyad):
    if not isinstance(ad_soyad, str):
        return "", ""
    parts = ad_soyad.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) > 1:
        soyisim = parts[-1]
        isim = " ".join(parts[:-1])
        return isim, soyisim
    return "", ""

def safe_str(val):
    if pd.isna(val):
        return ""
    if isinstance(val, float) and val.is_integer():
        return str(int(val))
    return str(val).strip()

def normalize_name(name_str):
    if pd.isna(name_str) or not isinstance(name_str, str): return ""
    name_str = name_str.strip().upper()
    name_str = name_str.replace('İ', 'I').replace('I', 'I')
    return " ".join(name_str.split())

def extract_form_table(df_ind, header_str, cols_to_extract, max_empty_rows=10):
    start_r = -1
    for r_idx, r in df_ind.iterrows():
        val = str(r.iloc[0]).strip() if pd.notna(r.iloc[0]) else ""
        if header_str.lower() in val.lower():
            start_r = r_idx
            break
            
    if start_r == -1: return ""
    
    results = []
    empty_streak = 0
    
    for i in range(start_r + 1, df_ind.shape[0]):
        val_0 = str(df_ind.iloc[i, 0]).strip()
        
        # Stop at next major header
        known_headers = ["YABANCI DİL", "EĞİTMENLİK", "UZMANLIK", "YÜRÜTTÜĞÜ", "BİLGİSAYAR", "BİRİM BAŞKANLIĞI", "AJANSTA", "AJANS ÖNCESİ"]
        is_header = any(h in val_0 for h in known_headers)
        sub_headers = ["İŞ YERİ ADI", "SINAV ADI", "SINAV YILI", "SINAV SONUCU", "BAŞLANGIÇ-BİTİŞ YILI", "BİRİMİ"]
        if is_header or (val_0.isupper() and len(val_0) > 10 and not val_0.startswith("CİSCO") and val_0 not in sub_headers):
            break
                
        row_str = []
        is_empty = True
        for col_idx in cols_to_extract:
            if col_idx < df_ind.shape[1]:
                val = str(df_ind.iloc[i, col_idx]).strip()
                if val and val != "nan" and val != "NaT" and val.lower() != "nan":
                    # Ignore sub-headers like "DİL", "SINAV ADI"
                    if val in ["DİL", "SINAV ADI", "SINAV YILI", "SINAV SONUCU", "İŞ YERİ ADI", "GÖREVİ", "BAŞLANGIÇ-BİTİŞ YILI", "Birimi", "Başlangış/Bitiş"]:
                        pass
                    else:
                        row_str.append(val)
                        is_empty = False
        
        if not is_empty:
            results.append(" - ".join(row_str))
            empty_streak = 0
        else:
            empty_streak += 1
            if empty_streak > max_empty_rows:
                break
                
    return "\n".join(results)

def import_cv_from_excel(excel_path, db_path):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Dosya bulunamadi: {excel_path}")
    
    xl = pd.ExcelFile(excel_path)
    df_general = xl.parse(xl.sheet_names[0])
    df_general.columns = [str(c).strip() for c in df_general.columns]
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    imported_count = 0
    updated_count = 0
    
    sheet_map = {normalize_name(sn): sn for sn in xl.sheet_names}
    
    def make_searchable(text):
        if not isinstance(text, str): return ""
        text = text.upper()
        replacements = {'İ':'I', 'I':'I', 'Ş':'S', 'Ğ':'G', 'Ü':'U', 'Ö':'O', 'Ç':'C', 'Â':'A', 'Î':'I', '\u0307':''}
        for k, v in replacements.items():
            text = text.replace(k, v)
        return " ".join(text.split())

    cursor.execute("SELECT id, isim, soyisim FROM Personel")
    existing_personel = cursor.fetchall()

    for index, row in df_general.iterrows():
        ad_soyad = row.get('Adı Soyadı', None)
        if pd.isna(ad_soyad) or not str(ad_soyad).strip():
            continue
            
        isim, soyisim = split_name(str(ad_soyad).title())
        searchable_excel = make_searchable(str(ad_soyad))
        
        personel_id = None
        
        for pid, p_isim, p_soyisim in existing_personel:
            db_searchable = make_searchable(f"{p_isim} {p_soyisim}")
            if searchable_excel == db_searchable:
                personel_id = pid
                break
                
        if not personel_id:
            best_match_id = None
            max_len = 0
            for pid, p_isim, p_soyisim in existing_personel:
                db_searchable = make_searchable(f"{p_isim} {p_soyisim}")
                if len(db_searchable) > 5 and len(searchable_excel) > 5:
                    if searchable_excel.startswith(db_searchable) or db_searchable.startswith(searchable_excel):
                        if len(db_searchable) > max_len:
                            best_match_id = pid
                            max_len = len(db_searchable)
            if best_match_id:
                personel_id = best_match_id
                
        if not personel_id:
            cursor.execute("INSERT INTO Personel (isim, soyisim) VALUES (?, ?)", (isim, soyisim))
            personel_id = cursor.lastrowid
            existing_personel.append((personel_id, isim, soyisim))
            
        tc_kimlik_no = safe_str(row.get('TC Kimlik No', ''))
        unvan = safe_str(row.get('Unvan', ''))
        iban = safe_str(row.get('(*) İban', ''))
        dogum_tarihi = safe_str(row.get('Doğum Tarihi', ''))
        dogum_yeri = safe_str(row.get('Doğum Yeri', ''))
        nufusa_kayitli_il = safe_str(row.get('Nüfusa Kayıtlı İl', ''))
        sicil_no = safe_str(row.get('Ajans Sicil No', ''))
        sigorta_baslangic = safe_str(row.get('İlk Sigorta Başlangıç Tarihi', ''))
        basvuru_turu = safe_str(row.get('Ajans Başlangıç Başvuru Türü', ''))
        emeklilik_tarihi = safe_str(row.get('Emekilik Hak Ettiği/Edeceği Tarih', ''))
        medeni_durum = safe_str(row.get('Medeni Durum', ''))
        eposta = safe_str(row.get('E-posta', ''))
        askerlik_durumu = safe_str(row.get('Askerlik Durumu', ''))
        telefon = safe_str(row.get('Cep Telefonu', ''))
        kan_grubu = safe_str(row.get('Kan Grubu', ''))
        ehliyet = safe_str(row.get('Ehliyet Sınıfı', ''))
        sendika = safe_str(row.get('Ajans Sendika Üyeliği', ''))
        adres = safe_str(row.get('Adres', ''))
        
        c_sayisi_raw = row.get('Çocuk Sayısı', 0)
        try:
            if hasattr(c_sayisi_raw, 'day'):
                cocuk_sayisi = c_sayisi_raw.day
            else:
                cocuk_sayisi = int(float(c_sayisi_raw)) if not pd.isna(c_sayisi_raw) else 0
        except:
            cocuk_sayisi = 0

        def get_valid_date_raw(val):
            if hasattr(val, 'year') and val.year < 1920:
                from datetime import datetime
                import pandas as pd
                excel_epoch = datetime(1899, 12, 30)
                try:
                    if isinstance(val, pd.Timestamp):
                        val_dt = val.to_pydatetime()
                    else:
                        val_dt = val
                    val = (val_dt - excel_epoch).days
                except:
                    pass
                    
            val_str = safe_str(val)
            if val_str.endswith('.0'):
                val_str = val_str[:-2]
                
            if "nan" in val_str.lower() or "nat" in val_str.lower() or "eşin" in val_str.lower() or "görev" in val_str.lower():
                return ""
            return val_str

        def get_valid_date(key):
            return get_valid_date_raw(row.get(key, ''))
            
        cocuk_1_dogum = get_valid_date('1.Çocuk Doğum Tarihi')
        cocuk_2_dogum = get_valid_date('2.Çocuk Doğum Tarihi')
        cocuk_3_dogum = get_valid_date('3.Çocuk Doğum Tarihi')
        cocuk_4_dogum = get_valid_date('4.Çocuk Doğum Tarihi')
        acil_kisi = safe_str(row.get('Acil Durumda Aranacak Kişi', ''))
        acil_telefon = safe_str(row.get('Acil Dumuda Aranacak Telefon Numarası', ''))
        if not acil_telefon:
            acil_telefon = safe_str(row.get('Acil Durumda Aranacak Telefon Numarası', ''))

        ogrenim_durumu = ""
        ilkokul = ""
        ortaokul = ""
        lise = ""
        on_lisans = ""
        lisans = ""
        yuksek_lisans = ""
        doktora = ""
        bolum = ""
        baslangic_bitis_yili = ""
        dil = ""
        sinav_sonucu = ""
        egitmenlik_sertifikasi = ""
        uzmanlik_alanlari = ""
        yuruttugu_projeler = ""
        birim_baskanliklari = ""
        ajansta_gorevleri = ""
        ajans_oncesi_deneyim = ""

        norm_name = normalize_name(ad_soyad)
        if norm_name in sheet_map:
            ind_sheet_name = sheet_map[norm_name]
            df_ind = xl.parse(ind_sheet_name, header=None)
            
            for r_idx, r in df_ind.iterrows():
                val0 = str(r.iloc[0]).strip().lower() if pd.notna(r.iloc[0]) else ""
                
                if val0 == "ilkokul" or val0 == "i̇lkokul":
                    v = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    if v != "nan" and v != "NaT": ilkokul = v
                elif "1. çocuk" in val0 or "1.çocuk" in val0:
                    v = get_valid_date_raw(r.iloc[2] if pd.notna(r.iloc[2]) else "")
                    if v and not cocuk_1_dogum: cocuk_1_dogum = v
                elif "2. çocuk" in val0 or "2.çocuk" in val0:
                    v = get_valid_date_raw(r.iloc[2] if pd.notna(r.iloc[2]) else "")
                    if v and not cocuk_2_dogum: cocuk_2_dogum = v
                elif "3. çocuk" in val0 or "3.çocuk" in val0:
                    v = get_valid_date_raw(r.iloc[2] if pd.notna(r.iloc[2]) else "")
                    if v and not cocuk_3_dogum: cocuk_3_dogum = v
                elif "4. çocuk" in val0 or "4.çocuk" in val0:
                    v = get_valid_date_raw(r.iloc[2] if pd.notna(r.iloc[2]) else "")
                    if v and not cocuk_4_dogum: cocuk_4_dogum = v
                elif val0 == "ortaokul":
                    v = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    if v != "nan" and v != "NaT": ortaokul = v
                elif val0 == "lise":
                    v = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    if v != "nan" and v != "NaT": lise = v
                elif val0 == "ön lisans" or val0 == "ön li̇sans":
                    v_okul = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    v_bolum = str(r.iloc[4]).strip() if pd.notna(r.iloc[4]) else ""
                    v_tarih = str(r.iloc[6]).strip() if pd.notna(r.iloc[6]) else ""
                    if v_okul != "nan" and v_okul != "":
                        val_str = f"{v_okul} / {v_bolum} ({v_tarih})"
                        on_lisans = val_str if not on_lisans else on_lisans + "\n" + val_str
                elif val0 == "lisans" or val0 == "li̇sans":
                    v_okul = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    v_bolum = str(r.iloc[4]).strip() if pd.notna(r.iloc[4]) else ""
                    v_tarih = str(r.iloc[6]).strip() if pd.notna(r.iloc[6]) else ""
                    if v_okul != "nan" and v_okul != "":
                        val_str = f"{v_okul} / {v_bolum} ({v_tarih})"
                        lisans = val_str if not lisans else lisans + "\n" + val_str
                elif val0 == "yüksek lisans" or val0 == "yüksek li̇sans":
                    v_okul = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    v_bolum = str(r.iloc[4]).strip() if pd.notna(r.iloc[4]) else ""
                    v_tarih = str(r.iloc[6]).strip() if pd.notna(r.iloc[6]) else ""
                    if v_okul != "nan" and v_okul != "":
                        val_str = f"{v_okul} / {v_bolum} ({v_tarih})"
                        yuksek_lisans = val_str if not yuksek_lisans else yuksek_lisans + "\n" + val_str
                elif val0 == "doktora":
                    v_okul = str(r.iloc[2]).strip() if pd.notna(r.iloc[2]) else ""
                    v_bolum = str(r.iloc[4]).strip() if pd.notna(r.iloc[4]) else ""
                    v_tarih = str(r.iloc[6]).strip() if pd.notna(r.iloc[6]) else ""
                    if v_okul != "nan" and v_okul != "":
                        val_str = f"{v_okul} / {v_bolum} ({v_tarih})"
                        doktora = val_str if not doktora else doktora + "\n" + val_str
            
            dil = extract_form_table(df_ind, "YABANCI DİL BİLGİSİ", [0, 3, 5, 6], max_empty_rows=10)
            egitmenlik_sertifikasi = extract_form_table(df_ind, "EĞİTMENLİK SERTİFİKALARI", [0], max_empty_rows=10)
            uzmanlik_alanlari = extract_form_table(df_ind, "UZMANLIK ALANLARI", [0], max_empty_rows=10)
            yuruttugu_projeler = extract_form_table(df_ind, "YÜRÜTTÜĞÜ ÖNEMLİ PROJELER", [0], max_empty_rows=10)
            birim_baskanliklari = extract_form_table(df_ind, "BİRİM BAŞKANLIĞI", [0, 6], max_empty_rows=10)
            ajansta_gorevleri = extract_form_table(df_ind, "AJANSTA GÖREV ALDIĞI", [2, 6], max_empty_rows=10)
            ajans_oncesi_deneyim = extract_form_table(df_ind, "AJANS ÖNCESİ İŞ DENEYİMLERİ", [0, 4, 6], max_empty_rows=10)

        cursor.execute("SELECT id FROM Personel_Ozgecmis WHERE personel_id=?", (personel_id,))
        cv_res = cursor.fetchone()
        
        if cv_res:
            # Update
            cursor.execute('''
                UPDATE Personel_Ozgecmis SET 
                tc_kimlik_no=?, unvan=?, iban=?, dogum_tarihi=?, dogum_yeri=?, nufusa_kayitli_il=?, 
                sicil_no=?, sigorta_baslangic=?, basvuru_turu=?, emeklilik_tarihi=?, medeni_durum=?, 
                eposta=?, askerlik_durumu=?, telefon=?, kan_grubu=?, ehliyet=?, sendika=?, adres=?, 
                cocuk_sayisi=?, cocuk_1_dogum=?, cocuk_2_dogum=?, cocuk_3_dogum=?, cocuk_4_dogum=?, 
                ogrenim_durumu=?, ilkokul=?, ortaokul=?, lise=?, on_lisans=?, lisans=?, yuksek_lisans=?, 
                doktora=?, bolum=?, baslangic_bitis_yili=?, dil=?, sinav_sonucu=?, egitmenlik_sertifikasi=?, 
                uzmanlik_alanlari=?, yuruttugu_projeler=?, birim_baskanliklari=?, ajansta_gorevleri=?, 
                ajans_oncesi_deneyim=?, acil_kisi=?, acil_telefon=?
                WHERE personel_id=?
            ''', (tc_kimlik_no, unvan, iban, dogum_tarihi, dogum_yeri, nufusa_kayitli_il, sicil_no, 
                  sigorta_baslangic, basvuru_turu, emeklilik_tarihi, medeni_durum, eposta, askerlik_durumu, 
                  telefon, kan_grubu, ehliyet, sendika, adres, cocuk_sayisi, cocuk_1_dogum, cocuk_2_dogum, 
                  cocuk_3_dogum, cocuk_4_dogum, ogrenim_durumu, ilkokul, ortaokul, lise, on_lisans, lisans, 
                  yuksek_lisans, doktora, bolum, baslangic_bitis_yili, dil, sinav_sonucu, egitmenlik_sertifikasi, 
                  uzmanlik_alanlari, yuruttugu_projeler, birim_baskanliklari, ajansta_gorevleri, ajans_oncesi_deneyim, 
                  acil_kisi, acil_telefon, personel_id))
            updated_count += 1
        else:
            # Insert
            cursor.execute('''
                INSERT INTO Personel_Ozgecmis (
                    personel_id, tc_kimlik_no, unvan, iban, dogum_tarihi, dogum_yeri, nufusa_kayitli_il, 
                    sicil_no, sigorta_baslangic, basvuru_turu, emeklilik_tarihi, medeni_durum, eposta, 
                    askerlik_durumu, telefon, kan_grubu, ehliyet, sendika, adres, cocuk_sayisi, 
                    cocuk_1_dogum, cocuk_2_dogum, cocuk_3_dogum, cocuk_4_dogum, ogrenim_durumu, ilkokul, 
                    ortaokul, lise, on_lisans, lisans, yuksek_lisans, doktora, bolum, baslangic_bitis_yili, 
                    dil, sinav_sonucu, egitmenlik_sertifikasi, uzmanlik_alanlari, yuruttugu_projeler, 
                    birim_baskanliklari, ajansta_gorevleri, ajans_oncesi_deneyim, acil_kisi, acil_telefon
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (personel_id, tc_kimlik_no, unvan, iban, dogum_tarihi, dogum_yeri, nufusa_kayitli_il, 
                  sicil_no, sigorta_baslangic, basvuru_turu, emeklilik_tarihi, medeni_durum, eposta, 
                  askerlik_durumu, telefon, kan_grubu, ehliyet, sendika, adres, cocuk_sayisi, cocuk_1_dogum, 
                  cocuk_2_dogum, cocuk_3_dogum, cocuk_4_dogum, ogrenim_durumu, ilkokul, ortaokul, lise, 
                  on_lisans, lisans, yuksek_lisans, doktora, bolum, baslangic_bitis_yili, dil, sinav_sonucu, 
                  egitmenlik_sertifikasi, uzmanlik_alanlari, yuruttugu_projeler, birim_baskanliklari, 
                  ajansta_gorevleri, ajans_oncesi_deneyim, acil_kisi, acil_telefon))
            imported_count += 1
            
    conn.commit()
    conn.close()
    return imported_count, updated_count

def generate_cv_html_pdf(personel_ids, db_path, output_html):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    html_content = """
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <title>Personel Bilgi Formu</title>
        <style>
            @media print {
                @page { margin: 15mm; size: A4; }
                body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .page-break { page-break-after: always; }
            }
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 10px;
                background-color: white;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10pt;
                margin-bottom: 20px;
            }
            th, td {
                border: 1px solid black;
                padding: 5px;
            }
            .section-header {
                background-color: #2f75b5;
                color: white;
                font-weight: bold;
                text-align: left;
            }
            .label {
                background-color: #d9e1f2;
                font-weight: bold;
                width: 30%;
            }
            .value {
                width: 70%;
            }
            .photo-box {
                width: 120px;
                height: 150px;
                border: 1px solid black;
                text-align: center;
                vertical-align: middle;
                color: #888;
                font-size: 10pt;
            }
        </style>
    </head>
    <body onload="window.print()">
    """
    
    for i, pid in enumerate(personel_ids):
        # Fetch data
        cursor.execute('''
            SELECT p.isim, p.soyisim, cv.* 
            FROM Personel p
            LEFT JOIN Personel_Ozgecmis cv ON p.id = cv.personel_id
            WHERE p.id = ?
        ''', (pid,))
        
        row = cursor.fetchone()
        if not row: continue
        
        isim, soyisim = row[0], row[1]
        ad_soyad = f"{isim} {soyisim}"
        
        cv = row[2:] if row[2] is not None else [None]*45 
        # offset 2 is id, 3 is personel_id, 4 is tc_kimlik_no...
        # Let's fetch as dict for easier access
        cursor.execute('PRAGMA table_info(Personel_Ozgecmis)')
        cols = cursor.fetchall()
        col_names = [c[1] for c in cols]
        
        cv_data = {}
        if row[2] is not None:
            for idx, col in enumerate(col_names):
                val = cv[idx] if cv[idx] else ""
                if isinstance(val, str):
                    val = val.replace('\n', '<br>')
                cv_data[col] = val
        else:
            for col in col_names:
                cv_data[col] = ""
                
        # Start Page
        html_content += f"""
        <div class="{'page-break' if i < len(personel_ids)-1 else ''}">
            <table>
                <tr>
                    <th colspan="2" class="section-header" style="text-align: center; font-size: 14pt;">PERSONEL BİLGİ FORMU</th>
                </tr>
                <tr>
                    <th colspan="2" class="section-header">GENEL BİLGİLER</th>
                </tr>
                <tr>
                    <td class="label">Adı Soyadı</td>
                    <td class="value">{isim} {soyisim}</td>
                </tr>
                <tr>
                    <td class="label">Unvan</td>
                    <td class="value">{cv_data.get('unvan', '')}</td>
                </tr>
                <tr>
                    <td class="label">TC Kimlik No</td>
                    <td class="value">{cv_data.get('tc_kimlik_no', '')}</td>
                </tr>
                <tr>
                    <td class="label">Doğum Tarihi</td>
                    <td class="value">{cv_data.get('dogum_tarihi', '')}</td>
                </tr>
                <tr>
                    <td class="label">Doğum Yeri</td>
                    <td class="value">{cv_data.get('dogum_yeri', '')}</td>
                </tr>
                <tr>
                    <td class="label">Nüfusa Kayıtlı İl</td>
                    <td class="value">{cv_data.get('nufusa_kayitli_il', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ajans Sicil No</td>
                    <td class="value">{cv_data.get('sicil_no', '')}</td>
                </tr>
                <tr>
                    <td class="label">İlk Sigorta Başlangıç Tarihi</td>
                    <td class="value">{cv_data.get('sigorta_baslangic', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ajans Başlangıç Başvuru Türü</td>
                    <td class="value">{cv_data.get('basvuru_turu', '')}</td>
                </tr>
                <tr>
                    <td class="label">Emeklilik Hak Ettiği/Edeceği Tarih</td>
                    <td class="value">{cv_data.get('emeklilik_tarihi', '')}</td>
                </tr>
                <tr>
                    <td class="label">Adres</td>
                    <td class="value">{cv_data.get('adres', '')}</td>
                </tr>
                
                <tr>
                    <th colspan="2" class="section-header">AİLE BİLGİLERİ</th>
                </tr>
                <tr>
                    <td class="label">Medeni Durum</td>
                    <td class="value">{cv_data.get('medeni_durum', '')}</td>
                </tr>
                <tr>
                    <td class="label">Çocuk Sayısı</td>
                    <td class="value">{cv_data.get('cocuk_sayisi', '')}</td>
                </tr>
                <tr>
                    <td class="label">1.Çocuk Doğum Tarihi</td>
                    <td class="value">{cv_data.get('cocuk_1_dogum', '')}</td>
                </tr>
                <tr>
                    <td class="label">2.Çocuk Doğum Tarihi</td>
                    <td class="value">{cv_data.get('cocuk_2_dogum', '')}</td>
                </tr>
                <tr>
                    <td class="label">3.Çocuk Doğum Tarihi</td>
                    <td class="value">{cv_data.get('cocuk_3_dogum', '')}</td>
                </tr>
                <tr>
                    <td class="label">4.Çocuk Doğum Tarihi</td>
                    <td class="value">{cv_data.get('cocuk_4_dogum', '')}</td>
                </tr>
                <tr>
                    <td class="label">Acil Durumda Aranacak Kişi</td>
                    <td class="value">{cv_data.get('acil_kisi', '')}</td>
                </tr>
                <tr>
                    <td class="label">Acil Durumda Aranacak Telefon Numarası</td>
                    <td class="value">{cv_data.get('acil_telefon', '')}</td>
                </tr>
                
                <tr>
                    <th colspan="2" class="section-header">İLETİŞİM BİLGİLERİ</th>
                </tr>
                <tr>
                    <td class="label">E-posta</td>
                    <td class="value">{cv_data.get('eposta', '')}</td>
                </tr>
                <tr>
                    <td class="label">Cep Telefonu</td>
                    <td class="value">{cv_data.get('telefon', '')}</td>
                </tr>
                
                <tr>
                    <th colspan="2" class="section-header">DİĞER BİLGİLER</th>
                </tr>
                <tr>
                    <td class="label">Askerlik Durumu</td>
                    <td class="value">{cv_data.get('askerlik_durumu', '')}</td>
                </tr>
                <tr>
                    <td class="label">Kan Grubu</td>
                    <td class="value">{cv_data.get('kan_grubu', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ehliyet Sınıfı</td>
                    <td class="value">{cv_data.get('ehliyet', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ajans Sendika Üyeliği</td>
                    <td class="value">{cv_data.get('sendika', '')}</td>
                </tr>
                <tr>
                    <td class="label">(*) İban</td>
                    <td class="value">{cv_data.get('iban', '')}</td>
                </tr>
                
                <tr>
                    <th colspan="2" class="section-header">EĞİTİM VE UZMANLIK BİLGİLERİ</th>
                </tr>
                <tr>
                    <td class="label">Öğrenim Durumu</td>
                    <td class="value">{cv_data.get('ogrenim_durumu', '')}</td>
                </tr>
                <tr>
                    <td class="label">İlkokul</td>
                    <td class="value">{cv_data.get('ilkokul', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ortaokul</td>
                    <td class="value">{cv_data.get('ortaokul', '')}</td>
                </tr>
                <tr>
                    <td class="label">Lise</td>
                    <td class="value">{cv_data.get('lise', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ön Lisans</td>
                    <td class="value">{cv_data.get('on_lisans', '')}</td>
                </tr>
                <tr>
                    <td class="label">Lisans</td>
                    <td class="value">{cv_data.get('lisans', '')}</td>
                </tr>
                <tr>
                    <td class="label">Yüksek Lisans</td>
                    <td class="value">{cv_data.get('yuksek_lisans', '')}</td>
                </tr>
                <tr>
                    <td class="label">Doktora</td>
                    <td class="value">{cv_data.get('doktora', '')}</td>
                </tr>
                <tr>
                    <td class="label">Dil</td>
                    <td class="value">{cv_data.get('dil', '')}</td>
                </tr>
                <tr>
                    <td class="label">Sınav Sonucu</td>
                    <td class="value">{cv_data.get('sinav_sonucu', '')}</td>
                </tr>
                <tr>
                    <td class="label">Eğitmenlik Sertifikaları</td>
                    <td class="value">{cv_data.get('egitmenlik_sertifikasi', '')}</td>
                </tr>
                
                <tr>
                    <th colspan="2" class="section-header">DENEYİM VE KARİYER BİLGİLERİ</th>
                </tr>
                <tr>
                    <td class="label">Uzmanlık Alanları</td>
                    <td class="value">{cv_data.get('uzmanlik_alanlari', '')}</td>
                </tr>
                <tr>
                    <td class="label">Yürüttüğü Önemli Projeler</td>
                    <td class="value">{cv_data.get('yuruttugu_projeler', '')}</td>
                </tr>
                <tr>
                    <td class="label">Birim Başkanlığı Yaptıysa Eğer Başkanlık Yaptığı Birimler ve Tarihleri</td>
                    <td class="value">{cv_data.get('birim_baskanliklari', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ajansta Görev Aldığı Birimler</td>
                    <td class="value">{cv_data.get('ajansta_gorevleri', '')}</td>
                </tr>
                <tr>
                    <td class="label">Ajans Öncesi İş Deneyimleri</td>
                    <td class="value">{cv_data.get('ajans_oncesi_deneyim', '')}</td>
                </tr>
            </table>
        </div>
        """
        
    html_content += """
    </body>
    </html>
    """
    
    conn.close()
    
    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    webbrowser.open(f"file://{os.path.abspath(output_html)}")
