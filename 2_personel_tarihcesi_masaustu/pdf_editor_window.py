import tkinter as tk
from tkinter import ttk, messagebox
import customtkinter as ctk
import sqlite3
import os
import pdf_generator

class PDFEditorFrame(ctk.CTkFrame):
    def __init__(self, parent, db_path):
        super().__init__(parent, fg_color="transparent")
        self.db_path = db_path
        
        self.current_gorev_id = None
        self.loaded_yil = None
        self.loaded_ay = None
        
        self.create_widgets()
        self.load_donemler()

    def create_widgets(self):
        # Top Frame: Dönem Seçimi
        top_frame = ctk.CTkFrame(self, corner_radius=10)
        top_frame.pack(fill="x", padx=5, pady=(5, 10))
        
        lbl_top = ctk.CTkLabel(top_frame, text="🛠️ PDF Rapor Düzenleyici & Çıktı Alma", font=ctk.CTkFont(size=16, weight="bold"))
        lbl_top.pack(side="left", padx=15, pady=12)

        ctk.CTkLabel(top_frame, text="Yıl:", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=(15, 5))
        self.cb_yil = ctk.CTkComboBox(top_frame, values=[], width=100, command=self.on_top_yil_changed)
        self.cb_yil.pack(side="left", padx=5)
        
        ctk.CTkLabel(top_frame, text="Ay:", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=(10, 5))
        self.cb_ay = ctk.CTkComboBox(top_frame, values=[], width=80)
        self.cb_ay.pack(side="left", padx=5)
        
        btn_load = ctk.CTkButton(top_frame, text="🔍 Dönemi Getir", command=self.load_data, fg_color="#3b82f6", width=120)
        btn_load.pack(side="left", padx=15)
        
        btn_pdf = ctk.CTkButton(top_frame, text="📄 Bu Dönemin PDF Çıktısını Al", command=self.generate_pdf, fg_color="#10b981", hover_color="#059669", font=ctk.CTkFont(weight="bold"), corner_radius=8)
        btn_pdf.pack(side="right", padx=15, pady=10)

        # Main Body
        body_frame = ctk.CTkFrame(self, fg_color="transparent")
        body_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Left: Treeview
        tree_frame = ctk.CTkFrame(body_frame)
        tree_frame.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        scroll = ttk.Scrollbar(tree_frame)
        scroll.pack(side="right", fill="y")
        
        style = ttk.Style()
        style.theme_use("default")
        
        self.tree = ttk.Treeview(tree_frame, columns=("unvan",), show="tree headings", yscrollcommand=scroll.set)
        self.tree.heading("#0", text="Birim / Personel")
        self.tree.heading("unvan", text="Ünvanı")
        self.tree.column("#0", width=380)
        self.tree.column("unvan", width=180)
        self.tree.pack(fill="both", expand=True)
        scroll.config(command=self.tree.yview)
        
        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)
        
        # Right: Editor Form
        form_frame = ctk.CTkFrame(body_frame, width=320, corner_radius=10)
        form_frame.pack(side="right", fill="y")
        
        ctk.CTkLabel(form_frame, text="Personel Ekle/Düzenle", font=ctk.CTkFont(weight="bold", size=15)).pack(pady=12)
        
        ctk.CTkLabel(form_frame, text="Ad Soyad:").pack(anchor="w", padx=15)
        self.ent_ad = ctk.CTkComboBox(form_frame, width=270, values=[])
        self.ent_ad.pack(padx=15, pady=(0, 10))
        self.ent_ad.set("")
        self.ent_ad._entry.bind("<KeyRelease>", self.on_ad_key)
        self.all_names = []
        
        ctk.CTkLabel(form_frame, text="Ünvan:").pack(anchor="w", padx=15)
        self.cb_unvan = ctk.CTkComboBox(form_frame, values=[], width=270)
        self.cb_unvan.pack(padx=15, pady=(0, 10))
        self.cb_unvan.set("")
        self.cb_unvan._entry.bind("<KeyRelease>", self.on_unvan_key)
        self.all_unvanlar = []
        
        ctk.CTkLabel(form_frame, text="Birim:").pack(anchor="w", padx=15)
        self.cb_birim = ctk.CTkComboBox(form_frame, values=[], width=270)
        self.cb_birim.pack(padx=15, pady=(0, 12))
        self.cb_birim.set("")
        self.cb_birim._entry.bind("<KeyRelease>", self.on_birim_key)
        self.all_birimler = []
        
        # Hedef Dönem Seçimi
        ctk.CTkLabel(form_frame, text="Hedef Dönem (Yıl / Ay):", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=15)
        hedef_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
        hedef_frame.pack(fill="x", padx=15, pady=(0, 12))
        
        self.form_yil = ctk.CTkComboBox(hedef_frame, values=[], width=110)
        self.form_yil.pack(side="left", padx=(0, 10))
        self.form_ay = ctk.CTkComboBox(hedef_frame, values=[str(i) for i in range(1, 13)], width=90)
        self.form_ay.pack(side="left")
        
        btn_add_new = ctk.CTkButton(form_frame, text="➕ Yeni Kişi / Birim Ekle", command=self.add_new_record, fg_color="#27AE60", hover_color="#2ecc71", width=220, corner_radius=8)
        btn_add_new.pack(pady=4)
        
        btn_update = ctk.CTkButton(form_frame, text="✏️ Seçiliyi Güncelle", command=self.update_record, fg_color="#2980b9", hover_color="#3498db", width=220, corner_radius=8)
        btn_update.pack(pady=4)
        
        btn_delete = ctk.CTkButton(form_frame, text="🗑️ Seçiliyi Sil", command=self.delete_record, fg_color="#C0392B", hover_color="#E74C3C", width=220, corner_radius=8)
        btn_delete.pack(pady=4)
        
        btn_clear = ctk.CTkButton(form_frame, text="↺ Formu Temizle", command=self.clear_form, fg_color="#7f8c8d", hover_color="#95a5a6", width=220, corner_radius=8)
        btn_clear.pack(pady=15)

    def handle_autocomplete(self, event, combobox, all_values):
        if event.keysym in ['Up', 'Down', 'Left', 'Right', 'Return', 'Tab', 'Escape']:
            return
            
        cursor_pos = combobox._entry.index(tk.INSERT)
        val = combobox.get().lower()
        
        if not val:
            combobox.configure(values=all_values[:20])
            return
            
        import locale
        try:
            locale.setlocale(locale.LC_COLLATE, 'turkish')
        except:
            pass
            
        filtered = [v for v in all_values if locale.strxfrm(val.lower()) in locale.strxfrm(v.lower()) or val in v.lower()]
        combobox.configure(values=filtered[:20])
        
        if filtered:
            if hasattr(combobox, '_dropdown_menu') and combobox._dropdown_menu.winfo_ismapped():
                combobox._dropdown_menu._withdraw()
            combobox._open_dropdown_menu()
            combobox._entry.focus_set()
            combobox._entry.icursor(cursor_pos)

    def on_ad_key(self, event):
        self.handle_autocomplete(event, self.ent_ad, self.all_names)
        
    def on_unvan_key(self, event):
        self.handle_autocomplete(event, self.cb_unvan, self.all_unvanlar)
        
    def on_birim_key(self, event):
        self.handle_autocomplete(event, self.cb_birim, self.all_birimler)

    def load_donemler(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("SELECT DISTINCT yil FROM Gorev WHERE yil IS NOT NULL ORDER BY yil DESC")
        yillar = [str(r[0]) for r in c.fetchall() if r[0]]
        
        if yillar:
            self.cb_yil.configure(values=yillar)
            self.cb_yil.set(yillar[0])
            self.on_top_yil_changed(yillar[0])
        
        form_yillar = [int(y) for y in yillar]
        if not form_yillar: form_yillar = [2026, 2025, 2024]
        max_yil = max(form_yillar)
        for y in range(max_yil + 1, max_yil + 4):
            form_yillar.insert(0, y)
            
        form_yillar = sorted(list(set(form_yillar)), reverse=True)
        self.form_yil.configure(values=[str(y) for y in form_yillar])
        self.form_yil.set(str(max_yil))
        
        c.execute("SELECT DISTINCT unvan FROM Gorev WHERE unvan IS NOT NULL")
        self.all_unvanlar = [r[0] for r in c.fetchall()]
        
        c.execute("SELECT DISTINCT birim FROM Gorev WHERE birim IS NOT NULL")
        self.all_birimler = [r[0] for r in c.fetchall()]
        
        c.execute("SELECT DISTINCT isim || ' ' || soyisim FROM Personel")
        self.all_names = [r[0] for r in c.fetchall() if r[0]]
        
        import locale
        try:
            locale.setlocale(locale.LC_COLLATE, 'turkish')
        except:
            pass
        self.all_names.sort(key=lambda x: locale.strxfrm(x) if hasattr(locale, 'strxfrm') else x)
        self.all_unvanlar.sort(key=lambda x: locale.strxfrm(x) if hasattr(locale, 'strxfrm') else x)
        self.all_birimler.sort(key=lambda x: locale.strxfrm(x) if hasattr(locale, 'strxfrm') else x)
        
        self.ent_ad.configure(values=self.all_names[:20])
        self.cb_unvan.configure(values=self.all_unvanlar[:20])
        self.cb_birim.configure(values=self.all_birimler[:20])
        
        conn.close()

    def on_top_yil_changed(self, secilen_yil):
        if not secilen_yil: return
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT DISTINCT ay FROM Gorev WHERE yil=? AND ay IS NOT NULL ORDER BY CAST(ay AS INTEGER) ASC", (secilen_yil,))
        aylar = [str(r[0]) for r in c.fetchall()]
        conn.close()
        
        self.cb_ay.configure(values=aylar)
        if aylar:
            self.cb_ay.set(aylar[0])
        else:
            self.cb_ay.set("")

    def load_data(self):
        yil = self.cb_yil.get()
        ay = self.cb_ay.get()
        if not yil or not ay: return
        
        self.loaded_yil = int(yil)
        self.loaded_ay = int(ay)
        
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            SELECT G.id, P.isim || ' ' || P.soyisim AS ad_soyad, G.unvan, G.birim 
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
        ''', (self.loaded_yil, self.loaded_ay))
        rows = c.fetchall()
        conn.close()
        
        birim_dict = {}
        for gid, ad_soyad, unvan, birim in rows:
            if birim not in birim_dict:
                birim_dict[birim] = []
            birim_dict[birim].append((gid, ad_soyad, unvan))
            
        import locale
        try:
            locale.setlocale(locale.LC_COLLATE, 'turkish')
        except:
            pass
            
        def birim_sort_key(b):
            b_upper = b.upper()
            if "ARŞİV" in b_upper:
                return (2, locale.strxfrm(b))
            elif "KOMİSYON" in b_upper:
                return (1, locale.strxfrm(b))
            return (0, locale.strxfrm(b))

        birim_nodes = {}
        for birim in sorted(birim_dict.keys(), key=birim_sort_key):
            node_id = self.tree.insert("", "end", text=birim, open=True, tags=("birim",))
            birim_nodes[birim] = node_id
            
            kisiler = sorted(birim_dict[birim], key=lambda x: locale.strxfrm(x[1]))
            for gid, ad_soyad, unvan in kisiler:
                self.tree.insert(node_id, "end", text=ad_soyad, values=(unvan,), tags=("kisi", gid))
            
        self.form_yil.set(str(self.loaded_yil))
        self.form_ay.set(str(self.loaded_ay))
            
        self.clear_form(clear_hedef=False)

    def on_tree_select(self, event):
        sel = self.tree.selection()
        if not sel: return
        item = sel[0]
        tags = self.tree.item(item, "tags")
        if not tags or tags[0] != "kisi":
            self.clear_form()
            return
            
        self.current_gorev_id = int(tags[1])
        ad_soyad = self.tree.item(item, "text")
        unvan = self.tree.item(item, "values")[0]
        parent_item = self.tree.parent(item)
        birim = self.tree.item(parent_item, "text")
        
        self.ent_ad.set(ad_soyad)
        self.cb_unvan.set(unvan)
        self.cb_birim.set(birim)

    def clear_form(self, clear_hedef=True):
        self.current_gorev_id = None
        self.ent_ad.set("")
        self.cb_unvan.set("")
        self.cb_birim.set("")
        if clear_hedef:
            self.form_yil.set("")
            self.form_ay.set("")
        
    def add_new_record(self):
        self._save_record(is_new=True)

    def update_record(self):
        if not self.current_gorev_id:
            messagebox.showwarning("Uyarı", "Lütfen güncellenecek kaydı soldaki listeden seçin.", parent=self)
            return
        self._save_record(is_new=False)

    def _save_record(self, is_new=False):
        hedef_yil = self.form_yil.get().strip()
        hedef_ay = self.form_ay.get().strip()
        
        if not hedef_yil or not hedef_ay:
            messagebox.showwarning("Uyarı", "Lütfen Hedef Dönem (Yıl ve Ay) alanlarını doldurun.", parent=self)
            return
            
        ad_soyad = self.ent_ad.get().strip()
        unvan = self.cb_unvan.get().strip()
        birim = self.cb_birim.get().strip()
        
        if not ad_soyad or not birim:
            messagebox.showwarning("Uyarı", "Ad Soyad ve Birim alanları zorunludur.", parent=self)
            return
            
        parts = ad_soyad.split()
        if len(parts) >= 2:
            isim = " ".join(parts[:-1])
            soyisim = parts[-1]
        else:
            isim = ad_soyad
            soyisim = ""
            
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("SELECT id FROM Personel WHERE isim = ? AND soyisim = ?", (isim, soyisim))
        p_row = c.fetchone()
        if p_row:
            p_id = p_row[0]
        else:
            c.execute("INSERT INTO Personel (isim, soyisim) VALUES (?, ?)", (isim, soyisim))
            p_id = c.lastrowid
            
        dosya_adi = f"El_ile_Eklenen_{hedef_yil}_{hedef_ay}.pdf"
            
        if not is_new and self.current_gorev_id:
            c.execute('''UPDATE Gorev SET personel_id=?, unvan=?, birim=?, yil=?, ay=? WHERE id=?''', 
                      (p_id, unvan, birim, hedef_yil, hedef_ay, self.current_gorev_id))
        else:
            c.execute("SELECT id FROM Gorev WHERE personel_id=? AND yil=? AND ay=?", (p_id, hedef_yil, hedef_ay))
            if c.fetchone():
                if not messagebox.askyesno("Uyarı", "Bu kişi hedef dönemde zaten var! Yine de eklensin mi?", parent=self):
                    conn.close()
                    return
            c.execute('''INSERT INTO Gorev (personel_id, dosya_adi, yil, ay, unvan, birim) 
                         VALUES (?, ?, ?, ?, ?, ?)''', 
                      (p_id, dosya_adi, hedef_yil, hedef_ay, unvan, birim))
                      
        conn.commit()
        conn.close()
        
        self.load_donemler()
        self.cb_yil.set(hedef_yil)
        self.on_top_yil_changed(hedef_yil)
        self.cb_ay.set(hedef_ay)
        self.load_data()
        
    def delete_record(self):
        if not self.current_gorev_id:
            messagebox.showwarning("Uyarı", "Silinecek personeli tablodan seçin.", parent=self)
            return
        if messagebox.askyesno("Onay", "Seçili personel kaydı bu dönemden silinecek. Onaylıyor musunuz?", parent=self):
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute("DELETE FROM Gorev WHERE id=?", (self.current_gorev_id,))
            conn.commit()
            conn.close()
            self.load_data()

    def generate_pdf(self):
        if not self.loaded_yil or not self.loaded_ay:
            messagebox.showwarning("Uyarı", "Lütfen önce bir dönem seçin ve verileri yükleyin.", parent=self)
            return
            
        output_html = os.path.join(os.path.dirname(self.db_path), f"Rapor_{self.loaded_yil}_{self.loaded_ay}.html")
        try:
            import importlib
            import pdf_generator
            importlib.reload(pdf_generator)
            pdf_generator.generate_pdf_html(self.db_path, self.loaded_yil, self.loaded_ay, output_html)
        except Exception as e:
            messagebox.showerror("Hata", f"PDF oluşturulurken hata: {str(e)}", parent=self)

class PDFEditorWindow(ctk.CTkToplevel):
    def __init__(self, parent, db_path):
        super().__init__(parent)
        self.title("PDF Düzenleyici ve Çıktı Alma Ekranı")
        self.geometry("1000x700")
        self.db_path = db_path
        self.transient(parent)
        self.focus_set()
        
        self.frame = PDFEditorFrame(self, db_path)
        self.frame.pack(fill="both", expand=True, padx=10, pady=10)

def show_pdf_editor(parent, db_path):
    PDFEditorWindow(parent, db_path)
