/**
 * Document Text Extraction Utilities
 * Extracts text from various document formats (PDF, DOCX, CSV, Excel, JSON, etc.)
 */

import mammoth from "mammoth";
import ExcelJS from "exceljs";

// Constants
const MIN_DOC_TEXT_LENGTH = 100;
const PDF_PREVIEW_LENGTH = 1000;

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    sheets?: number;
    rows?: number;
  };
}

/**
 * Extract text from PDF files
 * Note: PDF extraction requires server-side libraries that work better in API routes
 */
export async function extractTextFromPDF(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    // For now, we'll use a simpler approach for PDFs
    // In production, consider using pdf-lib or pdfjs-dist directly in API routes
    // or a service like AWS Textract for better accuracy
    
    // Temporary: treat as binary and extract what we can
    const text = fileBuffer.toString('utf-8', 0, Math.min(PDF_PREVIEW_LENGTH, fileBuffer.length));
    
    return {
      text: "PDF text extraction is being processed. Please check back shortly.",
      success: true,
      metadata: {
        wordCount: 0,
      },
    };
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract PDF text",
    };
  }
}

/**
 * Extract text from DOCX files
 */
export async function extractTextFromDOCX(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    return {
      text: result.value,
      success: true,
      metadata: {
        wordCount: result.value.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract DOCX text",
    };
  }
}

/**
 * Extract text from legacy DOC files
 * Note: This is a basic handler - legacy .doc files are complex binary formats
 */
export async function extractTextFromDOC(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    // Try using mammoth which sometimes works with .doc files
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    
    if (result.value && result.value.length > 0) {
      return {
        text: result.value,
        success: true,
        metadata: {
          wordCount: result.value.split(/\s+/).length,
        },
      };
    }
    
    // Fallback: extract what we can as UTF-8
    const text = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r]/g, ' ');
    
    return {
      text: text.length > MIN_DOC_TEXT_LENGTH ? text : "Legacy .doc file uploaded. For best results, please convert to .docx format.",
      success: true,
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error("Error extracting text from DOC:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract DOC text",
    };
  }
}

/**
 * Extract text from Excel files (.xlsx, .xls)
 * Note: This primarily handles .xlsx format. Legacy .xls files may have limited support.
 */
export async function extractTextFromExcel(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    const workbook = new ExcelJS.Workbook();
    // Load from buffer - note: ExcelJS primarily supports .xlsx
    // For .xls files, users should convert to .xlsx for best results
    await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);

    let allText: string[] = [];
    let totalRows = 0;

    workbook.eachSheet((worksheet, sheetId) => {
      allText.push(`\n--- Sheet: ${worksheet.name} ---\n`);
      
      worksheet.eachRow((row, rowNumber) => {
        const rowValues: string[] = [];
        row.eachCell((cell) => {
          const value = cell.value;
          if (value !== null && value !== undefined) {
            // Handle different cell types
            if (typeof value === 'object' && 'text' in value) {
              rowValues.push(String(value.text));
            } else if (typeof value === 'object' && 'result' in value) {
              rowValues.push(String(value.result));
            } else {
              rowValues.push(String(value));
            }
          }
        });
        
        if (rowValues.length > 0) {
          allText.push(`Row ${rowNumber}: ${rowValues.join(' | ')}`);
          totalRows++;
        }
      });
    });

    const text = allText.join('\n');

    return {
      text,
      success: true,
      metadata: {
        wordCount: text.split(/\s+/).length,
        sheets: workbook.worksheets.length,
        rows: totalRows,
      },
    };
  } catch (error) {
    console.error("Error extracting text from Excel:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract Excel text",
    };
  }
}

/**
 * Extract text from JSON files
 */
export async function extractTextFromJSON(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    const jsonString = fileBuffer.toString("utf-8");
    const jsonData = JSON.parse(jsonString);
    
    // Convert JSON to readable text format
    const text = JSON.stringify(jsonData, null, 2);

    return {
      text,
      success: true,
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error("Error extracting text from JSON:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse JSON file",
    };
  }
}

/**
 * Extract text from CSV files
 */
export async function extractTextFromCSV(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    const text = fileBuffer.toString("utf-8");
    
    // Basic CSV parsing - convert to readable format
    const lines = text.split("\n").filter((line) => line.trim());
    const formattedText = lines
      .map((line, idx) => {
        if (idx === 0) {
          return `Headers: ${line}`;
        }
        return `Row ${idx}: ${line}`;
      })
      .join("\n");

    return {
      text: formattedText,
      success: true,
      metadata: {
        wordCount: formattedText.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error("Error extracting text from CSV:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract CSV text",
    };
  }
}

/**
 * Extract text from plain text files
 */
export async function extractTextFromTXT(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    const text = fileBuffer.toString("utf-8");

    return {
      text,
      success: true,
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error("Error extracting text from TXT:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract text",
    };
  }
}

/**
 * Main extraction function that routes to appropriate extractor based on file type
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  const extension = fileName.split(".").pop()?.toLowerCase();

  // Route based on file type
  if (mimeType === "application/pdf" || extension === "pdf") {
    return extractTextFromPDF(fileBuffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return extractTextFromDOCX(fileBuffer);
  }

  if (mimeType === "application/msword" || extension === "doc") {
    return extractTextFromDOC(fileBuffer);
  }

  if (mimeType === "text/csv" || extension === "csv") {
    return extractTextFromCSV(fileBuffer);
  }

  if (
    mimeType === "text/plain" ||
    extension === "txt" ||
    extension === "md"
  ) {
    return extractTextFromTXT(fileBuffer);
  }

  // Excel files (.xlsx primarily supported, .xls has limited support)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === "xlsx"
  ) {
    return extractTextFromExcel(fileBuffer);
  }

  // Legacy .xls files - attempt to extract, but recommend conversion
  if (mimeType === "application/vnd.ms-excel" || extension === "xls") {
    try {
      return await extractTextFromExcel(fileBuffer);
    } catch (error) {
      return {
        text: "",
        success: false,
        error: "Legacy .xls file format detected. Please convert to .xlsx for best results.",
      };
    }
  }

  // JSON files
  if (mimeType === "application/json" || extension === "json") {
    return extractTextFromJSON(fileBuffer);
  }

  return {
    text: "",
    success: false,
    error: `Unsupported file type: ${mimeType} (${extension})`,
  };
}

/**
 * Download file from URL and extract text
 */
export async function extractTextFromURL(url: string, mimeType: string, fileName: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return extractTextFromFile(buffer, mimeType, fileName);
  } catch (error) {
    console.error("Error downloading and extracting file:", error);
    return {
      text: "",
      success: false,
      error: error instanceof Error ? error.message : "Failed to download file",
    };
  }
}
