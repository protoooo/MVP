"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lightbulb, FileText, TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface DocumentSuggestion {
  agent: string;
  agentHref: string;
  icon: React.ReactNode;
  suggestion: string;
  color: string;
}

export default function DocumentInsightsBanner() {
  const [documentCount, setDocumentCount] = useState(0);
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDocumentInsights();
  }, []);

  const loadDocumentInsights = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get document counts by type
      const { data: docs, error } = await supabase
        .from("business_documents")
        .select("document_type, processed")
        .eq("user_id", user.id)
        .eq("processed", true);

      if (error) {
        console.error("Error loading documents:", error);
        return;
      }

      setDocumentCount(docs?.length || 0);

      // Generate suggestions based on uploaded documents
      const docTypes = new Set(docs?.map((d) => d.document_type) || []);
      const newSuggestions: DocumentSuggestion[] = [];

      if (docTypes.has("financial_data")) {
        newSuggestions.push({
          agent: "Financial Agent",
          agentHref: "/dashboard/financial",
          icon: <DollarSign className="w-4 h-4" />,
          suggestion: "Your expense reports show spending patterns - ask me to analyze trends",
          color: "honey",
        });
      }

      if (docTypes.has("manual") || docTypes.has("policy")) {
        newSuggestions.push({
          agent: "HR Agent",
          agentHref: "/dashboard/hr",
          icon: <Users className="w-4 h-4" />,
          suggestion: "I can answer employee questions based on your handbook",
          color: "lavender",
        });
      }

      if (docTypes.has("inventory_data")) {
        newSuggestions.push({
          agent: "Inventory Agent",
          agentHref: "/dashboard/inventory",
          icon: <Package className="w-4 h-4" />,
          suggestion: "Let me analyze your stock levels and suggest what to reorder",
          color: "sage",
        });
      }

      if (docTypes.has("contract") || docTypes.has("agreement")) {
        newSuggestions.push({
          agent: "Document Agent",
          agentHref: "/dashboard/documents",
          icon: <FileText className="w-4 h-4" />,
          suggestion: "I can summarize contract terms and flag important clauses",
          color: "clay",
        });
      }

      // If we have documents but no specific suggestions, add generic ones
      if (newSuggestions.length === 0 && documentCount > 0) {
        newSuggestions.push({
          agent: "Operations",
          agentHref: "/dashboard/operations",
          icon: <TrendingUp className="w-4 h-4" />,
          suggestion: "Use your uploaded documents to create task lists and workflows",
          color: "indigo",
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error in loadDocumentInsights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || documentCount === 0) {
    return null;
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      honey: { bg: "bg-honey-50", border: "border-honey-200", text: "text-honey-700" },
      lavender: { bg: "bg-lavender-50", border: "border-lavender-200", text: "text-lavender-700" },
      sage: { bg: "bg-sage-50", border: "border-sage-200", text: "text-sage-700" },
      clay: { bg: "bg-clay-50", border: "border-clay-200", text: "text-clay-700" },
      indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
    };
    return colors[color] || colors.indigo;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white rounded-lg shadow-sm">
          <Lightbulb className="w-6 h-6 text-blue-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            💡 You've uploaded {documentCount} {documentCount === 1 ? "document" : "documents"}
          </h3>
          
          {suggestions.length > 0 ? (
            <>
              <p className="text-sm text-gray-700 mb-4">
                Here's what I can help you with based on them:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((suggestion, idx) => {
                  const colors = getColorClasses(suggestion.color);
                  return (
                    <Link
                      key={idx}
                      href={suggestion.agentHref}
                      className={`${colors.bg} ${colors.border} border rounded-lg p-3 hover:shadow-md transition group`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 bg-white rounded ${colors.text}`}>
                          {suggestion.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600 mb-1">
                            {suggestion.agent}
                          </p>
                          <p className="text-sm text-gray-800 group-hover:text-gray-900">
                            {suggestion.suggestion}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-700">
              Upload more documents to unlock personalized suggestions for each agent.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
