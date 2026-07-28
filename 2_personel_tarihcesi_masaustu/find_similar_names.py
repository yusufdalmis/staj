import sqlite3
import itertools
from difflib import SequenceMatcher

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

conn = sqlite3.connect('personel_veritabani.sqlite')
c = conn.cursor()
c.execute("SELECT DISTINCT ad_soyad FROM Personel_Gorev")
names = [row[0] for row in c.fetchall()]
conn.close()

names.sort()

similar_pairs = []

for i in range(len(names)):
    for j in range(i + 1, len(names)):
        n1 = names[i]
        n2 = names[j]
        
        # Exact same words but different order
        words1 = set(n1.lower().split())
        words2 = set(n2.lower().split())
        
        if words1 == words2:
            similar_pairs.append((n1, n2, "Aynı kelimeler, farklı sıra"))
            continue
            
        # Very high similarity (typos)
        ratio = similar(n1.lower(), n2.lower())
        if ratio > 0.85:
            similar_pairs.append((n1, n2, f"Yüksek benzerlik (%{int(ratio*100)})"))

with open('debug_similar_names.txt', 'w', encoding='utf-8') as f:
    f.write("Muhtemel İsim Yazım Hataları ve Çift Kayıtlar:\n")
    f.write("-" * 50 + "\n")
    for p1, p2, reason in similar_pairs:
        f.write(f"'{p1}' <---> '{p2}' ({reason})\n")
