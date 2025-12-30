#!/usr/bin/env python3
"""
Enhanced OCR PDF Processor - Railway Compatible
Extracts text from PDFs using multiple methods with OCR fallback
"""

import sys
import json
import argparse

def extract_text_native(pdf_path):
    """Extract text using native PDF text layer"""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        pages = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            pages.append(text)
        
        doc.close()
        return "\n\n".join(pages), len(pages)
    except ImportError:
        print("Error: PyMuPDF not installed. Run: pip3 install PyMuPDF", file=sys.stderr)
        return "", 0
    except Exception as e:
        print(f"Error extracting native text: {str(e)}", file=sys.stderr)
        return "", 0

def extract_text_with_ocr(pdf_path, dpi=300, lang='eng'):
    """
    Extract text using OCR
    
    Args:
        pdf_path: Path to PDF file
        dpi: Resolution for image conversion (higher = better quality but slower)
        lang: Tesseract language (eng, eng+fra, etc.)
    """
    try:
        import fitz  # PyMuPDF
        import pytesseract
        from PIL import Image
        
        doc = fitz.open(pdf_path)
        full_text = []
        
        print(f"Processing {len(doc)} pages with OCR...", file=sys.stderr)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Try native text first
            text = page.get_text().strip()
            
            # If text is sparse or empty, use OCR
            if len(text) < 100:
                # Convert page to high-res image
                zoom = dpi / 72
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Enhance image for better OCR
                img = enhance_for_ocr(img)
                
                # Run OCR
                text = pytesseract.image_to_string(
                    img,
                    lang=lang,
                    config='--psm 1 --oem 3'
                )
                
                if (page_num + 1) % 5 == 0:
                    print(f"OCR progress: {page_num + 1}/{len(doc)} pages", file=sys.stderr)
            
            full_text.append(text)
        
        doc.close()
        return "\n\n".join(full_text), len(doc)
    
    except ImportError as e:
        print(f"Error: Missing dependency - {str(e)}", file=sys.stderr)
        print("Install: pip3 install PyMuPDF pytesseract Pillow", file=sys.stderr)
        return "", 0
    except Exception as e:
        print(f"Error during OCR: {str(e)}", file=sys.stderr)
        return "", 0

def enhance_for_ocr(img):
    """Enhance image for better OCR results"""
    try:
        from PIL import ImageEnhance, ImageFilter
        
        # Convert to grayscale
        img = img.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        # Increase sharpness
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.5)
        
        # Denoise
        img = img.filter(ImageFilter.MedianFilter(size=3))
        
        return img
    except Exception as e:
        print(f"Warning: Image enhancement failed: {str(e)}", file=sys.stderr)
        return img

def calculate_coverage(text, page_count):
    """Calculate extraction coverage percentage"""
    if page_count == 0:
        return 0
    
    expected_chars_per_page = 2000
    avg_chars_per_page = len(text) / page_count
    coverage = min(100, (avg_chars_per_page / expected_chars_per_page) * 100)
    
    return coverage

def main():
    parser = argparse.ArgumentParser(description='Extract text from PDF with OCR fallback')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--force-ocr', action='store_true', help='Force OCR even if text exists')
    parser.add_argument('--dpi', type=int, default=300, help='DPI for OCR (default: 300)')
    parser.add_argument('--lang', default='eng', help='Tesseract language (default: eng)')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    # Try native extraction first
    text = ""
    pages = 0
    method = "native"
    
    if not args.force_ocr:
        print("Attempting native text extraction...", file=sys.stderr)
        text, pages = extract_text_native(args.pdf_path)
        coverage = calculate_coverage(text, pages)
        
        print(f"Native extraction: {len(text)} chars, {coverage:.1f}% coverage", file=sys.stderr)
        
        # If coverage is good, use native text
        if coverage >= 70:
            if args.json:
                result = {
                    "text": text,
                    "pages": pages,
                    "coverage": round(coverage, 2),
                    "method": "native",
                    "success": True
                }
                print(json.dumps(result))
            else:
                print(text)
            return
        
        print("Low coverage detected, falling back to OCR...", file=sys.stderr)
    else:
        print("Force OCR mode enabled", file=sys.stderr)
    
    # Fall back to OCR
    method = "ocr"
    text, pages = extract_text_with_ocr(args.pdf_path, dpi=args.dpi, lang=args.lang)
    coverage = calculate_coverage(text, pages)
    
    print(f"OCR extraction complete: {len(text)} chars, {coverage:.1f}% coverage", file=sys.stderr)
    
    if args.json:
        result = {
            "text": text,
            "pages": pages,
            "coverage": round(coverage, 2),
            "method": method,
            "success": True
        }
        print(json.dumps(result))
    else:
        print(text)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        sys.exit(1)
