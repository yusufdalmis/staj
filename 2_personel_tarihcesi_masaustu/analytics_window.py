import tkinter as tk
from tkinter import ttk
import customtkinter as ctk
import sqlite3
import pandas as pd

def display_dataframe(parent, df):
    """Pandas DataFrame'ini Tkinter Treeview içinde gösteren yardımcı fonksiyon"""
    df = df.reset_index() if not isinstance(df.index, pd.RangeIndex) else df
    df = df.fillna("")

    tree_frame = ctk.CTkFrame(parent)
    tree_frame.pack(fill="both", expand=True, padx=10, pady=10)
    
    tree_scroll_y = ctk.CTkScrollbar(tree_frame, orientation="vertical")
    tree_scroll_y.pack(side="right", fill="y")
    
    tree_scroll_x = ctk.CTkScrollbar(tree_frame, orientation="horizontal")
    tree_scroll_x.pack(side="bottom", fill="x")
    
    cols = [str(c) for c in df.columns]
    tree = ttk.Treeview(tree_frame, columns=cols, show="headings", 
                        yscrollcommand=tree_scroll_y.set, xscrollcommand=tree_scroll_x.set)
    tree_scroll_y.configure(command=tree.yview)
    tree_scroll_x.configure(command=tree.xview)
    
    style = ttk.Style()
    style.configure("Treeview.Heading", font=('Helvetica', 10, 'bold'))
    
    for col in cols:
        tree.heading(col, text=col)
        tree.column(col, width=150, minwidth=100)
        
    tree.pack(fill="both", expand=True)
    
    for _, row in df.iterrows():
        tree.insert("", "end", values=list(row))

def show_analytics_window(parent, db_path):
    win = ctk.CTkToplevel(parent)
    win.title("Gelişmiş Analizler ve Raporlar")
    win.geometry("1200x800")
    win.transient(parent)
    
    lbl = ctk.CTkLabel(win, text="Raporlar Hazırlanıyor, Lütfen Bekleyin...", font=ctk.CTkFont(size=18, weight="bold"))
    lbl.pack(pady=50)
    win.update()
    
    try:
        conn = sqlite3.connect(db_path)
        df_personel = pd.read_sql_query('''
            SELECT G.id, G.dosya_adi, G.yil, G.ay, P.isim || ' ' || P.soyisim AS ad_soyad, G.unvan, G.birim 
            FROM Gorev G 
            JOIN Personel P ON G.personel_id = P.id 
            ORDER BY G.yil, G.ay
        ''', conn)
        
        if df_personel.empty:
            lbl.configure(text="Veritabanında kayıt bulunamadı.")
            conn.close()
            return
            
        komisyon_keywords = ['KOMİSYONU', 'SORUMLULARI']
        mask = df_personel['birim'].str.contains('|'.join(komisyon_keywords), case=False, na=False)
        
        df_komisyon = df_personel[mask].copy()
        df_personel = df_personel[~mask].copy()

        df_personel['donem'] = df_personel['yil'].astype(str) + "_" + df_personel['ay'].astype(str).str.zfill(2)
        df_pivot = df_personel.drop_duplicates(subset=['ad_soyad', 'donem'], keep='last')
        
        pivot_table = df_pivot.pivot(index='ad_soyad', columns='donem', values='birim')

        df_birimler = df_personel.groupby('birim').agg(
            ilk_kayit=('donem', 'min'),
            son_kayit=('donem', 'max')
        ).reset_index()

        def find_baskan(birim_adi):
            baskan_df = df_personel[(df_personel['birim'] == birim_adi) & (df_personel['unvan'].str.contains('Başkan|Koordinatör|Genel Sekreter', case=False, na=False))]
            if not baskan_df.empty:
                return baskan_df.iloc[-1]['ad_soyad']
            return "Bilinmiyor"
            
        df_birimler['guncel_yonetici'] = df_birimler['birim'].apply(find_baskan)
        df_birimler.rename(columns={
            'birim': 'Birim Adı',
            'ilk_kayit': 'Kuruluş / İlk Kayıt',
            'son_kayit': 'Son Kayıt',
            'guncel_yonetici': 'Güncel/Son Yönetici'
        }, inplace=True)

        df_birim_kisi = df_personel.groupby(['birim', 'donem']).size().unstack(fill_value=0)
        df_toplam_personel = df_personel.groupby('donem').size().reset_index(name='Toplam Personel')
        df_unvan_dagilimi = df_personel.groupby(['unvan', 'donem']).size().unstack(fill_value=0)
        
        baskan_df = df_personel[df_personel['unvan'].str.contains('Başkan|Koordinatör|Genel Sekreter', case=False, na=False)]
        df_baskan_tarihce = pd.DataFrame()
        if not baskan_df.empty:
            df_baskan_tarihce = baskan_df.pivot_table(index='birim', columns='donem', values='ad_soyad', aggfunc=lambda x: ' / '.join(x.dropna().unique()))

        career_paths = []
        for person, group in df_personel.sort_values(['yil', 'ay']).groupby('ad_soyad'):
            path = []
            for b in group['birim']:
                if not path or path[-1] != b:
                    path.append(b)
            career_paths.append({'ad_soyad': person, 'path': path})
            
        df_kariyer = pd.DataFrame()
        if career_paths:
            max_len = max(len(p['path']) for p in career_paths)
            records = []
            for p in career_paths:
                row = {'Personel Adı': p['ad_soyad']}
                for i in range(max_len):
                    row[f'Birim {i+1}'] = p['path'][i] if i < len(p['path']) else None
                records.append(row)
            df_kariyer = pd.DataFrame(records)

        lbl.destroy() # Veriler hazir, tabview'i kur

        tabview = ctk.CTkTabview(win)
        tabview.pack(fill="both", expand=True, padx=20, pady=20)
        
        tabs = [
            ("Kariyer Yolu", df_kariyer),
            ("Personel Tarihçesi", pivot_table),
            ("Birimler Özet", df_birimler),
            ("Başkanlar Tarihçesi", df_baskan_tarihce),
            ("Birim Başına Personel", df_birim_kisi),
            ("Unvan Dağılımı", df_unvan_dagilimi),
            ("Toplam Personel", df_toplam_personel)
        ]
        
        for tab_name, df in tabs:
            if not df.empty:
                tab = tabview.add(tab_name)
                display_dataframe(tab, df)
                
        # Komisyonlar
        if not df_komisyon.empty:
            df_komisyon['donem'] = df_komisyon['yil'].astype(str) + "_" + df_komisyon['ay'].astype(str).str.zfill(2)
            en_son_donem = df_komisyon['donem'].max()
            df_guncel_komisyon = df_komisyon[df_komisyon['donem'] == en_son_donem].drop(columns=['id', 'donem', 'yil', 'ay'])
            
            tab_komisyon = tabview.add("Güncel Komisyonlar")
            display_dataframe(tab_komisyon, df_guncel_komisyon)

        conn.close()
    except Exception as e:
        lbl.configure(text=f"Raporlar oluşturulurken hata: {e}")
