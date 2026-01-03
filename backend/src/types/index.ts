export interface User {
  id: number;
  email: string;
  password_hash: string;
  business_name?: string;
  created_at: Date;
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
  uploaded_at: Date;
  created_at?: Date;
}

export interface FileContent {
  id: number;
  file_id: number;
  extracted_text: string;
  text_embedding: number[];
  image_analysis?: any;
  ocr_confidence?: number;
}

export interface FileMetadata {
  id: number;
  file_id: number;
  category: string;
  tags: string[];
  detected_entities: any;
  ai_description: string;
  confidence_score: number;
}

export interface SearchLog {
  id: number;
  user_id: number;
  query: string;
  results_count: number;
  clicked_file_id?: number;
  searched_at: Date;
}
