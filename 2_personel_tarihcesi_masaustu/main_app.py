import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import customtkinter as ctk
import sqlite3
import os
import sys
import shutil
import threading

# If running as a PyInstaller bundle, copy the database to working dir
bundled_db = os.path.join(getattr(sys, '_MEIPASS', os.getcwd()), "personel_veritabani.sqlite")
local_db = os.path.join(os.getcwd(), "personel_veritabani.sqlite")
if (not os.path.exists(local_db) or os.path.getsize(local_db) <= 16384) and os.path.exists(bundled_db) and bundled_db != local_db:
    shutil.copy2(bundled_db, local_db)

bundled_logo = os.path.join(getattr(sys, '_MEIPASS', os.getcwd()), "logo_0_5.png")
local_logo = os.path.join(os.getcwd(), "logo_0_5.png")
if not os.path.exists(local_logo) and os.path.exists(bundled_logo) and bundled_logo != local_logo:
    shutil.copy2(bundled_logo, local_logo)

import extract_to_db
import export_to_excel
import generate_reports
import generate_html_report
import color_settings
import pdf_editor_window
import db_updates
from cv_management_window import CVManagementFrame, CVManagementWindow

DB_PATH = local_db
EXCEL_PATH_PERSONEL = os.path.join(os.getcwd(), "Personel_Raporu.xlsx")
EXCEL_PATH_AYLIK = os.path.join(os.getcwd(), "Aylik_Cikti_Raporlari.xlsx")

