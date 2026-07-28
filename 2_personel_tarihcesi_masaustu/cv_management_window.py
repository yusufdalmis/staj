import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import customtkinter as ctk
import sqlite3
import os
import threading

from cv_import_export import import_cv_from_excel, generate_cv_html_pdf

def compute_edu_summary(ogrenim, doktora, yuksek, lisans, on_lisans, lise, ortaokul, ilkokul):
    doktora_str = str(doktora or '').strip()
    yuksek_str = str(yuksek or '').strip()
    lisans_str = str(lisans or '').strip()
    on_lisans_str = str(on_lisans or '').strip()
    lise_str = str(lise or '').strip()
    ogrenim_str = str(ogrenim or '').strip()
    ortaokul_str = str(ortaokul or '').strip()
    ilkokul_str = str(ilkokul or '').strip()

    if doktora_str: return "Doktora"
    if yuksek_str: return "Yüksek Lisans"
    if lisans_str: return "Lisans"
    if on_lisans_str: return "Ön Lisans"
    if lise_str: return "Lise"
    if ogrenim_str: return ogrenim_str
    if ortaokul_str: return "Ortaokul"
    if ilkokul_str: return "İlkokul"
    return "-"

class ComprehensivePersonDialog(ctk.CTkToplevel):
    def __init__(self, parent, db_path, personel_id=None, on_save_callback=None):
        super().__init__(parent)
        self.db_path = db_path
        self.personel_id = personel_id
        self.on_save_callback = on_save_callback

        title_text = "✏️ Personel & Özgeçmiş Düzenle" if personel_id else "➕ Kapsamlı Yeni Personel Ekle (3-in-1)"
        self.title(title_text)
        self.geometry("980x760")
        self.transient(parent)
        self.grab_set()
        self.focus_set()

        # --- Top Header Banner ---
        header_frame = ctk.CTkFrame(self, fg_color="#1e293b", corner_radius=10, height=65)
        header_frame.pack(fill="x", padx=15, pady=(15, 10))

        lbl_icon = ctk.CTkLabel(header_frame, text="👤", font=ctk.CTkFont(size=26))
        lbl_icon.pack(side="left", padx=(20, 10), pady=12)

        header_title_text = "Personel Bilgi Düzenleme Formu" if personel_id else "Kapsamlı Yeni Personel Ekleme Formu"
        lbl_title = ctk.CTkLabel(header_frame, text=header_title_text, font=ctk.CTkFont(size=18, weight="bold"), text_color="white")
        lbl_title.pack(side="left", pady=12)

        self.lbl_person_badge = ctk.CTkLabel(header_frame, text="YENİ KAYIT", fg_color="#3b82f6", text_color="white", corner_radius=6, font=ctk.CTkFont(size=11, weight="bold"))
        self.lbl_person_badge.pack(side="right", padx=20, pady=16)

        # --- Main Tabview ---
        self.tabview = ctk.CTkTabview(self, corner_radius=10)
        self.tabview.pack(fill="both", expand=True, padx=15, pady=5)

        self.entries = {}
        self.build_ui_tabs()

        # --- Bottom Action Bar ---
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(fill="x", pady=(10, 15), padx=15)

        btn_save = ctk.CTkButton(
            btn_frame, 
            text="💾 tüm Bilgileri Kaydet ve Veritabanında Birleştir", 
            command=self.save_data, 
            fg_color="#10b981", 
            hover_color="#059669", 
            font=ctk.CTkFont(size=14, weight="bold"), 
            height=42, 
            corner_radius=10
        )
        btn_save.pack(side="right", padx=5)

        btn_cancel = ctk.CTkButton(
            btn_frame, 
            text="❌ İptal", 
            command=self.destroy, 
            fg_color="#64748b", 
            hover_color="#475569", 
            font=ctk.CTkFont(size=13, weight="bold"),
            height=42, 
            corner_radius=10
        )
        btn_cancel.pack(side="right", padx=5)

        if self.personel_id:
            self.load_data()

    def build_ui_tabs(self):
        # -------------------------------------------------------------
        # TAB 1: 👤 Kimlik & Genel Bilgiler
        # -------------------------------------------------------------
        self.tabview.add("👤 Kimlik & Genel")
        tab1 = self.tabview.tab("👤 Kimlik & Genel")
        scroll1 = ctk.CTkScrollableFrame(tab1, fg_color="transparent")
        scroll1.pack(fill="both", expand=True)

        card_kimlik = self.create_section_card(scroll1, "🆔 Temel Kimlik & Nüfus Bilgileri")
        self.add_form_row(card_kimlik, 0, [
            ('isim', 'Ad (Zorunlu)', 'entry', None),
            ('soyisim', 'Soyad (Zorunlu)', 'entry', None)
        ])
        self.add_form_row(card_kimlik, 1, [
            ('unvan', 'Unvan', 'entry', None),
            ('tc_kimlik_no', 'TC Kimlik No', 'entry', None)
        ])
        self.add_form_row(card_kimlik, 2, [
            ('dogum_tarihi', 'Doğum Tarihi (GG.AA.YYYY)', 'entry', None),
            ('dogum_yeri', 'Doğum Yeri', 'entry', None)
        ])
        self.add_form_row(card_kimlik, 3, [
            ('nufusa_kayitli_il', 'Nüfusa Kayıtlı İl', 'entry', None),
            ('sicil_no', 'Ajans Sicil No', 'entry', None)
        ])

        card_durum = self.create_section_card(scroll1, "🎖️ Çalışma, Askerlik & Ehliyet Durumu")
        self.add_form_row(card_durum, 0, [
            ('sigorta_baslangic', 'İlk Sigorta Başlangıcı', 'entry', None),
            ('basvuru_turu', 'Başvuru Türü', 'entry', None)
        ])
        self.add_form_row(card_durum, 1, [
            ('emeklilik_tarihi', 'Emeklilik Tarihi', 'entry', None),
            ('askerlik_durumu', 'Askerlik Durumu', 'combo', ["Yapıldı", "Muaf", "Tecilli", "İlişiği Yok", "Yapılmadı"])
        ])
        self.add_form_row(card_durum, 2, [
            ('kan_grubu', 'Kan Grubu', 'combo', ["A RH+", "A RH-", "B RH+", "B RH-", "AB RH+", "AB RH-", "0 RH+", "0 RH-"]),
            ('ehliyet', 'Ehliyet Sınıfı', 'combo', ["B", "A2", "C", "D", "E", "Yok"])
        ])
        self.add_form_row(card_durum, 3, [
            ('sendika', 'Sendika Üyeliği', 'combo', ["Var", "Yok", "Bilinmiyor"]),
            ('iban', 'IBAN Numarası', 'entry', None)
        ])

        # -------------------------------------------------------------
        # TAB 2: 📞 İletişim & Adres
        # -------------------------------------------------------------
        self.tabview.add("📞 İletişim & Adres")
        tab2 = self.tabview.tab("📞 İletişim & Adres")
        scroll2 = ctk.CTkScrollableFrame(tab2, fg_color="transparent")
        scroll2.pack(fill="both", expand=True)

        card_iletisim = self.create_section_card(scroll2, "📱 İletişim Kanalları")
        self.add_form_row(card_iletisim, 0, [
            ('eposta', 'E-Posta Adresi', 'entry', None),
            ('telefon', 'Cep Telefonu', 'entry', None)
        ])
        self.add_form_row(card_iletisim, 1, [
            ('adres', 'Açık İkametgah Adresi', 'text', None)
        ])

        card_acil = self.create_section_card(scroll2, "🆘 Acil Durum İrtibatı")
        self.add_form_row(card_acil, 0, [
            ('acil_kisi', 'Acil Durumda Aranacak Kişi', 'entry', None),
            ('acil_telefon', 'Acil Durum Telefonu', 'entry', None)
        ])

        # -------------------------------------------------------------
        # TAB 3: 🎓 Eğitim & Diller
        # -------------------------------------------------------------
        self.tabview.add("🎓 Eğitim & Diller")
        tab3 = self.tabview.tab("🎓 Eğitim & Diller")
        scroll3 = ctk.CTkScrollableFrame(tab3, fg_color="transparent")
        scroll3.pack(fill="both", expand=True)

        card_egitim = self.create_section_card(scroll3, "🏫 Eğitim Geçmişi (İlk Öğrenim - Yüksek Öğrenim)")
        self.add_form_row(card_egitim, 0, [
            ('ilkokul', 'İlkokul Adı', 'entry', None),
            ('ortaokul', 'Ortaokul Adı', 'entry', None)
        ])
        self.add_form_row(card_egitim, 1, [
            ('lise', 'Lise Adı', 'entry', None),
            ('on_lisans', 'Ön Lisans (Fakülte/MYO)', 'entry', None)
        ])
        self.add_form_row(card_egitim, 2, [
            ('lisans', 'Lisans (Üniversite & Yıl)', 'text', None),
            ('bolum', 'Bölüm / Branş', 'entry', None)
        ])
        self.add_form_row(card_egitim, 3, [
            ('yuksek_lisans', 'Yüksek Lisans', 'text', None),
            ('doktora', 'Doktora', 'text', None)
        ])

        card_dil = self.create_section_card(scroll3, "🌐 Yabancı Dil & Sınavlar")
        self.add_form_row(card_dil, 0, [
            ('dil', 'Bilinen Yabancı Diller', 'entry', None),
            ('sinav_sonucu', 'Dil Sınavı / Puanı (YDS/YÖKDİL vb.)', 'entry', None)
        ])

        # -------------------------------------------------------------
        # TAB 4: 👨‍👩‍👧 Aile Bilgileri
        # -------------------------------------------------------------
        self.tabview.add("👨‍👩‍👧 Aile Bilgileri")
        tab4 = self.tabview.tab("👨‍👩‍👧 Aile Bilgileri")
        scroll4 = ctk.CTkScrollableFrame(tab4, fg_color="transparent")
        scroll4.pack(fill="both", expand=True)

        card_aile = self.create_section_card(scroll4, "👨‍👩‍👧 Medeni Hal & Çocuklar")
        self.add_form_row(card_aile, 0, [
            ('medeni_durum', 'Medeni Durum', 'combo', ["Evli", "Bekar"]),
            ('cocuk_sayisi', 'Çocuk Sayısı', 'entry', None)
        ])
        self.add_form_row(card_aile, 1, [
            ('cocuk_1_dogum', '1. Çocuk Doğum Tarihi', 'entry', None),
            ('cocuk_2_dogum', '2. Çocuk Doğum Tarihi', 'entry', None)
        ])
        self.add_form_row(card_aile, 2, [
            ('cocuk_3_dogum', '3. Çocuk Doğum Tarihi', 'entry', None),
            ('cocuk_4_dogum', '4. Çocuk Doğum Tarihi', 'entry', None)
        ])

        # -------------------------------------------------------------
        # TAB 5: 🏢 Görev Ataması & Deneyim
        # -------------------------------------------------------------
        self.tabview.add("🏢 Birim & Deneyim")
        tab5 = self.tabview.tab("🏢 Birim & Deneyim")
        scroll5 = ctk.CTkScrollableFrame(tab5, fg_color="transparent")
        scroll5.pack(fill="both", expand=True)

        card_birim = self.create_section_card(scroll5, "🏢 Otomatik Dönemlik Birim Ataması (3-in-1 Birleştirme)")
        self.add_form_row(card_birim, 0, [
            ('gorev_yil', 'İlk Görev Yılı (Örn: 2026)', 'entry', None),
            ('gorev_ay', 'İlk Görev Ayı (1-12)', 'entry', None)
        ])
        self.add_form_row(card_birim, 1, [
            ('gorev_birim', 'Görev Yapacağı Birim Adı', 'entry', None)
        ])

        card_deneyim = self.create_section_card(scroll5, "💼 Projeler, Sertifikalar & İş Deneyimleri")
        self.add_form_row(card_deneyim, 0, [
            ('uzmanlik_alanlari', 'Uzmanlık Alanları', 'text', None)
        ])
        self.add_form_row(card_deneyim, 1, [
            ('egitmenlik_sertifikasi', 'Eğitmenlik / Profesyonel Sertifikalar', 'text', None)
        ])
        self.add_form_row(card_deneyim, 2, [
            ('yuruttugu_projeler', 'Yürüttüğü Önemli Projeler', 'text', None)
        ])
        self.add_form_row(card_deneyim, 3, [
            ('birim_baskanliklari', 'Başkanlık Yaptığı Birimler & Tarihleri', 'text', None)
        ])
        self.add_form_row(card_deneyim, 4, [
            ('ajansta_gorevleri', 'Ajansta Görev Aldığı Diğer Birimler', 'text', None)
        ])
        self.add_form_row(card_deneyim, 5, [
            ('ajans_oncesi_deneyim', 'Ajans Öncesi İş Deneyimi', 'text', None)
        ])

    def create_section_card(self, parent_scroll, title):
        card = ctk.CTkFrame(parent_scroll, corner_radius=10, fg_color="#1e293b" if ctk.get_appearance_mode() == "Dark" else "#ffffff")
        card.pack(fill="x", padx=5, pady=8)
        
        lbl_sec = ctk.CTkLabel(card, text=title, font=ctk.CTkFont(size=14, weight="bold"), text_color="#3b82f6" if ctk.get_appearance_mode() == "Dark" else "#1e293b")
        lbl_sec.pack(anchor="w", padx=15, pady=(12, 8))
        
        divider = ctk.CTkFrame(card, height=1, fg_color="#334155" if ctk.get_appearance_mode() == "Dark" else "#e2e8f0")
        divider.pack(fill="x", padx=15, pady=(0, 10))
        return card

    def add_form_row(self, card, row_idx, items):
        row_frame = ctk.CTkFrame(card, fg_color="transparent")
        row_frame.pack(fill="x", padx=15, pady=5)

        for col_idx, item in enumerate(items):
            db_col = item[0]
            label_text = item[1]
            control_type = item[2] if len(item) > 2 else 'entry'
            choices = item[3] if len(item) > 3 else None

            cell_frame = ctk.CTkFrame(row_frame, fg_color="transparent")
            cell_frame.pack(side="left", fill="x", expand=True, padx=5)

            lbl = ctk.CTkLabel(cell_frame, text=label_text + ":", font=ctk.CTkFont(size=11, weight="bold"), anchor="w")
            lbl.pack(fill="x", anchor="w", pady=(0, 2))

            if control_type == 'entry':
                widget = ctk.CTkEntry(cell_frame, height=32, corner_radius=6)
                widget.pack(fill="x")
                self.entries[db_col] = widget
            elif control_type == 'combo':
                widget = ctk.CTkComboBox(cell_frame, values=choices or [], height=32, corner_radius=6)
                if choices: widget.set(choices[0])
                widget.pack(fill="x")
                self.entries[db_col] = widget
            elif control_type == 'text':
                widget = ctk.CTkTextbox(cell_frame, height=55, corner_radius=6)
                widget.pack(fill="x")
                self.entries[db_col] = widget

    def load_data(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("SELECT isim, soyisim FROM Personel WHERE id=?", (self.personel_id,))
        p_res = c.fetchone()
        if p_res:
            self.lbl_person_badge.configure(text=f"{p_res[0]} {p_res[1]}", fg_color="#10b981")
            if 'isim' in self.entries:
                self.entries['isim'].delete(0, tk.END)
                self.entries['isim'].insert(0, p_res[0] or "")
            if 'soyisim' in self.entries:
                self.entries['soyisim'].delete(0, tk.END)
                self.entries['soyisim'].insert(0, p_res[1] or "")

        c.execute("SELECT * FROM Personel_Ozgecmis WHERE personel_id=?", (self.personel_id,))
        row = c.fetchone()
        if row:
            c.execute('PRAGMA table_info(Personel_Ozgecmis)')
            cols = [col[1] for col in c.fetchall()]
            cv_dict = {cols[i]: row[i] for i in range(len(cols))}
            
            for key, widget in self.entries.items():
                if key in ['isim', 'soyisim', 'gorev_yil', 'gorev_ay', 'gorev_birim']: continue
                val = cv_dict.get(key, "")
                if val is None: val = ""

                if isinstance(widget, ctk.CTkEntry):
                    widget.delete(0, tk.END)
                    widget.insert(0, str(val))
                elif isinstance(widget, ctk.CTkComboBox):
                    widget.set(str(val))
                elif isinstance(widget, ctk.CTkTextbox):
                    widget.delete("1.0", tk.END)
                    widget.insert("1.0", str(val))

        c.execute("SELECT yil, ay, birim, unvan FROM Gorev WHERE personel_id=? ORDER BY yil DESC, ay DESC LIMIT 1", (self.personel_id,))
        g_row = c.fetchone()
        if g_row:
            if 'gorev_yil' in self.entries:
                self.entries['gorev_yil'].delete(0, tk.END)
                self.entries['gorev_yil'].insert(0, str(g_row[0] or ""))
            if 'gorev_ay' in self.entries:
                self.entries['gorev_ay'].delete(0, tk.END)
                self.entries['gorev_ay'].insert(0, str(g_row[1] or ""))
            if 'gorev_birim' in self.entries:
                self.entries['gorev_birim'].delete(0, tk.END)
                self.entries['gorev_birim'].insert(0, str(g_row[2] or ""))
            
        conn.close()

    def save_data(self):
        isim = self.entries['isim'].get().strip() if 'isim' in self.entries else ""
        soyisim = self.entries['soyisim'].get().strip() if 'soyisim' in self.entries else ""
        
        if not isim or not soyisim:
            messagebox.showwarning("Uyarı", "Lütfen Ad ve Soyad alanlarını doldurunuz!", parent=self)
            return

        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()

        # 1. Personel Tablosunu Güncelle veya Ekle
        if self.personel_id:
            c.execute("UPDATE Personel SET isim=?, soyisim=? WHERE id=?", (isim, soyisim, self.personel_id))
            p_id = self.personel_id
        else:
            c.execute("SELECT id FROM Personel WHERE LOWER(TRIM(isim))=LOWER(?) AND LOWER(TRIM(soyisim))=LOWER(?)", (isim, soyisim))
            p_row = c.fetchone()
            if p_row:
                p_id = p_row[0]
            else:
                c.execute("INSERT INTO Personel (isim, soyisim) VALUES (?, ?)", (isim, soyisim))
                p_id = c.lastrowid

        # 2. Personel_Ozgecmis Tablosunu Güncelle veya Ekle
        cv_data = {}
        for key, widget in self.entries.items():
            if key in ['isim', 'soyisim', 'gorev_yil', 'gorev_ay', 'gorev_birim']: continue
            if isinstance(widget, (ctk.CTkEntry, ctk.CTkComboBox)):
                cv_data[key] = widget.get().strip()
            elif isinstance(widget, ctk.CTkTextbox):
                cv_data[key] = widget.get("1.0", "end-1c").strip()

        c.execute("SELECT id FROM Personel_Ozgecmis WHERE personel_id=?", (p_id,))
        exists_cv = c.fetchone()

        keys = list(cv_data.keys())
        if exists_cv:
            set_clause = ", ".join([f"{k}=?" for k in keys])
            values = [cv_data[k] for k in keys] + [p_id]
            c.execute(f"UPDATE Personel_Ozgecmis SET {set_clause} WHERE personel_id=?", tuple(values))
        else:
            cols = ", ".join(keys)
            placeholders = ", ".join(["?" for _ in keys])
            values = [p_id] + [cv_data[k] for k in keys]
            c.execute(f"INSERT INTO Personel_Ozgecmis (personel_id, {cols}) VALUES (?, {placeholders})", tuple(values))

        # 3. Opsiyonel Dönemlik Görev Ataması (Gorev Tablosu)
        g_yil = self.entries['gorev_yil'].get().strip() if 'gorev_yil' in self.entries else ""
        g_ay = self.entries['gorev_ay'].get().strip() if 'gorev_ay' in self.entries else ""
        g_birim = self.entries['gorev_birim'].get().strip() if 'gorev_birim' in self.entries else ""
        unvan_val = cv_data.get('unvan', '')

        if g_yil and g_ay and g_birim:
            c.execute("SELECT id FROM Gorev WHERE personel_id=? AND yil=? AND ay=? AND birim=?", (p_id, g_yil, g_ay, g_birim))
            if not c.fetchone():
                dosya_adi = f"El_ile_Eklenen_{g_yil}_{g_ay}.pdf"
                komisyon_keywords = ['KOMİSYON', 'KOMİTE', 'KURUL', 'SORUMLULARI']
                is_kom = any(k in g_birim.upper() for k in komisyon_keywords)
                c.execute("INSERT INTO Gorev (personel_id, dosya_adi, yil, ay, unvan, birim, is_komisyon) VALUES (?, ?, ?, ?, ?, ?, ?)",
                          (p_id, dosya_adi, g_yil, g_ay, unvan_val, g_birim, is_kom))

        conn.commit()
        conn.close()

        messagebox.showinfo("Başarılı", f"'{isim} {soyisim}' personeline ait tüm bilgiler başarıyla veritabanında birleştirildi.", parent=self)
        if self.on_save_callback:
            self.on_save_callback()
        self.destroy()


class CVManagementFrame(ctk.CTkFrame):
    def __init__(self, parent, db_path):
        super().__init__(parent, fg_color="transparent")
        self.db_path = db_path
        
        # State variables
        self.show_no_cv = False
        self.sort_col = "Ad Soyad"
        self.sort_desc = False
        self.raw_data = []
        
        # --- Top Header ---
        top_frame = ctk.CTkFrame(self, fg_color="#1e293b", corner_radius=10, height=55)
        top_frame.pack(fill="x", side="top", padx=5, pady=(5, 10))
        
        lbl_title = ctk.CTkLabel(
            top_frame, 
            text="👥 Personel Özgeçmiş Yönetim ve İnceleme Paneli", 
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="white"
        )
        lbl_title.pack(side="left", padx=15, pady=12)
        
        btn_import = ctk.CTkButton(
            top_frame, 
            text="📥 Excel'den İçe Aktar", 
            command=self.import_excel, 
            fg_color="#10b981", 
            hover_color="#059669", 
            width=150, 
            height=34,
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        btn_import.pack(side="right", padx=15, pady=10)

        # --- Filter Control Bar ---
        filter_frame = ctk.CTkFrame(self, fg_color="transparent")
        filter_frame.pack(fill="x", padx=5, pady=5)

        # 1. Search Box
        lbl_search = ctk.CTkLabel(filter_frame, text="🔍 Kişi Ara:", font=ctk.CTkFont(weight="bold"))
        lbl_search.pack(side="left", padx=(5, 5))
        
        self.ent_search = ctk.CTkEntry(filter_frame, placeholder_text="İsim veya soyisim girin...", width=200)
        self.ent_search.pack(side="left", padx=5)
        self.ent_search.bind("<KeyRelease>", lambda e: self.apply_filters())

        # 2. Blood Type Filter
        lbl_blood = ctk.CTkLabel(filter_frame, text="🩸 Kan Grubu:", font=ctk.CTkFont(weight="bold"))
        lbl_blood.pack(side="left", padx=(15, 5))
        
        blood_types = ["Tümü", "A RH+", "A RH-", "B RH+", "B RH-", "AB RH+", "AB RH-", "0 RH+", "0 RH-"]
        self.cmb_blood = ctk.CTkComboBox(filter_frame, values=blood_types, width=120, command=lambda v: self.apply_filters())
        self.cmb_blood.set("Tümü")
        self.cmb_blood.pack(side="left", padx=5)

        # 3. Education Filter
        lbl_edu = ctk.CTkLabel(filter_frame, text="🎓 Öğrenim:", font=ctk.CTkFont(weight="bold"))
        lbl_edu.pack(side="left", padx=(15, 5))
        
        edu_levels = ["Tümü", "İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"]
        self.cmb_edu = ctk.CTkComboBox(filter_frame, values=edu_levels, width=130, command=lambda v: self.apply_filters())
        self.cmb_edu.set("Tümü")
        self.cmb_edu.pack(side="left", padx=5)

        # 4. Show/Hide No-CV Toggle Button
        self.btn_toggle_nocv = ctk.CTkButton(
            filter_frame,
            text="👁️ Özgeçmişi Olmayanları Göster",
            command=self.toggle_no_cv_visibility,
            fg_color="#64748b",
            hover_color="#475569",
            width=200,
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        self.btn_toggle_nocv.pack(side="left", padx=10)

        # 5. Reset Filters
        btn_reset = ctk.CTkButton(
            filter_frame,
            text="↺ Temizle",
            command=self.reset_filters,
            fg_color="#94a3b8",
            hover_color="#64748b",
            width=75,
            corner_radius=8
        )
        btn_reset.pack(side="left", padx=5)

        # --- Treeview Frame ---
        tree_frame = ctk.CTkFrame(self)
        tree_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        style = ttk.Style()
        style.theme_use("default")
        bg_color = "#1e293b" if ctk.get_appearance_mode() == "Dark" else "#ffffff"
        fg_color = "#f8fafc" if ctk.get_appearance_mode() == "Dark" else "#0f172a"
        field_bg = "#0f172a" if ctk.get_appearance_mode() == "Dark" else "#ffffff"
        
        style.configure("Treeview", background=bg_color, foreground=fg_color, rowheight=28, fieldbackground=field_bg, borderwidth=0, font=('Segoe UI', 10))
        style.map('Treeview', background=[('selected', '#3b82f6')], foreground=[('selected', 'white')])
        style.configure("Treeview.Heading", background="#1e293b", foreground="white", relief="flat", font=('Segoe UI', 10, 'bold'))
        style.map("Treeview.Heading", background=[('active', '#334155')])
        
        self.columns = ("Seçim", "ID", "Ad Soyad", "CV Durumu", "Unvan", "Kan Grubu", "Öğrenim Durumu", "Telefon", "E-Posta", "Askerlik", "Sendika", "Ehliyet", "Çocuk Sayısı")
        
        self.tree = ttk.Treeview(tree_frame, columns=self.columns, show="headings", selectmode="extended")
        
        col_widths = {
            "Seçim": 80, "ID": 50, "Ad Soyad": 180, "CV Durumu": 100, 
            "Unvan": 160, "Kan Grubu": 100, "Öğrenim Durumu": 140, 
            "Telefon": 120, "E-Posta": 170, "Askerlik": 110, 
            "Sendika": 110, "Ehliyet": 80, "Çocuk Sayısı": 90
        }
        
        for col in self.columns:
            self.tree.heading(col, text=col, command=lambda _col=col: self.on_header_click(_col))
            width = col_widths.get(col, 120)
            align = tk.CENTER if col in ["Seçim", "ID", "CV Durumu", "Kan Grubu", "Çocuk Sayısı"] else tk.W
            self.tree.column(col, width=width, minwidth=60, anchor=align)
            
        self.tree.bind('<ButtonRelease-1>', self.on_tree_click)
        
        vsb = ctk.CTkScrollbar(tree_frame, orientation="vertical", command=self.tree.yview)
        hsb = ctk.CTkScrollbar(tree_frame, orientation="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        
        vsb.pack(side="right", fill="y")
        hsb.pack(side="bottom", fill="x")
        self.tree.pack(side="left", fill="both", expand=True)
        
        # Modern High-Contrast Row Tags
        self.tree.tag_configure('even_row', background='#1e293b' if ctk.get_appearance_mode() == "Dark" else '#f8fafc', foreground='#f8fafc' if ctk.get_appearance_mode() == "Dark" else '#0f172a')
        self.tree.tag_configure('odd_row', background='#0f172a' if ctk.get_appearance_mode() == "Dark" else '#ffffff', foreground='#f8fafc' if ctk.get_appearance_mode() == "Dark" else '#0f172a')
        
        # --- Bottom Action Bar ---
        bottom_frame = ctk.CTkFrame(self, fg_color="transparent")
        bottom_frame.pack(fill="x", padx=5, pady=8)

        btn_add_new = ctk.CTkButton(
            bottom_frame,
            text="➕ Kapsamlı Yeni Personel Ekle (3-in-1)",
            command=self.add_new_person_dialog,
            fg_color="#10b981",
            hover_color="#059669",
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        btn_add_new.pack(side="left", padx=4)

        btn_add_edit = ctk.CTkButton(
            bottom_frame, 
            text="✏️ Özgeçmiş Düzenle", 
            command=self.open_edit_window, 
            fg_color="#3b82f6", 
            hover_color="#2563eb", 
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        btn_add_edit.pack(side="left", padx=4)
        
        btn_delete = ctk.CTkButton(
            bottom_frame, 
            text="🗑️ Özgeçmişi Sil", 
            command=self.delete_cv, 
            fg_color="#ef4444", 
            hover_color="#dc2626", 
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        btn_delete.pack(side="left", padx=4)
        
        btn_bulk_pdf = ctk.CTkButton(
            bottom_frame, 
            text="📄 Tüm Özgeçmişleri PDF Al", 
            command=self.bulk_pdf, 
            fg_color="#f59e0b", 
            hover_color="#d97706", 
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        btn_bulk_pdf.pack(side="right", padx=4)
        
        btn_single_pdf = ctk.CTkButton(
            bottom_frame, 
            text="📄 Seçili Kişileri PDF Al", 
            command=self.single_pdf, 
            fg_color="#06b6d4", 
            hover_color="#0891b2", 
            corner_radius=8,
            font=ctk.CTkFont(size=12, weight="bold")
        )
        btn_single_pdf.pack(side="right", padx=4)
        
        self.load_data()

    def toggle_no_cv_visibility(self):
        self.show_no_cv = not self.show_no_cv
        if self.show_no_cv:
            self.btn_toggle_nocv.configure(
                text="👁️ Özgeçmişi Olmayanlar (AÇIK)",
                fg_color="#0284c7",
                hover_color="#0369a1"
            )
        else:
            self.btn_toggle_nocv.configure(
                text="👁️ Özgeçmişi Olmayanları Göster",
                fg_color="#64748b",
                hover_color="#475569"
            )
        self.apply_filters()

    def reset_filters(self):
        self.ent_search.delete(0, tk.END)
        self.cmb_blood.set("Tümü")
        self.cmb_edu.set("Tümü")
        self.show_no_cv = False
        self.btn_toggle_nocv.configure(
            text="👁️ Özgeçmişi Olmayanları Göster",
            fg_color="#64748b",
            hover_color="#475569"
        )
        self.apply_filters()

    def on_tree_click(self, event):
        region = self.tree.identify_region(event.x, event.y)
        if region == "cell":
            column = self.tree.identify_column(event.x)
            if column == '#1':
                item = self.tree.identify_row(event.y)
                if item:
                    current_val = self.tree.set(item, "Seçim")
                    new_val = "☑" if current_val == "☐" else "☐"
                    self.tree.set(item, "Seçim", new_val)

    def load_data(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''
            SELECT 
                p.id, 
                p.isim || ' ' || p.soyisim AS ad_soyad, 
                cv.id AS cv_id, 
                COALESCE(cv.unvan, '') AS unvan,
                COALESCE(cv.kan_grubu, '') AS kan_grubu,
                COALESCE(cv.ogrenim_durumu, '') AS ogrenim_durumu,
                COALESCE(cv.doktora, '') AS doktora,
                COALESCE(cv.yuksek_lisans, '') AS yuksek_lisans,
                COALESCE(cv.lisans, '') AS lisans,
                COALESCE(cv.on_lisans, '') AS on_lisans,
                COALESCE(cv.lise, '') AS lise,
                COALESCE(cv.ortaokul, '') AS ortaokul,
                COALESCE(cv.ilkokul, '') AS ilkokul,
                COALESCE(cv.telefon, '') AS telefon,
                COALESCE(cv.eposta, '') AS eposta,
                COALESCE(cv.askerlik_durumu, '') AS askerlik_durumu,
                COALESCE(cv.sendika, '') AS sendika,
                COALESCE(cv.ehliyet, '') AS ehliyet,
                COALESCE(cv.cocuk_sayisi, 0) AS cocuk_sayisi
            FROM Personel p
            LEFT JOIN Personel_Ozgecmis cv ON p.id = cv.personel_id
            ORDER BY p.isim, p.soyisim
        ''')
        
        rows = c.fetchall()
        conn.close()
        
        self.raw_data = []
        for r in rows:
            pid, ad_soyad, cv_id, unvan, kan, ogrenim, doktora, yuksek, lisans, on_lisans, lise, ortaokul, ilkokul, tel, mail, asker, sendika, ehliyet, cocuk = r
            
            edu_summary = compute_edu_summary(ogrenim, doktora, yuksek, lisans, on_lisans, lise, ortaokul, ilkokul)
            durum_str = "✓ Var" if cv_id else "✗ Yok"

            self.raw_data.append({
                "Seçim": "☐",
                "ID": pid,
                "Ad Soyad": ad_soyad,
                "CV Durumu": durum_str,
                "Unvan": unvan,
                "Kan Grubu": kan,
                "Öğrenim Durumu": edu_summary,
                "Telefon": tel,
                "E-Posta": mail,
                "Askerlik": asker,
                "Sendika": sendika,
                "Ehliyet": ehliyet,
                "Çocuk Sayısı": cocuk,
                "has_cv": bool(cv_id)
            })
            
        self.apply_filters()

    def apply_filters(self):
        query = self.ent_search.get().strip().lower()
        blood_filter = self.cmb_blood.get()
        edu_filter = self.cmb_edu.get()
        
        filtered = []
        for item in self.raw_data:
            if not self.show_no_cv and not item["has_cv"]:
                continue
                
            if query and query not in item["Ad Soyad"].lower():
                continue
                
            if blood_filter != "Tümü":
                item_blood = item["Kan Grubu"].replace(" ", "").upper()
                target_blood = blood_filter.replace(" ", "").upper()
                if target_blood not in item_blood and item_blood not in target_blood:
                    continue
                    
            if edu_filter != "Tümü" and edu_filter.lower() not in item["Öğrenim Durumu"].lower():
                continue
                
            filtered.append(item)

        def sort_key(x):
            val = x.get(self.sort_col, "")
            if isinstance(val, int) or isinstance(val, float):
                return val
            return str(val).lower()

        filtered.sort(key=sort_key, reverse=self.sort_desc)
        
        self.render_tree(filtered)

    def on_header_click(self, col):
        if self.sort_col == col:
            self.sort_desc = not self.sort_desc
        else:
            self.sort_col = col
            self.sort_desc = False
            
        for c in self.columns:
            title = c
            if c == self.sort_col:
                title += " ▲" if not self.sort_desc else " ▼"
            self.tree.heading(c, text=title)
            
        self.apply_filters()

    def render_tree(self, data_list):
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        for idx, item in enumerate(data_list):
            row_tag = 'even_row' if idx % 2 == 0 else 'odd_row'
            vals = [item[c] for c in self.columns]
            self.tree.insert("", tk.END, values=vals, tags=(row_tag,))

    def add_new_person_dialog(self):
        ComprehensivePersonDialog(self, self.db_path, personel_id=None, on_save_callback=self.load_data)

    def import_excel(self):
        file_path = filedialog.askopenfilename(
            title="Personel Bilgi Formu Genel.xlsx Dosyasını Seçin",
            filetypes=[("Excel Dosyaları", "*.xlsx *.xls")]
        )
        if not file_path:
            return
            
        def do_import():
            try:
                imported, updated = import_cv_from_excel(file_path, self.db_path)
                self.after(0, lambda: messagebox.showinfo("Başarılı", f"İçe aktarım tamamlandı.\n\nYeni Eklenen: {imported}\nGüncellenen: {updated}", parent=self))
                self.after(0, self.load_data)
            except Exception as e:
                self.after(0, lambda: messagebox.showerror("Hata", f"İçe aktarım sırasında hata oluştu:\n{e}", parent=self))
                
        threading.Thread(target=do_import, daemon=True).start()

    def open_edit_window(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Uyarı", "Lütfen bir personel seçin.", parent=self)
            return
            
        if len(selected) > 1:
            messagebox.showwarning("Uyarı", "Lütfen sadece bir personel seçin.", parent=self)
            return
            
        item = self.tree.item(selected[0])
        personel_id = item['values'][1]
        
        ComprehensivePersonDialog(self, self.db_path, personel_id=personel_id, on_save_callback=self.load_data)
        
    def delete_cv(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Uyarı", "Lütfen silinecek personeli seçin.", parent=self)
            return
            
        if not messagebox.askyesno("Onay", f"Seçili {len(selected)} personelin özgeçmiş kaydı silinecek. Onaylıyor musunuz?", parent=self):
            return
            
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        for sel in selected:
            pid = self.tree.item(sel)['values'][1]
            c.execute("DELETE FROM Personel_Ozgecmis WHERE personel_id=?", (pid,))
            
        conn.commit()
        conn.close()
        
        messagebox.showinfo("Başarılı", "Özgeçmişler başarıyla silindi.", parent=self)
        self.load_data()

    def single_pdf(self):
        pids = []
        for item in self.tree.get_children():
            if self.tree.set(item, "Seçim") == "☑":
                pids.append(self.tree.set(item, "ID"))
                
        if not pids:
            selected = self.tree.selection()
            pids = [self.tree.item(s)['values'][1] for s in selected]
            
        if not pids:
            messagebox.showwarning("Uyarı", "Lütfen PDF çıktısı alınacak kişileri seçin.", parent=self)
            return
            
        output_path = os.path.join(os.path.dirname(self.db_path), "Secili_Personeller_CV.html")
        generate_cv_html_pdf(pids, self.db_path, output_path)

    def bulk_pdf(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT personel_id FROM Personel_Ozgecmis")
        pids = [row[0] for row in c.fetchall()]
        conn.close()
        
        if not pids:
            messagebox.showwarning("Uyarı", "Veritabanında hiç özgeçmiş kaydı bulunmuyor.", parent=self)
            return
            
        output_path = os.path.join(os.path.dirname(self.db_path), "Tum_Personeller_CV.html")
        generate_cv_html_pdf(pids, self.db_path, output_path)


class CVManagementWindow(ctk.CTkToplevel):
    def __init__(self, parent, db_path):
        super().__init__(parent)
        self.title("Özgeçmiş (CV) Yönetimi")
        self.geometry("1300x750")
        self.transient(parent)
        self.focus_set()
        
        self.frame = CVManagementFrame(self, db_path)
        self.frame.pack(fill="both", expand=True, padx=10, pady=10)
