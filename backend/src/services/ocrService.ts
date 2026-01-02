import Tesseract from 'tesseract.js';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const ocrService = {
  // Extract text from image using Tesseract OCR
  async extractTextFromImage(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => console.log(m),
      });
      
      return {
        text: result.data.text,
        confidence: result.data.confidence / 100, // Convert to 0-1 scale
      };
    } catch (error) {
      console.error('Error extracting text from image:', error);
      return { text: '', confidence: 0 };
    }
  },

  // Extract text from PDF
  async extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data: any = await (pdfParse as any)(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return '';
    }
  },

  // Extract text from DOCX
  async extractTextFromDOCX(docxPath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: docxPath });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      return '';
    }
  },

  // Extract text from TXT
  async extractTextFromTXT(txtPath: string): Promise<string> {
    try {
      return fs.readFileSync(txtPath, 'utf-8');
    } catch (error) {
      console.error('Error extracting text from TXT:', error);
      return '';
    }
  },

  // Main function to extract text from any supported file type
  async extractTextFromFile(filePath: string, mimeType: string): Promise<{ text: string; confidence: number }> {
    let text = '';
    let confidence = 1.0;

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

    return { text, confidence };
  },
};
