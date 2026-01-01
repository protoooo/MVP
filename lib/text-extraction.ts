/**
 * Document Text Extraction Utilities
 * Extracts text from various document formats (PDF, DOCX, CSV, etc.)
 */

import pdf from "pdf-parse/lib/pdf-parse";
import mammoth from "mammoth";

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
  };
}

/**
 * Extract text from PDF files
 */
export async function extractTextFromPDF(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  try {
    const data = await pdf(fileBuffer);

    return {
      text: data.text,
      success: true,
      metadata: {
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).length,
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

  // For Excel files, we'll just extract as text (simplified)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    extension === "xlsx" ||
    extension === "xls"
  ) {
    // For now, treat as text - could enhance with a library like xlsx
    return extractTextFromTXT(fileBuffer);
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
