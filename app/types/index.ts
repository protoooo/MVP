export interface User {
  id: number;
  email: string;
  business_name?: string;
  created_at?: string;
}

export interface File {
  id: number;
  user_id: number;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  thumbnail_path?: string;
  uploaded_at: string;
  created_at?: string;
  tags?: string[];
  category?: string;
  ai_description?: string;
  confidence_score?: number;
  extracted_text?: string;
  relevance_score?: number;
}

export interface SearchResult {
  results: File[];
  total: number;
  query_understanding: {
    intent: string;
    timeRange?: { start?: string; end?: string };
    documentTypes: string[];
    entities: {
      dates: string[];
      amounts: string[];
      names: string[];
      locations: string[];
    };
    keywords: string[];
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface FileListResponse {
  files: File[];
  total: number;
  page: number;
  totalPages: number;
}
