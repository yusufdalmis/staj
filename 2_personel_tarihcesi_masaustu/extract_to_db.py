import os
import sqlite3
import pdfplumber
import difflib
import re

DB_PATH = r"d:\stajv2\2024_03\personel_veritabani.sqlite"
FOLDER_PATH = r"d:\stajv2\2024_03"

KNOWN_UNITS = [
    "PLANLAMA PROGRAMLAMA VE KOORDİNASYON",
    "ARAŞTIRMA PLANLAMA VE KOORDİNASYON",
    "PROGRAM YÖNETİM",
    "İZLEME VE DEĞERLENDİRME",
    "PROJE VE İŞ GELİŞTİRME",
    "TANITIM İLETİŞİM VE İŞ GELİŞTİRME",
    "KURUMSAL YÖNETİM",
    "KAYSERİ YATIRIM DESTEK",
    "SİVAS YATIRIM DESTEK",
    "YOZGAT YATIRIM DESTEK",
    "İÇ DENETİM",
    "HUKUK MÜŞAVİRLİĞİ",
    "GENEL SEKRETERLİK",
    "KIRSAL KALKINMA VE TURİZM",
    "İMALAT SANAYİDE DÖNÜŞÜM",
    "KURUMSAL YÖNETİM KOORDİNASYON VE TANITIM",
    "PLANLAMA VE SOSYAL KALKINMA",
    "PROGRAM YÖNETİM VE SANAYİDE DÖNÜŞÜM",
    "PROJE UYGULAMA",
    "KIRSAL VE SOSYAL KALKINMA",
    "TURİZM İMKANLARININ GELİŞTİRİLMESİ",
    "KOORDİNASYON VE TANITIM FAALİYETLERİ",
    # Komisyonlar
    "DİSİPLİN KOMİSYONU", "ETİK KOMİSYONU", "İÇ KONTROL KOMİSYONU", 
    "STRATEJİK PLANLAMA KOMİSYONU", "ADAY PERSONEL KOMİSYONU", 
    "AJANS BASIN YAYIN VE TANITIM KOMİSYONU", "AJANS BİRİM ARŞİV SORUMLULARI",
    "TEKNİK DESTEK KOMİSYONU", "FİZİBİLİTE DESTEĞİ DEĞERLENDİRME KOMİSYONU",
    "ZEYİLNAME KOMİSYONU", "GÜDÜMLÜ PROJE DEĞERLENDİRME KOMİSYONU",
    "BAĞIMSIZ DEĞERLENDİRİCİ SEÇME KOMİSYONU"
]

KNOWN_TITLES = [
    "BİRİM BAŞKANI", "BAŞKAN", "UZMAN", "KOORDİNATÖR VEKİLİ", "KOORDİNATÖR", "DESTEK PERSONELİ", 
    "İÇ DENETÇİ", "HUKUK MÜŞAVİRİ", "GENEL SEKRETER VEKİLİ", "GENEL SEKRETER", 
    "YÖNETİCİ ASİSTANI", "MUHASEBE YETKİLİSİ", "GÜVENLİK GÖREVLİSİ", 
    "TEMİZLİK GÖREVLİSİ", "BÜRO PERSONELİ", "HALKLA İLİŞKİLER VE TANITIM PERSONELİ",
    "TEMİZLİK VE ÇAY OCAĞI GÖREVLİSİ", "DANIŞMA HİZMETLERİ GÖREVLİSİ",
    "BİLGİ İŞLEM YETKİLİSİ", "SATIN ALMA SORUMLUSU", "SATINALMA VE İDARİ İŞLER SORUMLUSU", "SATINALMA VE İDARİ İŞLER", "SANTRAL HİZMETLERİ GÖREVLİSİ",
    "İLETİŞİM VE HALKLA İLİŞKİLER", "İNSAN KAYNAKLARI", "KURUMSAL İLETİŞİM",
    # Komisyon Unvanları
    "ASİL", "YEDEK", "ARŞİV SORUMLUSU"
]

def split_name(ad_soyad):
    if not ad_soyad:
        return "", ""
    parts = ad_soyad.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) > 1:
        soyisim = parts[-1]
        isim = " ".join(parts[:-1])
        return isim, soyisim
    return "", ""

