import Tesseract from 'tesseract.js';
import fs from 'fs';
import mammoth from 'mammoth';
import { fromPath } from 'pdf2pic';

const pdfParse = require('pdf-parse');

export const ocrService = {
  async extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
      console.log(`Starting OCR on image: ${imagePath}`);
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      console.log(`OCR complete: extracted ${result.data.text.length} characters`);
      return {
        text: result.data.text,
        confidence: result.data.confidence / 100,
      };
    } catch (error) {
      console.error('Error extracting text from image:', error);
      return { text: '', confidence: 0 };
    }
  },

  async extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
      console.log(`Attempting text extraction from PDF: ${pdfPath}`);
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      
      const extractedText = data.text || '';
      console.log(`PDF text extraction: ${extractedText.length} characters`);
      
      // If we got very little text, it might be a scanned PDF
      if (extractedText.length < 50) {
        console.log('PDF appears to be scanned (little/no text), attempting OCR...');
        return await this.extractTextFromScannedPDF(pdfPath);
      }
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      // Fallback to OCR if pdf-parse fails
      console.log('Falling back to OCR for PDF...');
      return await this.extractTextFromScannedPDF(pdfPath);
    }
  },

  async extractTextFromScannedPDF(pdfPath: string): Promise<string> {
    try {
      console.log(`Starting OCR on scanned PDF: ${pdfPath}`);
      
      // Convert PDF pages to images
      const options = {
        density: 300,           // DPI
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: 2000,
        height: 2000,
      };

      const convert = fromPath(pdfPath, options);
      
      // Process first 5 pages max (to avoid timeout)
      const maxPages = 5;
      let allText = '';
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`Processing PDF page ${pageNum}...`);
          const result = await convert(pageNum, { responseType: 'image' });
          
          if (!result || !result.path) {
            console.log(`No more pages after page ${pageNum - 1}`);
            break;
          }
          
          // OCR the page image
          const pageText = await this.extractTextFromImage(result.path);
          allText += pageText.text + '\n\n';
          
          // Clean up temp image
          try {
            fs.unlinkSync(result.path);
          } catch (e) {
            // Ignore cleanup errors
          }
        } catch (pageError) {
          console.log(`Could not process page ${pageNum}, stopping`);
          break;
        }
      }
      
      console.log(`Scanned PDF OCR complete: ${allText.length} characters from ${maxPages} pages`);
      return allText;
    } catch (error) {
      console.error('Error with scanned PDF OCR:', error);
      return '';
    }
  },

  async extractTextFromDOCX(docxPath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: docxPath });
      console.log(`DOCX extraction: ${result.value.length} characters`);
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      return '';
    }
  },

  async extractTextFromTXT(txtPath: string): Promise<string> {
    try {
      const text = fs.readFileSync(txtPath, 'utf-8');
      console.log(`TXT extraction: ${text.length} characters`);
      return text;
    } catch (error) {
      console.error('Error extracting text from TXT:', error);
      return '';
    }
  },

  async extractTextFromFile(filePath: string, mimeType: string): Promise<{ text: string; confidence: number }> {
    let text = '';
    let confidence = 1.0;

    try {
      console.log(`\n=== Starting text extraction ===`);
      console.log(`File: ${filePath}`);
      console.log(`MIME Type: ${mimeType}`);
      
      if (mimeType.startsWith('image/')) {
        const result = await this.extractTextFromImage(filePath);
        text = result.text;
        confidence = result.confidence;
      } else if (mimeType === 'application/pdf') {
        text = await this.extractTextFromPDF(filePath);
        confidence = text.length > 50 ? 0.9 : 0.7; // Lower confidence for OCR'd PDFs
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        text = await this.extractTextFromDOCX(filePath);
      } else if (mimeType === 'text/plain') {
        text = await this.extractTextFromTXT(filePath);
      } else {
        console.log(`Unsupported file type for text extraction: ${mimeType}`);
      }

      console.log(`\n=== Extraction Summary ===`);
      console.log(`Total characters extracted: ${text.length}`);
      console.log(`Confidence: ${confidence}`);
      console.log(`First 200 chars: ${text.substring(0, 200)}`);
    } catch (error) {
      console.error('Error in extractTextFromFile:', error);
    }

    return { text, confidence };
  },
};
