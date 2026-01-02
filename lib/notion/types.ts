// Types for Notion Clone

export type BlockType = 
  // Text blocks
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'number'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'code'
  // Media blocks
  | 'image'
  | 'file'
  | 'video'
  | 'audio'
  | 'pdf'
  // Database blocks
  | 'database'
  // AI blocks
  | 'ai_writer'
  | 'ai_summarizer'
  | 'ai_improver'
  | 'ai_brainstorm'
  // Utility blocks
  | 'divider'
  | 'toc'
  | 'breadcrumb'
  | 'link'
  | 'synced'
  // Automation blocks - Scheduling & Time Management
  | 'schedule_generator'
  | 'interview_scheduler'
  | 'meeting_agenda_generator'
  // Automation blocks - Communication
  | 'email_drafter'
  | 'newsletter_generator'
  | 'announcement_drafter'
  // Automation blocks - Financial
  | 'invoice_builder'
  | 'expense_tracker'
  | 'quote_generator'
  | 'pl_statement_generator'
  | 'cash_flow_projector'
  // Automation blocks - HR & People
  | 'job_description_generator'
  | 'offer_letter_generator'
  | 'performance_review_drafter'
  | 'onboarding_checklist_generator'
  // Automation blocks - Customer Management
  | 'support_ticket_responder'
  | 'customer_survey_generator'
  // Automation blocks - Operations
  | 'inventory_forecaster'
  | 'quality_checklist_generator'
  | 'sop_generator'
  // Automation blocks - Marketing
  | 'blog_post_generator'
  | 'social_media_post_generator'
  | 'ad_copy_generator'
  | 'seo_meta_generator'
  // Automation blocks - Sales
  | 'proposal_generator'
  | 'contract_drafter'
  | 'sales_script_generator'
  // Automation blocks - Compliance & Legal
  | 'nda_generator'
  | 'policy_drafter'
  | 'incident_report_generator'
  // Automation blocks - Training
  | 'training_manual_generator'
  | 'quiz_generator'
  // Automation blocks - Forecasting & Planning
  | 'business_plan_generator'
  | 'swot_analysis_generator'
  | 'okr_generator'
  // Automation blocks - Analytics & Reports
  | 'report_generator'
  | 'kpi_dashboard_generator'
  | 'chart_generator'
  // Automation blocks - Project Management
  | 'project_charter_generator'
  | 'gantt_chart_generator'
  | 'status_report_generator'
  // Automation blocks - Industry-Specific
  | 'menu_engineering_calculator'
  | 'recipe_cost_calculator';

export type DatabaseViewType = 'table' | 'board' | 'calendar' | 'list' | 'gallery';

export type PropertyType = 
  | 'text'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'status'
  | 'date'
  | 'person'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

export type PermissionLevel = 'full_access' | 'can_edit' | 'can_comment' | 'can_view';

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  workspace_id: string;
  parent_id?: string;
  title: string;
  icon?: string;
  cover_image?: string;
  position: number;
  is_favorite: boolean;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_edited_by?: string;
  last_edited_at: string;
}

export interface Block {
  id: string;
  page_id: string;
  parent_block_id?: string;
  type: BlockType;
  content: Record<string, any>;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  id: string;
  page_id?: string;
  block_id?: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProperty {
  id: string;
  database_id: string;
  name: string;
  type: PropertyType;
  config: Record<string, any>;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseView {
  id: string;
  database_id: string;
  name: string;
  type: DatabaseViewType;
  filters: any[];
  sorts: any[];
  groups: any[];
  visible_properties?: string[];
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseItem {
  id: string;
  database_id: string;
  page_id: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DatabasePropertyValue {
  id: string;
  item_id: string;
  property_id: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  page_id: string;
  block_id?: string;
  parent_comment_id?: string;
  user_id: string;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Share {
  id: string;
  page_id: string;
  share_url: string;
  permission_level: PermissionLevel;
  public: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

export interface PagePermission {
  id: string;
  page_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  is_builtin: boolean;
  created_by?: string;
  template_data: {
    page: Partial<Page>;
    blocks: Partial<Block>[];
  };
  created_at: string;
  updated_at: string;
}

export interface PageSession {
  id: string;
  page_id: string;
  user_id: string;
  cursor_position?: {
    blockId?: string;
    offset?: number;
  };
  last_seen: string;
  created_at: string;
}

// Block content types
export interface TextBlockContent {
  text: string;
  marks?: Array<{
    type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link';
    attrs?: any;
  }>;
}

export interface HeadingBlockContent {
  text: string;
  level: 1 | 2 | 3;
}

export interface CalloutBlockContent {
  text: string;
  icon?: string;
  color?: string;
}

export interface CodeBlockContent {
  code: string;
  language?: string;
}

export interface ImageBlockContent {
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface FileBlockContent {
  url: string;
  name: string;
  size?: number;
  type?: string;
}

export interface VideoBlockContent {
  url: string;
  caption?: string;
  provider?: 'youtube' | 'vimeo' | 'upload';
}

export interface AudioBlockContent {
  url: string;
  transcript?: string;
  duration?: number;
}

export interface AIBlockContent {
  prompt?: string;
  result?: string;
  status?: 'idle' | 'generating' | 'complete' | 'error';
}

// Page tree for sidebar
export interface PageTreeNode extends Page {
  children?: PageTreeNode[];
}