def init_db(db_path):
    if os.path.exists(db_path):
        try: os.remove(db_path)
        except: pass
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE Personel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            isim TEXT,
            soyisim TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE Gorev (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            personel_id INTEGER,
            dosya_adi TEXT,
            yil INTEGER,
            ay INTEGER,
            unvan TEXT,
            birim TEXT,
            is_komisyon BOOLEAN,
            FOREIGN KEY(personel_id) REFERENCES Personel(id)
        )
    ''')
    conn.commit()
    return conn

def extract_year_month(filename):
    match = re.search(r"(\d{4})_(\d{2})", filename)
    if match:
        return int(match.group(1)), int(match.group(2))
    return None, None

def tr_upper(text):
    if not text: return text
    return text.replace("i", "İ").replace("ı", "I").replace("ş", "Ş").replace("ğ", "Ğ").replace("ç", "Ç").replace("ö", "Ö").replace("ü", "Ü").upper()

def clean_for_unit(text):
    return ''.join(c for c in text if c.isalpha() or c.isspace()).strip()

def match_unit(line):
    clean = tr_upper(clean_for_unit(line))
    if not clean or len(clean) < 5: return None
    clean_short = clean.replace("BİRİMİ", "").replace("OFİSİ", "").replace("BAŞKANLIĞI", "").strip()
    
    for u in KNOWN_UNITS:
        if u in clean or u in clean_short:
            return u
    matches = difflib.get_close_matches(clean_short, KNOWN_UNITS, n=1, cutoff=0.7)
    if matches: return matches[0]
    return None

def match_title(line):
    clean = tr_upper(line)
    found_titles = []
    for t in KNOWN_TITLES:
        if t in clean:
            found_titles.append((clean.find(t), -len(t), t))
    if found_titles:
        found_titles.sort()
        return found_titles[0][2]
    return None

def parse_pdf_smart(filepath, filename, yil, ay, cursor):
    try:
        with pdfplumber.open(filepath) as pdf:
            has_tables = False
            for page in pdf.pages:
                if page.extract_tables():
                    has_tables = True
                    break
            
            if not has_tables:
                print(f"[ATLANDI] {filename} dosyasi tablo icermedigi icin atlandi.")
                return

            current_unit = "Birimden Bağımsız"
            inserted_count = 0
            
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line: continue
                    
                    unit = match_unit(line)
                    title = match_title(line)
                    
                    if unit and title and len(line) > 50 and ("atanmasına" in line.lower() or "görevlendirilmiştir" in line.lower()):
                        pass
                    
                    elif title and len(line) < 150:
                        idx = tr_upper(line).find(title)
                        name_part = line[:idx].strip()
                        name_part = ''.join(c for c in name_part if c.isalpha() or c.isspace()).strip()
                        
                        if len(name_part) < 3:
                            name_part = line[idx+len(title):].strip()
                            name_part = ''.join(c for c in name_part if c.isalpha() or c.isspace()).strip()
                            
                        # CLEANUP NAME_PART
                        name_upper = tr_upper(name_part)
                        
                        # 1. Remove any known unit substrings
                        for u in KNOWN_UNITS:
                            if u in name_upper:
                                u_idx = name_upper.find(u)
                                name_part = name_part[:u_idx].strip()
                                name_upper = tr_upper(name_part)
                                break
                                
                        # 2. Remove trailing common words
                        words_to_remove = ["BİRİM", "BİRİMİ", "BİRİMİNE", "BİRİMİNDE", "BİRİMLERİ", "BAŞKANLIĞI", "OFİSİ", "AJANS", "KOORDİNASYON", "SOP", "KAPSAMINDA", "YENİDEN", "YAPILANDIRILMASI"]
                        parts = name_part.split()
                        while parts and tr_upper(parts[-1]) in words_to_remove:
                            parts.pop()
                        name_part = " ".join(parts)
                        
                        if len(name_part) > 3 and tr_upper(name_part) != "ADI SOYADI":
                            exact_title = line[idx:].strip()
                            final_name = name_part.title()
                            
                            # İsim düzeltmeleri (Typo ve Çift Kayıtları Engellemek İçin)
                            NAME_CORRECTIONS = {
                                "Ayşe Behiye Gonca Özkaya": "Behiye Ayşe Gonca Özkaya",
                                "Erdinç Çanakci": "Erdinç Çanakçi",
                                "Erdinç Çanakci̇": "Erdinç Çanakçi",
                                "Fatih Yaprak": "Mehmet Fatih Yaprak",
                                "M Fatih Yaprak": "Mehmet Fatih Yaprak",
                                "Kadir Altinok": "Kadir Altunok",
                                "Kadi̇r Alti̇nok": "Kadir Altunok",
                                "Behiye Ayşe Gonca Özkaya Akırrşsiavl Skoarlukmınmlusau V E Turizm": "Behiye Ayşe Gonca Özkaya",
                                "Behiye Ayşe Gonca Özkaya Akırrşsiavl Skoarlukımnmlusau V E Turizm": "Behiye Ayşe Gonca Özkaya",
                                "Burcu Eroğlu": "Burcu Ünal",
                                "Emel Emür": "Emel Demi̇rel",
                                "Figen Baykurt": "Figen Kizilaslan",
                                "Gonca Özkaya": "Behiye Ayşe Gonca Özkaya",
                                "Gözde Altunbaca": "Gözde Demi̇r",
                                "Halil Andiç İdari İşler Evrak Ve": "Halil Andiç",
                                "Hatice Bayraktar": "Hatice Kuyuoğlu",
                                "Hatice Kuyuoğlu Yildirim": "Hatice Kuyuoğlu",
                                "Memiş Sezen": "Doğu Sezen",
                                "Nazlı Yeni̇ay": "Nazlı Aydin",
                                "Zehra Balta": "Zehra Güngören",
                                "Şerife Özsaraç Bayer": "Şerife Özsaraç"
                            }
                            
                            for wrong_name, correct_name in NAME_CORRECTIONS.items():
                                if final_name == wrong_name or final_name == wrong_name.title():
                                    final_name = correct_name
                                    break
                                    
                            isim, soyisim = split_name(final_name)
                            
                            cursor.execute("SELECT id FROM Personel WHERE isim=? AND soyisim=?", (isim, soyisim))
                            row = cursor.fetchone()
                            if row:
                                personel_id = row[0]
                            else:
                                cursor.execute("INSERT INTO Personel (isim, soyisim) VALUES (?, ?)", (isim, soyisim))
                                personel_id = cursor.lastrowid
                                
                            komisyon_keywords = ['KOMİSYON', 'KOMİTE', 'KURUL', 'SORUMLULARI']
                            is_komisyon = any(k in current_unit.upper() for k in komisyon_keywords)
                            
                            cursor.execute('''
                                INSERT INTO Gorev (personel_id, dosya_adi, yil, ay, unvan, birim, is_komisyon)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            ''', (personel_id, filename, yil, ay, exact_title.title(), current_unit, is_komisyon))
                            inserted_count += 1
                            
                    elif unit:
                        current_unit = unit
                        
            if inserted_count == 0:
                print(f"[UYARI] {filename} dosyasindan hic veri okunamadi. Taranmis resim olabilir veya farkli bir formattir.")
                
    except Exception as e:
        print(f"Hata ({filename}): {e}")

def process_pdfs(conn, folder_path, callback=None):
    cursor = conn.cursor()
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]
    files.sort()
    
    for filename in files:
        if callback: callback(f"İşleniyor: {filename}")
        filepath = os.path.join(folder_path, filename)
        yil, ay = extract_year_month(filename)
        parse_pdf_smart(filepath, filename, yil, ay, cursor)
            
    conn.commit()

def extract_all(folder_path, db_path, callback=None):
    if callback: callback("Veritabanı hazırlanıyor...")
    conn = init_db(db_path)
    if callback: callback("PDF'ler okunuyor...")
    process_pdfs(conn, folder_path, callback)
    conn.close()
    if callback: callback("İşlem Tamamlandı.")

if __name__ == "__main__":
    print("Veritabani hazirlaniyor...")
    conn = init_db(DB_PATH)
    print("PDF'ler sozluk bazli akilli okumayla isleniyor...")
    process_pdfs(conn, FOLDER_PATH)
    conn.close()
    print("Islem Tamamlandi.")
