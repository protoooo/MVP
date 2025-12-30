import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

def extract_with_ocr(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Try text extraction first
        text = page.get_text()
        
        # If text is sparse, use OCR
        if len(text.strip()) < 100:
            # Convert page to image
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # OCR the image
            text = pytesseract.image_to_string(img)
        
        full_text.append(text)
    
    return "\n\n".join(full_text)

# Usage
text = extract_with_ocr("MI_MODIFIED_FOOD_CODE.pdf")
print(f"Extracted {len(text)} characters")
