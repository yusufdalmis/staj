import sqlite3
import os

DB_PATH = r"d:\stajv2\2024_03\personel_veritabani.sqlite"

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

def run_migration():
    print("Migrasyon basliyor...")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Eski verileri al
    try:
        c.execute("SELECT id, dosya_adi, yil, ay, ad_soyad, unvan, birim FROM Personel_Gorev")
        old_records = c.fetchall()
        print(f"Eski tablodan {len(old_records)} kayit okundu.")
    except Exception as e:
        print("Eski tablo bulunamadi veya okunamadi:", e)
        return

    # Yeni tablolari olustur
    c.execute("DROP TABLE IF EXISTS Personel")
    c.execute("DROP TABLE IF EXISTS Gorev")

    c.execute('''
        CREATE TABLE Personel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            isim TEXT,
            soyisim TEXT
        )
    ''')

    c.execute('''
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

    # Personelleri aktar
    unique_names = set(row[4] for row in old_records if row[4])
    name_to_id = {}
    
    print(f"Bulunan essiz personel sayisi: {len(unique_names)}")

    for ad_soyad in unique_names:
        isim, soyisim = split_name(ad_soyad)
        c.execute("INSERT INTO Personel (isim, soyisim) VALUES (?, ?)", (isim, soyisim))
        name_to_id[ad_soyad] = c.lastrowid

    # Gorevleri aktar
    komisyon_keywords = ['KOMİSYON', 'KOMİTE', 'KURUL', 'SORUMLULARI']
    
    for row in old_records:
        old_id, dosya_adi, yil, ay, ad_soyad, unvan, birim = row
        personel_id = name_to_id.get(ad_soyad) if ad_soyad else None
        
        is_komisyon = False
        if birim:
            is_komisyon = any(k in birim.upper() for k in komisyon_keywords)

        c.execute('''
            INSERT INTO Gorev (personel_id, dosya_adi, yil, ay, unvan, birim, is_komisyon)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (personel_id, dosya_adi, yil, ay, unvan, birim, is_komisyon))

    # Eski tabloyu sil veya yedekle
    c.execute("DROP TABLE Personel_Gorev")
    conn.commit()
    conn.close()
    print("Migrasyon basariyla tamamlandi.")

if __name__ == "__main__":
    run_migration()
