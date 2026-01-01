"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, X, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const documentTypes = [
  { value: "manual", label: "Manual / Handbook" },
  { value: "procedure", label: "Standard Procedure" },
  { value: "policy", label: "Policy Document" },
  { value: "report", label: "Business Report" },
  { value: "sales_data", label: "Sales Data" },
  { value: "inventory_data", label: "Inventory Data" },
  { value: "financial_data", label: "Financial Data" },
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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
      const { error: dbError } = await supabase
        .from("business_documents")
        .insert({
          user_id: user.id,
          document_name: file.name,
          document_type: selectedType,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          processed: false,
        });

      if (dbError) throw dbError;

      setSuccess("Document uploaded successfully!");
      loadDocuments();
      
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
          <h1 className="text-3xl font-semibold text-gray-900">Document Uploads</h1>
          <p className="mt-2 text-gray-600">
            Upload business documents to help agents understand your operations
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
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
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
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
                Supported formats: PDF, Word, Excel, CSV, Text (Max 10MB)
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
            Uploaded Documents ({documents.length})
          </h2>
          
          {documents.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No documents uploaded yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Upload your first document to get started
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
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.document_name}</h3>
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
          <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Documents are analyzed and made searchable for all agents</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Agents use this context to provide accurate, business-specific insights</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Your data is securely stored and only accessible by your agents</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
