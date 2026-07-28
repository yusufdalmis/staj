import zipfile
import xml.etree.ElementTree as ET
import json
import sys

def extract_text(doc_path):
    with zipfile.ZipFile(doc_path, 'r') as docx:
        xml_content = docx.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        texts = []
        for paragraph in tree.findall('.//w:p', ns):
            para_text = []
            for run in paragraph.findall('.//w:r', ns):
                text_elem = run.find('w:t', ns)
                if text_elem is not None and text_elem.text:
                    para_text.append(text_elem.text)
            if para_text:
                texts.append("".join(para_text))
                
        return texts

def main():
    path = "d:\\staj\\faaliyetraportaslakalma\\haftalık rapor şablon.docx"
    result = extract_text(path)
    with open("extracted_template.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