ctk.set_appearance_mode("System")
ctk.set_default_color_theme("blue")

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("🏢 Personel Raporu & Özgeçmiş Yönetim Merkezi")
        self.geometry("1450x850")
        
        if not os.path.exists(DB_PATH):
            extract_to_db.init_db(DB_PATH).close()

        # Run database deduplication on startup
        db_updates.clean_duplicate_records(DB_PATH)

        self.sort_col = "G.yil"
        self.sort_desc = True
        self.current_view = "cv"

        # Grid configuration for main window layout
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=1)

        self.create_dashboard_layout()
        self.update_filter_lists()
        self.load_data()
        self.select_view("cv")

    def create_dashboard_layout(self):
        # ==========================================
        # 1. LEFT NAVIGATION SIDEBAR
        # ==========================================
        self.nav_sidebar = ctk.CTkFrame(self, width=220, corner_radius=0, fg_color="#1e293b")
        self.nav_sidebar.grid(row=0, column=0, sticky="nsew")
        self.nav_sidebar.grid_rowconfigure(7, weight=1)

        # App Brand Header
        lbl_logo = ctk.CTkLabel(
            self.nav_sidebar, 
            text="🏢 PERSONEL SİSTEMİ", 
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="white"
        )
        lbl_logo.grid(row=0, column=0, padx=20, pady=(25, 5), sticky="w")

        lbl_sub = ctk.CTkLabel(
            self.nav_sidebar, 
            text="Tek Merkezi Yönetim Hub", 
            font=ctk.CTkFont(size=11),
            text_color="#94a3b8"
        )
        lbl_sub.grid(row=1, column=0, padx=20, pady=(0, 25), sticky="w")

        # Nav Buttons
        self.nav_buttons = {}
        
        nav_items = [
            ("cv", "👥 Kişiler & Özgeçmişler"),
            ("tasks", "📅 Aylık Görev Geçmişi"),
            ("analytics", "📊 Analizler & Raporlar"),
            ("tools", "📄 PDF & Excel Araçları"),
            ("settings", "🎨 Renk & Ayarlar")
        ]

        for idx, (key, label) in enumerate(nav_items, start=2):
            btn = ctk.CTkButton(
                self.nav_sidebar,
                text=label,
                anchor="w",
                height=42,
                corner_radius=8,
                font=ctk.CTkFont(size=13, weight="bold"),
                fg_color="transparent",
                text_color="#cbd5e1",
                hover_color="#334155",
                command=lambda k=key: self.select_view(k)
            )
            btn.grid(row=idx, column=0, padx=12, pady=4, sticky="ew")
            self.nav_buttons[key] = btn

        # Theme Switcher at Sidebar Bottom
        theme_frame = ctk.CTkFrame(self.nav_sidebar, fg_color="transparent")
        theme_frame.grid(row=8, column=0, padx=15, pady=20, sticky="ew")

        ctk.CTkLabel(theme_frame, text="Tema:", text_color="#94a3b8", font=ctk.CTkFont(size=12)).pack(side="left", padx=5)
        self.cmb_theme = ctk.CTkComboBox(
            theme_frame, 
            values=["System", "Dark", "Light"], 
            width=110,
            command=lambda v: ctk.set_appearance_mode(v)
        )
        self.cmb_theme.set("System")
        self.cmb_theme.pack(side="right", padx=5)

        # ==========================================
        # 2. MAIN CONTENT AREA (DYNAMIC VIEW CONTAINER)
        # ==========================================
        self.main_content = ctk.CTkFrame(self, fg_color="transparent")
        self.main_content.grid(row=0, column=1, sticky="nsew", padx=15, pady=15)
        self.main_content.grid_rowconfigure(0, weight=1)
        self.main_content.grid_columnconfigure(0, weight=1)

        # --- VIEW 1: Kişiler & Özgeçmişler ---
        self.view_cv = ctk.CTkFrame(self.main_content, fg_color="transparent")
        self.cv_frame = CVManagementFrame(self.view_cv, DB_PATH)
        self.cv_frame.pack(fill="both", expand=True)

        # --- VIEW 2: Aylık Görev Geçmişi ---
        self.view_tasks = ctk.CTkFrame(self.main_content, fg_color="transparent")
        self.create_tasks_view()

        # --- VIEW 3: Analizler & Raporlar ---
        self.view_analytics_container = ctk.CTkFrame(self.main_content, fg_color="transparent")
        self.create_analytics_view()

        # --- VIEW 4: PDF & Excel Araçları ---
        self.view_tools_container = ctk.CTkFrame(self.main_content, fg_color="transparent")
        self.create_tools_view()

        # --- VIEW 5: Renk & Ayarlar ---
        self.view_settings_container = ctk.CTkFrame(self.main_content, fg_color="transparent")
        self.create_settings_view()

    def select_view(self, view_key):
        self.current_view = view_key
        
        # Highlight active nav button
        for key, btn in self.nav_buttons.items():
            if key == view_key:
                btn.configure(fg_color="#3b82f6", text_color="white")
            else:
                btn.configure(fg_color="transparent", text_color="#cbd5e1")

        # Hide all view containers
        for view in [self.view_cv, self.view_tasks, self.view_analytics_container, self.view_tools_container, self.view_settings_container]:
            view.grid_forget()

        # Display selected view
        if view_key == "cv":
            self.view_cv.grid(row=0, column=0, sticky="nsew")
            self.cv_frame.load_data()
        elif view_key == "tasks":
            self.view_tasks.grid(row=0, column=0, sticky="nsew")
            self.load_data()
        elif view_key == "analytics":
            self.view_analytics_container.grid(row=0, column=0, sticky="nsew")
        elif view_key == "tools":
            self.view_tools_container.grid(row=0, column=0, sticky="nsew")
        elif view_key == "settings":
            self.view_settings_container.grid(row=0, column=0, sticky="nsew")

    # ==========================================
    # VIEW BUILDERS
    # ==========================================
    def create_tasks_view(self):
        self.view_tasks.grid_rowconfigure(1, weight=1)
        self.view_tasks.grid_columnconfigure(1, weight=1)

        # Filter Sidebar on the left of tasks view
        self.sidebar = ctk.CTkScrollableFrame(self.view_tasks, width=220, corner_radius=10)
        self.sidebar.grid(row=0, column=0, rowspan=3, sticky="nsew", padx=(0, 10))

        ctk.CTkLabel(self.sidebar, text="🔍 Görev Filtreleri", font=ctk.CTkFont(size=16, weight="bold")).grid(row=0, column=0, padx=15, pady=(15, 10))

        self.flt_tarih = ctk.CTkComboBox(self.sidebar, values=["Dosya / Tarih"])
        self.flt_tarih.set("Dosya / Tarih")
        self.flt_tarih.grid(row=1, column=0, padx=15, pady=8, sticky="ew")

        self.flt_isim = ctk.CTkEntry(self.sidebar, placeholder_text="İsim")
        self.flt_isim.grid(row=2, column=0, padx=15, pady=8, sticky="ew")

        self.flt_soyisim = ctk.CTkEntry(self.sidebar, placeholder_text="Soyisim")
        self.flt_soyisim.grid(row=3, column=0, padx=15, pady=8, sticky="ew")

        self.flt_unvan = ctk.CTkComboBox(self.sidebar, values=["Unvan"])
        self.flt_unvan.set("Unvan")
        self.flt_unvan.grid(row=4, column=0, padx=15, pady=8, sticky="ew")

        self.flt_birim = ctk.CTkComboBox(self.sidebar, values=["Birim"])
        self.flt_birim.set("Birim")
        self.flt_birim.grid(row=5, column=0, padx=15, pady=8, sticky="ew")

        # Komisyon Filtresi (Tüm Görevler / Komisyonları Gizle / Sadece Komisyonlar)
        ctk.CTkLabel(self.sidebar, text="Komisyon Filtresi", font=ctk.CTkFont(size=12, weight="bold")).grid(row=6, column=0, padx=15, pady=(8, 2), sticky="w")
        self.cmb_komisyon_mode = ctk.CTkComboBox(self.sidebar, values=["Tüm Görevler", "Komisyonları Gizle", "Sadece Komisyonlar"])
        self.cmb_komisyon_mode.set("Tüm Görevler")
        self.cmb_komisyon_mode.grid(row=7, column=0, padx=15, pady=(0, 8), sticky="ew")

        btn_apply = ctk.CTkButton(self.sidebar, text="🔍 Filtrele", command=self.load_data, fg_color="#3b82f6")
        btn_apply.grid(row=8, column=0, padx=15, pady=(10, 5), sticky="ew")
        
        btn_clear_flt = ctk.CTkButton(self.sidebar, text="↺ Temizle", command=self.clear_filters, fg_color="gray")
        btn_clear_flt.grid(row=9, column=0, padx=15, pady=(5, 10), sticky="ew")

        # Column selectors
        ctk.CTkLabel(self.sidebar, text="Sütunlar", font=ctk.CTkFont(size=14, weight="bold")).grid(row=10, column=0, padx=15, pady=(15, 5))
        
        self.col_vars = {}
        cols_info = [
            ("id", "G.ID"), ("yil", "Yıl"), ("ay", "Ay"), 
            ("dosya_adi", "Dosya"), ("isim", "İsim"), ("soyisim", "Soyisim"), 
            ("unvan", "Unvan"), ("birim", "Birim")
        ]
        
        cols_frame = ctk.CTkFrame(self.sidebar, fg_color="transparent")
        cols_frame.grid(row=11, column=0, padx=5, pady=5, sticky="ew")
        
        for i, (col_id, col_text) in enumerate(cols_info):
            var = ctk.IntVar(value=1)
            self.col_vars[col_id] = var
            chk = ctk.CTkCheckBox(cols_frame, text=col_text, variable=var, command=self.update_columns)
            chk.grid(row=i // 2, column=i % 2, padx=3, pady=3, sticky="w")

        # Top Action Row for Tasks View
        top_task_bar = ctk.CTkFrame(self.view_tasks, fg_color="transparent")
        top_task_bar.grid(row=0, column=1, sticky="ew", pady=(0, 10))

        btn_add_folder = ctk.CTkButton(top_task_bar, text="📁 Klasörden PDF Yükle", command=self.add_from_folder, fg_color="#10b981", hover_color="#059669", corner_radius=8)
        btn_add_folder.pack(side="left", padx=5)

        btn_add_files = ctk.CTkButton(top_task_bar, text="📄 Tekil PDF Yükle", command=self.add_from_files, fg_color="#3b82f6", hover_color="#2563eb", corner_radius=8)
        btn_add_files.pack(side="left", padx=5)
        
        btn_remove_file = ctk.CTkButton(top_task_bar, text="🗑️ Rapor Dosyası Sil", command=self.open_remove_file_window, fg_color="#ef4444", hover_color="#dc2626", corner_radius=8)
        btn_remove_file.pack(side="left", padx=5)

        btn_export_filtered = ctk.CTkButton(top_task_bar, text="📄 Filtrelenen Listeyi Çıktı Al", command=self.export_filtered_tasks, fg_color="#f59e0b", hover_color="#d97706", corner_radius=8, font=ctk.CTkFont(weight="bold"))
        btn_export_filtered.pack(side="right", padx=5)

        # Task Data Grid
        grid_frame = ctk.CTkFrame(self.view_tasks)
        grid_frame.grid(row=1, column=1, sticky="nsew")
        grid_frame.grid_rowconfigure(0, weight=1)
        grid_frame.grid_columnconfigure(0, weight=1)

        style = ttk.Style()
        style.theme_use("default")
        
        tree_scroll = ctk.CTkScrollbar(grid_frame)
        tree_scroll.grid(row=0, column=1, sticky="ns")
        
        columns = ("id", "yil", "ay", "dosya_adi", "isim", "soyisim", "unvan", "birim", "personel_id")
        self.tree = ttk.Treeview(grid_frame, columns=columns, show="headings", yscrollcommand=tree_scroll.set)
        
        headings = [("id", "G.ID"), ("yil", "Yıl"), ("ay", "Ay"), 
                    ("dosya_adi", "Dosya Adı"), ("isim", "İsim"), ("soyisim", "Soyisim"), 
                    ("unvan", "Unvan"), ("birim", "Birim")]
        
        for col, text in headings:
            db_col = f"G.{col}" if col in ['id', 'yil', 'ay', 'dosya_adi', 'unvan', 'birim'] else f"P.{col}"
            self.tree.heading(col, text=text, command=lambda c=db_col: self.sort_column(c))
            
        self.tree.column("id", width=50, anchor="center")
        self.tree.column("yil", width=60, anchor="center")
        self.tree.column("ay", width=50, anchor="center")
        self.tree.column("dosya_adi", width=120, anchor="center")
        self.tree.column("isim", width=140)
        self.tree.column("soyisim", width=140)
        self.tree.column("unvan", width=180)
        self.tree.column("birim", width=220)
        self.tree.column("personel_id", width=0, stretch=tk.NO)
        
        self.tree.grid(row=0, column=0, sticky="nsew")
        tree_scroll.configure(command=self.tree.yview)
        self.tree.bind("<<TreeviewSelect>>", self.on_select)

        self.lbl_count = ctk.CTkLabel(grid_frame, text="Toplam 0 Kayıt", text_color="gray")
        self.lbl_count.grid(row=1, column=0, sticky="w", padx=5, pady=2)

        # Bottom Edit Area
        edit_frame = ctk.CTkFrame(self.view_tasks)
        edit_frame.grid(row=2, column=1, sticky="ew", pady=(10, 0))
        self.edit_frame = edit_frame
        
        ctk.CTkLabel(edit_frame, text="Yıl:").grid(row=0, column=0, padx=4, pady=4, sticky="e")
        self.ent_yil = ctk.CTkEntry(edit_frame, width=70)
        self.ent_yil.grid(row=0, column=1, padx=4, pady=4, sticky="w")
        
        ctk.CTkLabel(edit_frame, text="Ay:").grid(row=0, column=2, padx=4, pady=4, sticky="e")
        self.ent_ay = ctk.CTkEntry(edit_frame, width=70)
        self.ent_ay.grid(row=0, column=3, padx=4, pady=4, sticky="w")
        
        ctk.CTkLabel(edit_frame, text="Dosya:").grid(row=0, column=4, padx=4, pady=4, sticky="e")
        self.ent_dosya = ctk.CTkEntry(edit_frame, width=140)
        self.ent_dosya.grid(row=0, column=5, padx=4, pady=4, sticky="w")

        ctk.CTkLabel(edit_frame, text="İsim:").grid(row=1, column=0, padx=4, pady=4, sticky="e")
        self.ent_isim = ctk.CTkEntry(edit_frame, width=140)
        self.ent_isim.grid(row=1, column=1, columnspan=2, padx=4, pady=4, sticky="w")

        ctk.CTkLabel(edit_frame, text="Soyisim:").grid(row=1, column=3, padx=4, pady=4, sticky="e")
        self.ent_soyisim = ctk.CTkEntry(edit_frame, width=140)
        self.ent_soyisim.grid(row=1, column=4, columnspan=2, padx=4, pady=4, sticky="w")
        
        ctk.CTkLabel(edit_frame, text="Unvan:").grid(row=2, column=0, padx=4, pady=4, sticky="e")
        self.ent_unvan = ctk.CTkEntry(edit_frame, width=180)
        self.ent_unvan.grid(row=2, column=1, columnspan=3, padx=4, pady=4, sticky="w")
        
        ctk.CTkLabel(edit_frame, text="Birim:").grid(row=2, column=4, padx=4, pady=4, sticky="e")
        self.ent_birim = ctk.CTkEntry(edit_frame, width=220)
        self.ent_birim.grid(row=2, column=5, columnspan=2, padx=4, pady=4, sticky="w")
        
        btn_frame = ctk.CTkFrame(edit_frame, fg_color="transparent")
        btn_frame.grid(row=3, column=0, columnspan=8, pady=8)
        
        self.btn_update = ctk.CTkButton(btn_frame, text="✏️ Güncelle", command=self.update_record, fg_color="#27AE60", hover_color="#2ecc71", corner_radius=8, width=120)
        self.btn_update.pack(side="left", padx=5)
        
        self.btn_add_new = ctk.CTkButton(btn_frame, text="➕ Yeni Görev Ekle", command=self.add_new_record, fg_color="#2980B9", hover_color="#3498DB", corner_radius=8, width=130)
        self.btn_add_new.pack(side="left", padx=5)
        
        self.btn_delete = ctk.CTkButton(btn_frame, text="🗑️ Görevi Sil", command=self.delete_record, fg_color="#C0392B", hover_color="#E74C3C", corner_radius=8, width=110)
        self.btn_delete.pack(side="left", padx=5)
        
        self.btn_clear = ctk.CTkButton(btn_frame, text="↺ Temizle", command=self.btn_clear_clicked, fg_color="#7f8c8d", hover_color="#95a5a6", corner_radius=8, width=100)
        self.btn_clear.pack(side="left", padx=5)

        self.lbl_status = ctk.CTkLabel(edit_frame, text="Durum: Hazır", text_color="gray")
        self.lbl_status.grid(row=4, column=0, columnspan=8, sticky="w", padx=10)

    def create_analytics_view(self):
        card = ctk.CTkFrame(self.view_analytics_container, corner_radius=12)
        card.pack(fill="both", expand=True, padx=20, pady=20)

        lbl = ctk.CTkLabel(card, text="📊 Gelişmiş Analizler & Dikey Baskı Çıktıları", font=ctk.CTkFont(size=22, weight="bold"))
        lbl.pack(pady=(30, 10))

        sub = ctk.CTkLabel(card, text="İnteraktif web raporunda personelleri tek tek süzebilir ve Dikey (Portrait) formatta baskı çıktısı alabilirsiniz.", font=ctk.CTkFont(size=13), text_color="gray")
        sub.pack(pady=(0, 25))

        btn_open_web = ctk.CTkButton(
            card, 
            text="🌐 İnteraktif Analiz Raporunu Aç (Web / Dikey Baskı)", 
            command=self.open_analytics,
            fg_color="#3b82f6",
            hover_color="#2563eb",
            font=ctk.CTkFont(size=14, weight="bold"),
            height=45,
            width=320,
            corner_radius=10
        )
        btn_open_web.pack(pady=15)

    def create_tools_view(self):
        top_bar = ctk.CTkFrame(self.view_tools_container, fg_color="transparent")
        top_bar.pack(fill="x", padx=5, pady=(0, 10))

        btn_excel_exp = ctk.CTkButton(
            top_bar, 
            text="📊 Excel Raporlarını Oluştur (Tüm Liste & Aylık)", 
            command=self.export_excel,
            fg_color="#f59e0b",
            hover_color="#d97706",
            font=ctk.CTkFont(size=12, weight="bold"),
            height=36,
            corner_radius=8
        )
        btn_excel_exp.pack(side="right", padx=5)

        # Directly embed PDFEditorFrame inside tab view
        self.pdf_editor_frame = pdf_editor_window.PDFEditorFrame(self.view_tools_container, DB_PATH)
        self.pdf_editor_frame.pack(fill="both", expand=True)

    def create_settings_view(self):
        card = ctk.CTkFrame(self.view_settings_container, corner_radius=12)
        card.pack(fill="both", expand=True, padx=20, pady=20)

        lbl = ctk.CTkLabel(card, text="🎨 Renk & Veritabanı Sistem Ayarları", font=ctk.CTkFont(size=22, weight="bold"))
        lbl.pack(pady=(30, 10))

        btn_colors = ctk.CTkButton(
            card, 
            text="🎨 Birim Renk Kodlarını Düzenle", 
            command=self.open_color_settings,
            fg_color="#6366f1",
            hover_color="#4f46e5",
            font=ctk.CTkFont(size=14, weight="bold"),
            height=42,
            width=280,
            corner_radius=10
        )
        btn_colors.pack(pady=15)

        def run_dedup():
            db_updates.clean_duplicate_records(DB_PATH)
            messagebox.showinfo("Başarılı", "Veritabanındaki tüm mükerrer kayıtlar taranıp temizlendi.", parent=self)
            self.load_data()

        btn_dedup = ctk.CTkButton(
            card, 
            text="🧹 Mükerrer Veritabanı Kayıtlarını Temizle", 
            command=run_dedup,
            fg_color="#ef4444",
            hover_color="#dc2626",
            font=ctk.CTkFont(size=14, weight="bold"),
            height=42,
            width=280,
            corner_radius=10
        )
        btn_dedup.pack(pady=10)

    # ==========================================
    # LOGIC & DATABASE HANDLERS (ALL PRESERVED)
    # ==========================================
    def add_from_folder(self):
        folder = filedialog.askdirectory(title="Aylık Rapor PDF Klasörünü Seçin")
        if folder:
            def task():
                try:
                    conn = sqlite3.connect(DB_PATH)
                    extract_to_db.process_pdfs(conn, folder, callback=self.log)
                    conn.close()
                    self.update_filter_lists()
                    self.load_data()
                    self.log("Klasördeki tüm PDF'ler başarıyla veritabanına aktarıldı.")
                    messagebox.showinfo("Başarılı", "Klasördeki PDF'ler aktarıldı.")
                except Exception as e:
                    messagebox.showerror("Hata", str(e))
            self.run_async(task)

    def add_from_files(self):
        files = filedialog.askopenfilenames(title="Aylık Rapor PDF Dosyalarını Seçin", filetypes=[("PDF Dosyaları", "*.pdf")])
        if files:
            def task():
                try:
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    for filepath in files:
                        filename = os.path.basename(filepath)
                        self.log(f"İşleniyor: {filename}")
                        yil, ay = extract_to_db.extract_year_month(filename)
                        extract_to_db.process_single_pdf(filepath, filename, yil, ay, cursor)
                    conn.commit()
                    conn.close()
                    self.update_filter_lists()
                    self.load_data()
                    self.log("Seçilen PDF'ler başarıyla aktarıldı.")
                    messagebox.showinfo("Başarılı", "PDF'ler aktarıldı.")
                except Exception as e:
                    messagebox.showerror("Hata", str(e))
            self.run_async(task)

    def open_remove_file_window(self):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT DISTINCT dosya_adi FROM Gorev ORDER BY dosya_adi")
        files = [row[0] for row in c.fetchall() if row[0]]
        conn.close()

        if not files:
            messagebox.showinfo("Bilgi", "Veritabanında kayıtlı dosya bulunmamaktadır.")
            return

        dialog = ctk.CTkToplevel(self)
        dialog.title("Aylık Rapor Sil")
        dialog.geometry("400x200")
        dialog.transient(self)
        dialog.grab_set()

        ctk.CTkLabel(dialog, text="Veritabanından silmek istediğiniz dosyayı seçin:").pack(pady=10)
        cmb_files = ctk.CTkComboBox(dialog, values=files, width=250)
        cmb_files.pack(pady=10)

        def confirm_remove():
            selected_file = cmb_files.get()
            if messagebox.askyesno("Onay", f"'{selected_file}' dosyasına ait tüm görev kayıtları silinecek. Emin misiniz?"):
                self.run_async(self._remove_file, selected_file, dialog)

        ctk.CTkButton(dialog, text="Sil", command=confirm_remove, fg_color="#C0392B", hover_color="#E74C3C").pack(pady=10)

    def _remove_file(self, filename, dialog):
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("DELETE FROM Gorev WHERE dosya_adi=?", (filename,))
            conn.commit()
            conn.close()
            self.update_filter_lists()
            self.load_data()
            self.log(f"'{filename}' dosyası ve tüm görev kayıtları başarıyla silindi.")
            dialog.destroy()
        except Exception as e:
            messagebox.showerror("Hata", str(e))

    def export_excel(self):
        self.run_async(self._export_excel)

    def _export_excel(self):
        try:
            self.log("Personel Raporu oluşturuluyor...")
            export_to_excel.export_data(DB_PATH, EXCEL_PATH_PERSONEL, callback=self.log)
            self.log("Aylık Çıktı Raporları oluşturuluyor...")
            generate_reports.generate_monthly_reports(DB_PATH, EXCEL_PATH_AYLIK, callback=self.log)
            self.log("Tüm Excel raporları başarıyla oluşturuldu!")
            messagebox.showinfo("Başarılı", f"Raporlar oluşturuldu:\n\n{EXCEL_PATH_PERSONEL}\n{EXCEL_PATH_AYLIK}")
        except PermissionError:
            msg = "Excel dosyaları arka planda açık! Lütfen Excel dosyalarını kapatıp tekrar deneyin."
            self.log(msg)
            messagebox.showerror("Hata", msg)
        except Exception as e:
            messagebox.showerror("Hata", str(e))
            self.log("Rapor oluşturma hatası.")

    def open_analytics(self):
        self.log("İnteraktif Web Raporu hazırlanıyor, tarayıcınız açılacak...")
        html_path = os.path.join(os.getcwd(), "Analiz_Raporu.html")
        try:
            generate_html_report.generate_report(DB_PATH, html_path)
            self.log("İnteraktif rapor tarayıcıda açıldı.")
        except Exception as e:
            messagebox.showerror("Hata", f"Rapor oluşturulurken hata: {e}")
            self.log("Rapor oluşturma hatası.")

    def open_color_settings(self):
        color_settings.show_color_settings_window(self, DB_PATH)

    def open_pdf_editor(self):
        pdf_editor_window.show_pdf_editor(self, DB_PATH)

    def clear_fields(self):
        for ent in [self.ent_yil, self.ent_ay, self.ent_dosya, self.ent_isim, self.ent_soyisim, self.ent_unvan, self.ent_birim]:
            ent.delete(0, tk.END)

    def btn_clear_clicked(self):
        self.clear_fields()
        self.tree.selection_remove(self.tree.selection())

    def on_select(self, event):
        selected = self.tree.focus()
        if not selected: return
        values = self.tree.item(selected, 'values')
        if not values: return
        
        self.clear_fields()
        self.ent_yil.insert(0, values[1])
        self.ent_ay.insert(0, values[2])
        self.ent_dosya.insert(0, values[3])
        self.ent_isim.insert(0, values[4])
        self.ent_soyisim.insert(0, values[5])
        self.ent_unvan.insert(0, values[6])
        self.ent_birim.insert(0, values[7])

    def get_input_values(self):
        return (
            self.ent_dosya.get().strip(),
            self.ent_yil.get().strip(),
            self.ent_ay.get().strip(),
            self.ent_isim.get().strip(),
            self.ent_soyisim.get().strip(),
            self.ent_unvan.get().strip(),
            self.ent_birim.get().strip()
        )

    def update_record(self):
        selected = self.tree.focus()
        if not selected:
            messagebox.showwarning("Uyarı", "Lütfen güncellenecek kaydı seçin.")
            return
            
        values = self.tree.item(selected, 'values')
        gorev_id = values[0]
        personel_id = values[8]
        
        dosya, yil, ay, isim, soyisim, unvan, birim = self.get_input_values()
        
        if not (isim and unvan and birim and yil and ay):
            messagebox.showwarning("Uyarı", "Gerekli alanlar boş bırakılamaz!")
            return
            
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            
            c.execute("UPDATE Personel SET isim=?, soyisim=? WHERE id=?", (isim, soyisim, personel_id))
            
            komisyon_keywords = ['KOMİSYON', 'KOMİTE', 'KURUL', 'SORUMLULARI']
            is_komisyon = any(k in birim.upper() for k in komisyon_keywords)
            
            c.execute("""
                UPDATE Gorev 
                SET dosya_adi=?, yil=?, ay=?, unvan=?, birim=?, is_komisyon=?
                WHERE id=?
            """, (dosya, yil, ay, unvan, birim, is_komisyon, gorev_id))
            
            conn.commit()
            conn.close()
            self.update_filter_lists()
            self.load_data()
            self.log(f"{isim} {soyisim} kaydı güncellendi.")
        except Exception as e:
            messagebox.showerror("Hata", str(e))

    def add_new_record(self):
        dosya, yil, ay, isim, soyisim, unvan, birim = self.get_input_values()
        isim = isim.strip()
        soyisim = soyisim.strip()
        unvan = unvan.strip()
        birim = birim.strip()
        
        if not (isim and unvan and birim and yil and ay):
            messagebox.showwarning("Uyarı", "Gerekli alanları doldurunuz!")
            return
            
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            
            c.execute("SELECT id FROM Personel WHERE LOWER(TRIM(isim))=LOWER(?) AND LOWER(TRIM(soyisim))=LOWER(?)", (isim, soyisim))
            row = c.fetchone()
            if row:
                personel_id = row[0]
            else:
                c.execute("INSERT INTO Personel (isim, soyisim) VALUES (?, ?)", (isim, soyisim))
                personel_id = c.lastrowid
                
            c.execute("SELECT id FROM Gorev WHERE personel_id=? AND yil=? AND ay=? AND birim=?", (personel_id, yil, ay, birim))
            existing_task = c.fetchone()
            if existing_task:
                conn.close()
                messagebox.showwarning("Mükerrer Kayıt", f"'{isim} {soyisim}' personeline ait {yil}/{ay} döneminde '{birim}' biriminde zaten bir görev kaydı bulunmaktadır!")
                return

            komisyon_keywords = ['KOMİSYON', 'KOMİTE', 'KURUL', 'SORUMLULARI']
            is_komisyon = any(k in birim.upper() for k in komisyon_keywords)
            
            c.execute("""
                INSERT INTO Gorev (personel_id, dosya_adi, yil, ay, unvan, birim, is_komisyon)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (personel_id, dosya, yil, ay, unvan, birim, is_komisyon))
            conn.commit()
            conn.close()
            self.update_filter_lists()
            self.load_data()
            self.log("Yeni kayıt başarıyla eklendi.")
        except Exception as e:
            messagebox.showerror("Hata", str(e))

    def delete_record(self):
        selected = self.tree.focus()
        if not selected:
            messagebox.showwarning("Uyarı", "Lütfen silinecek kaydı seçin.")
            return
            
        if messagebox.askyesno("Onay", "Seçili GÖREV kaydını silmek istediğinize emin misiniz?"):
            gorev_id = self.tree.item(selected, 'values')[0]
            try:
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("DELETE FROM Gorev WHERE id=?", (gorev_id,))
                conn.commit()
                conn.close()
                self.clear_fields()
                self.update_filter_lists()
                self.load_data()
                self.log("Görev kaydı başarıyla silindi.")
            except Exception as e:
                messagebox.showerror("Hata", str(e))

    def run_async(self, target, *args):
        t = threading.Thread(target=target, args=args)
        t.daemon = True
        t.start()

    def sort_column(self, col):
        if self.sort_col == col:
            self.sort_desc = not self.sort_desc
        else:
            self.sort_col = col
            self.sort_desc = True
        self.load_data()

    def update_columns(self):
        display_cols = [col for col, var in self.col_vars.items() if var.get() == 1]
        display_cols.append("personel_id")
        self.tree["displaycolumns"] = display_cols

    def clear_filters(self):
        self.flt_tarih.set("Dosya / Tarih")
        self.flt_isim.delete(0, tk.END)
        self.flt_soyisim.delete(0, tk.END)
        self.flt_unvan.set("Unvan")
        self.flt_birim.set("Birim")
        self.cmb_komisyon_mode.set("Tüm Görevler")
        self.load_data()

    def export_filtered_tasks(self):
        items = self.tree.get_children()
        if not items:
            messagebox.showwarning("Uyarı", "Listede çıktı alınacak görev kaydı bulunmuyor.", parent=self)
            return
            
        rows_data = []
        for item in items:
            vals = self.tree.item(item, 'values')
            rows_data.append({
                "G.ID": vals[0],
                "Yıl": vals[1],
                "Ay": vals[2],
                "Dosya Adı": vals[3],
                "Ad Soyad": f"{vals[4]} {vals[5]}",
                "Unvan": vals[6],
                "Birim": vals[7]
            })
            
        import pandas as pd
        df_export = pd.DataFrame(rows_data)
        
        export_excel_path = os.path.join(os.getcwd(), "Aylik_Gorev_Filtreli_Cikti.xlsx")
        try:
            df_export.to_excel(export_excel_path, index=False)
        except PermissionError:
            messagebox.showerror("Hata", "Aylik_Gorev_Filtreli_Cikti.xlsx dosyası açık! Lütfen dosyayı kapatıp tekrar deneyin.", parent=self)
            return

        html_print_path = os.path.join(os.getcwd(), "Filtreli_Gorev_Listesi_Cikti.html")
        table_rows_html = ""
        for idx, r in enumerate(rows_data, 1):
            table_rows_html += f"""
            <tr>
                <td style="text-align:center;">{idx}</td>
                <td style="text-align:center;"><span class="badge">{r['Yıl']}_{str(r['Ay']).zfill(2)}</span></td>
                <td><strong>{r['Ad Soyad']}</strong></td>
                <td>{r['Unvan']}</td>
                <td>{r['Birim']}</td>
                <td style="font-size:9pt; color:#666;">{r['Dosya Adı']}</td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Filtreli Görev Listesi Çıktısı</title>
            <style>
                @page {{ size: portrait; margin: 12mm; }}
                body {{ font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11pt; margin: 0; padding: 20px; }}
                .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }}
                .title {{ font-size: 16pt; font-weight: bold; color: #1e293b; }}
                .badge {{ background: #3b82f6; color: white; padding: 3px 7px; border-radius: 4px; font-size: 9pt; font-weight: bold; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                th {{ background-color: #1e293b; color: white; padding: 8px; text-align: left; font-size: 10pt; }}
                td {{ padding: 6px 8px; border-bottom: 1px solid #cbd5e1; font-size: 10pt; }}
                tr:nth-child(even) {{ background-color: #f8fafc; }}
                .no-print {{ margin-bottom: 15px; }}
                @media print {{ .no-print {{ display: none !important; }} }}
            </style>
        </head>
        <body>
            <div class="no-print">
                <button onclick="window.print()" style="background:#10b981; color:white; border:none; padding:10px 20px; font-size:12pt; border-radius:6px; cursor:pointer; font-weight:bold;">
                    🖨️ Sayfayı Yazdır (Dikey A4)
                </button>
                <span style="margin-left: 15px; color:#666;">(Excel dosyası kaydedildi: {export_excel_path})</span>
            </div>
            <div class="header">
                <div>
                    <div class="title">📋 Aylık Görev Geçmişi - Filtrelenen Liste Raporu</div>
                    <div style="color:#64748b; font-size:10pt;">Toplam {len(rows_data)} Görev Kaydı Listelendi</div>
                </div>
                <div class="badge">{len(rows_data)} Kayıt</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:40px; text-align:center;">#</th>
                        <th style="width:90px; text-align:center;">Dönem</th>
                        <th>Ad Soyad</th>
                        <th>Unvan</th>
                        <th>Görev Yapılan Birim</th>
                        <th>Kaynak Dosya</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows_html}
                </tbody>
            </table>
        </body>
        </html>
        """
        with open(html_print_path, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        import webbrowser
        webbrowser.open(f"file://{os.path.abspath(html_print_path)}")
        messagebox.showinfo("Başarılı", f"Filtrelenen {len(rows_data)} görev kaydı Excel olarak kaydedildi ve Dikey A4 baskı görünümü açıldı:\n\nExcel: {export_excel_path}", parent=self)

    def update_filter_lists(self):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("SELECT DISTINCT dosya_adi FROM Gorev ORDER BY dosya_adi")
        files = [row[0] for row in c.fetchall() if row[0]]
        self.flt_tarih.configure(values=["Dosya / Tarih"] + files)
        
        c.execute("SELECT DISTINCT unvan FROM Gorev ORDER BY unvan")
        unvans = [row[0] for row in c.fetchall() if row[0]]
        self.flt_unvan.configure(values=["Unvan"] + unvans)
        
        c.execute("SELECT DISTINCT birim FROM Gorev ORDER BY birim")
        birims = [row[0] for row in c.fetchall() if row[0]]
        self.flt_birim.configure(values=["Birim"] + birims)
        
        conn.close()

    def load_data(self):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        query = '''
            SELECT G.id, G.yil, G.ay, G.dosya_adi, P.isim, P.soyisim, G.unvan, G.birim, P.id AS personel_id
            FROM Gorev G
            JOIN Personel P ON G.personel_id = P.id
            WHERE 1=1
        '''
        params = []
        
        if self.flt_tarih.get() != "Dosya / Tarih":
            query += " AND G.dosya_adi = ?"
            params.append(self.flt_tarih.get())
            
        if self.flt_isim.get().strip():
            query += " AND P.isim LIKE ?"
            params.append(f"%{self.flt_isim.get().strip()}%")
            
        if self.flt_soyisim.get().strip():
            query += " AND P.soyisim LIKE ?"
            params.append(f"%{self.flt_soyisim.get().strip()}%")
            
        if self.flt_unvan.get() != "Unvan":
            query += " AND G.unvan = ?"
            params.append(self.flt_unvan.get())
            
        if self.flt_birim.get() != "Birim":
            query += " AND G.birim = ?"
            params.append(self.flt_birim.get())
            
        komisyon_mode = self.cmb_komisyon_mode.get()
        if komisyon_mode == "Sadece Komisyonlar":
            query += " AND G.is_komisyon = 1"
        elif komisyon_mode == "Komisyonları Gizle":
            query += " AND (G.is_komisyon = 0 OR G.is_komisyon IS NULL)"
            
        query += f" ORDER BY {self.sort_col} {'DESC' if self.sort_desc else 'ASC'}"
        
        c.execute(query, params)
        rows = c.fetchall()
        
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        for row in rows:
            self.tree.insert("", tk.END, values=row)
            
        self.lbl_count.configure(text=f"Toplam {len(rows)} Kayıt")
        conn.close()

    def log(self, msg):
        self.lbl_status.configure(text=msg)
        self.update_idletasks()

if __name__ == "__main__":
    app = App()
    app.mainloop()
