import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromURL } from "@/lib/text-extraction";
import { processDocument } from "@/lib/document-processing";

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from("business_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (document.processed) {
      return NextResponse.json({
        success: true,
        message: "Document already processed",
      });
    }

    // Extract text from the document
    const extractionResult = await extractTextFromURL(
      document.file_url,
      document.mime_type,
      document.document_name
    );

    if (!extractionResult.success || !extractionResult.text) {
      // Mark as failed
      await supabase
        .from("business_documents")
        .update({
          processed: false,
          processing_error: extractionResult.error || "Failed to extract text",
        })
        .eq("id", documentId);

      return NextResponse.json(
        {
          error: extractionResult.error || "Failed to extract text from document",
        },
        { status: 400 }
      );
    }

    // Process the document (chunk and embed)
    const processSuccess = await processDocument(
      user.id,
      documentId,
      extractionResult.text,
      {
        document_type: document.document_type,
        file_name: document.document_name,
        ...extractionResult.metadata,
      }
    );

    if (!processSuccess) {
      await supabase
        .from("business_documents")
        .update({
          processed: false,
          processing_error: "Failed to process document embeddings",
        })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "Failed to process document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document processed successfully",
      metadata: extractionResult.metadata,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
