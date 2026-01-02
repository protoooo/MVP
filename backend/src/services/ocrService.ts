import Tesseract from 'tesseract.js';
import fs from 'fs';
import mammoth from 'mammoth';

// CRITICAL FIX: Use dynamic import for pdf-parse (CommonJS module)
const pdfParse = require('pdf-parse');

export const ocrService = {
  async extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => console.log(m),
      });
      
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
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      console.log(`Extracted ${data.text.length} characters from PDF`);
      return data.text || '';
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return '';
    }
  },

  async extractTextFromDOCX(docxPath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: docxPath });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      return '';
    }
  },

  async extractTextFromTXT(txtPath: string): Promise<string> {
    try {
      return fs.readFileSync(txtPath, 'utf-8');
    } catch (error) {
      console.error('Error extracting text from TXT:', error);
      return '';
    }
  },

  async extractTextFromFile(filePath: string, mimeType: string): Promise<{ text: string; confidence: number }> {
    let text = '';
    let confidence = 1.0;

    try {
      if (mimeType.startsWith('image/')) {
        const result = await this.extractTextFromImage(filePath);
        text = result.text;
        confidence = result.confidence;
      } else if (mimeType === 'application/pdf') {
        text = await this.extractTextFromPDF(filePath);
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

      console.log(`Text extraction complete: ${text.length} characters extracted from ${mimeType}`);
    } catch (error) {
      console.error('Error in extractTextFromFile:', error);
    }

    return { text, confidence };
  },
};
