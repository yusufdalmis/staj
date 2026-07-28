import customtkinter as ctk
import sqlite3

class CVEditWindow:
    def __new__(cls, parent, db_path, personel_id, on_save_callback=None):
        from cv_management_window import ComprehensivePersonDialog
        dialog = ComprehensivePersonDialog(parent, db_path, personel_id=personel_id, on_save_callback=on_save_callback)
        return dialog
