import base64
import os

with open(r"d:\stajv2\2024_03\logo_0_5.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")
    with open(r"d:\stajv2\2024_03\logo_base64.txt", "w") as out:
        out.write(b64)
