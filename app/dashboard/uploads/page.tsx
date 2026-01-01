"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, X, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const documentTypes = [
  { value: "manual", label: "Employee Handbook" },
  { value: "procedure", label: "How-To Guide / Recipe" },
  { value: "policy", label: "Rules & Policies" },
  { value: "report", label: "Sales or Business Report" },
  { value: "sales_data", label: "Sales Records" },
  { value: "inventory_data", label: "Stock List / Inventory" },
  { value: "financial_data", label: "Invoices / Expenses" },
  { value: "other", label: "Other" },
];

export default function UploadsPage() {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("other");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("business_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    setDocuments(data || []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    let documentId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("business-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("business-documents")
        .getPublicUrl(fileName);

      // Save document metadata
      const { data: docData, error: dbError } = await supabase
        .from("business_documents")
        .insert({
          user_id: user.id,
          document_name: file.name,
          document_type: selectedType,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          processed: false,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      documentId = docData?.id;

      setSuccess("Document uploaded! Processing...");
      loadDocuments();

      // Trigger document processing in background
      if (documentId) {
        fetch("/api/documents/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        })
          .then((res) => res.json())
          .then((result) => {
            if (result.success) {
              setSuccess("Document uploaded and processed successfully!");
              loadDocuments();
            } else {
              setError(result.error || "Document uploaded but processing failed");
            }
          })
          .catch((err) => {
            console.error("Processing error:", err);
            setError("Document uploaded but processing failed");
          });
      }
      
      // Reset file input
      e.target.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/");
      const filePath = urlParts.slice(-2).join("/");

      // Delete from storage
      await supabase.storage
        .from("business-documents")
        .remove([filePath]);

      // Delete from database
      await supabase
        .from("business_documents")
        .delete()
        .eq("id", docId);

      loadDocuments();
      setSuccess("Document deleted successfully");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Your Files</h1>
          <p className="mt-2 text-gray-600">
            Upload anything - schedules, invoices, recipes, employee files. The more you upload, the more helpful this gets.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What kind of file is this?
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json"
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-full file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 file:cursor-pointer
                    cursor-pointer disabled:opacity-50"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV, JSON, Text (Max 10MB)
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Your Files ({documents.length})
          </h2>
          
          {documents.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No files uploaded yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload your first file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:border-gray-300 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{doc.document_name}</h3>
                        {doc.processed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded">
                            <Check className="w-3 h-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs font-medium rounded">
                            <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                            Processing
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        {" • "}
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                        {" • "}
                        {(doc.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.file_url)}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                    title="Delete document"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">How it helps you</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Upload your staff handbook → get help answering employee questions</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Upload invoices and receipts → see where your money goes</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Upload stock lists → know what to order and when</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Your files stay private and secure - only your team can see them</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
