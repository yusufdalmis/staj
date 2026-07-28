import fitz

doc = fitz.open(r"d:\stajv2\2024_03\2026_02.pdf")
for i, page in enumerate(doc):
    for img in page.get_images(full=True):
        xref = img[0]
        base = doc.extract_image(xref)
        with open(f"logo_{i}_{xref}.png", "wb") as f:
            f.write(base["image"])
        print(f"Extracted logo_{i}_{xref}.png")
