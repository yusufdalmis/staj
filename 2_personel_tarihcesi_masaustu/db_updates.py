import sqlite3
import os

DB_PATH = r"d:\stajv2\2024_03\personel_veritabani.sqlite"

def update_database():
    print("Veritabani guncellemesi basliyor...")
    if not os.path.exists(DB_PATH):
        print(f"Hata: Veritabani bulunamadi ({DB_PATH})")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create Personel_Ozgecmis table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Personel_Ozgecmis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            personel_id INTEGER UNIQUE,
            tc_kimlik_no TEXT,
            unvan TEXT,
            iban TEXT,
            dogum_tarihi TEXT,
            dogum_yeri TEXT,
            nufusa_kayitli_il TEXT,
            sicil_no TEXT,
            sigorta_baslangic TEXT,
            basvuru_turu TEXT,
            emeklilik_tarihi TEXT,
            medeni_durum TEXT,
            eposta TEXT,
            askerlik_durumu TEXT,
            telefon TEXT,
            kan_grubu TEXT,
            ehliyet TEXT,
            sendika TEXT,
            adres TEXT,
            cocuk_sayisi INTEGER,
            cocuk_1_dogum TEXT,
            cocuk_2_dogum TEXT,
            cocuk_3_dogum TEXT,
            cocuk_4_dogum TEXT,
            ogrenim_durumu TEXT,
            ilkokul TEXT,
            ortaokul TEXT,
            lise TEXT,
            on_lisans TEXT,
            lisans TEXT,
            yuksek_lisans TEXT,
            doktora TEXT,
            bolum TEXT,
            baslangic_bitis_yili TEXT,
            dil TEXT,
            sinav_sonucu TEXT,
            egitmenlik_sertifikasi TEXT,
            uzmanlik_alanlari TEXT,
            yuruttugu_projeler TEXT,
            birim_baskanliklari TEXT,
            ajansta_gorevleri TEXT,
            ajans_oncesi_deneyim TEXT,
            acil_kisi TEXT,
            acil_telefon TEXT,
            FOREIGN KEY(personel_id) REFERENCES Personel(id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()
    
    clean_duplicate_records(DB_PATH)
    print("Veritabani guncellemesi basariyla tamamlandi.")

def clean_duplicate_records(db_path=DB_PATH):
    if not os.path.exists(db_path):
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Mükerrer Personel Kayıtlarını Birleştir
        cursor.execute("SELECT id, TRIM(isim), TRIM(soyisim) FROM Personel")
        rows = cursor.fetchall()
        
        seen_names = {}
        duplicates_merged = 0
        
        for pid, isim, soyisim in rows:
            key = (isim.strip().lower(), soyisim.strip().lower())
            if key in seen_names:
                primary_id = seen_names[key]
                duplicate_id = pid
                
                # Gorev referanslarini güncelle
                cursor.execute("UPDATE Gorev SET personel_id=? WHERE personel_id=?", (primary_id, duplicate_id))
                
                # Personel_Ozgecmis referanslarini güncelle (Eger primary'de yoksa aktar)
                cursor.execute("SELECT id FROM Personel_Ozgecmis WHERE personel_id=?", (primary_id,))
                has_primary_cv = cursor.fetchone()
                if not has_primary_cv:
                    cursor.execute("UPDATE Personel_Ozgecmis SET personel_id=? WHERE personel_id=?", (primary_id, duplicate_id))
                else:
                    cursor.execute("DELETE FROM Personel_Ozgecmis WHERE personel_id=?", (duplicate_id,))
                    
                # Mükerrer personeli sil
                cursor.execute("DELETE FROM Personel WHERE id=?", (duplicate_id,))
                duplicates_merged += 1
            else:
                seen_names[key] = pid
                # Isim/soyisim alanlarini temizle
                cursor.execute("UPDATE Personel SET isim=?, soyisim=? WHERE id=?", (isim.strip(), soyisim.strip(), pid))
                
        # 2. Gorev Tablosundaki Mükerrer Kayıtları Temizle (Aynı personel, yıl, ay, birim, unvan)
        cursor.execute("""
            DELETE FROM Gorev 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM Gorev 
                GROUP BY personel_id, yil, ay, birim, unvan
            )
        """)
        task_duplicates_deleted = cursor.rowcount
        
        conn.commit()
        if duplicates_merged > 0 or task_duplicates_deleted > 0:
            print(f"[Veritabanı Temizliği] {duplicates_merged} mükerrer personel birleştirildi, {task_duplicates_deleted} mükerrer görev silindi.")
    except Exception as e:
        print(f"Mükerrer veritabanı temizleme hatası: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_database()

