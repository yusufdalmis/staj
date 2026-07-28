import os
import json
import sqlite3
import hashlib
from tkinter import colorchooser
import customtkinter as ctk

COLORS_FILE = os.path.join(os.getcwd(), "renk_ayarlari.json")

# Varsayılan pastel renkler (export_to_excel.py'deki gibi)
DEFAULT_COLORS = [
    "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", 
    "#E8BAFF", "#FFBAE1", "#E2F0CB", "#FFB7B2", "#FFDAC1",
    "#E0BBE4", "#957DAD", "#D291BC", "#FEC8D8", "#FFDFD3",
    "#B5EAD7", "#C7CEEA", "#F1CBFF", "#C8E6C9", "#FFF9C4",
    "#F4C2C2", "#B0E0E6", "#F5DEB3", "#D8BFD8", "#FFDEAD",
    "#AFEEEE", "#E6E6FA", "#F08080", "#E0FFFF", "#FFB6C1",
    "#98FB98", "#FFDAB9", "#FFE4B5", "#F5F5DC", "#F0E68C"
]

def get_palette():
    saved = load_colors()
    if saved and isinstance(saved, list) and len(saved) > 0:
        return saved
    return DEFAULT_COLORS[:20]

def get_default_color(text_val):
    if not isinstance(text_val, str) or text_val == "":
        return "transparent"
    palette = get_palette()
    hash_val = int(hashlib.md5(text_val.encode('utf-8')).hexdigest(), 16)
    return palette[hash_val % len(palette)]

def load_colors():
    if os.path.exists(COLORS_FILE):
        try:
            with open(COLORS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Eski sürümde dict olarak kaydedilmişse listeye çevir/sıfırla
                if isinstance(data, dict):
                    return list(data.values())[:20] if data else []
                return data
        except Exception:
            pass
    return []

def save_colors(colors_list):
    with open(COLORS_FILE, 'w', encoding='utf-8') as f:
        json.dump(colors_list, f, ensure_ascii=False, indent=4)

def show_color_settings_window(parent, db_path):
    win = ctk.CTkToplevel(parent)
    win.title("Tema Renkleri (Global Palet)")
    win.geometry("500x600")
    win.transient(parent)
    win.grab_set() # Modal dialog

    ctk.CTkLabel(win, text="Uygulama Renk Paleti", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=(20, 10))
    ctk.CTkLabel(win, text="Burada belirlediğiniz 20 renk; birimler, başkanlar ve \nileride eklenecek tüm analizlerde ortak kullanılacaktır.", text_color="gray").pack(pady=(0,10))
    
    current_palette = get_palette()
    # Eğer 20'den azsa tamamla
    while len(current_palette) < 20:
        current_palette.append(DEFAULT_COLORS[len(current_palette) % len(DEFAULT_COLORS)])
        
    scroll_frame = ctk.CTkScrollableFrame(win, width=450, height=450)
    scroll_frame.pack(padx=20, pady=10, fill="both", expand=True)
    
    color_labels = []
    
    def pick_color(index, lbl_color):
        c_code = colorchooser.askcolor(title=f"{index+1}. Renk", initialcolor=current_palette[index])[1]
        if c_code:
            current_palette[index] = c_code
            lbl_color.configure(fg_color=c_code)

    for i in range(20):
        frame = ctk.CTkFrame(scroll_frame, fg_color="transparent")
        frame.pack(fill="x", pady=5)
        
        lbl_name = ctk.CTkLabel(frame, text=f"{i+1}. Renk", anchor="w", width=250)
        lbl_name.pack(side="left", padx=5)
        
        lbl_color = ctk.CTkLabel(frame, text="", width=40, height=20, fg_color=current_palette[i], corner_radius=5)
        lbl_color.pack(side="left", padx=10)
        color_labels.append(lbl_color)
        
        btn_pick = ctk.CTkButton(frame, text="Seç", width=60, command=lambda idx=i, l=lbl_color: pick_color(idx, l))
        btn_pick.pack(side="left", padx=5)

    def on_save():
        save_colors(current_palette)
        win.destroy()

    btn_frame = ctk.CTkFrame(win, fg_color="transparent")
    btn_frame.pack(pady=10)
    
    btn_save = ctk.CTkButton(btn_frame, text="Kaydet ve Çık", command=on_save, fg_color="#27AE60", hover_color="#2ecc71")
    btn_save.pack(side="left", padx=10)
    
    btn_cancel = ctk.CTkButton(btn_frame, text="İptal", command=win.destroy, fg_color="#C0392B", hover_color="#E74C3C")
    btn_cancel.pack(side="left", padx=10)
