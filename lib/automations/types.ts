// Types for Automation System

export type AutomationCategory = 
  | 'scheduling'
  | 'communication'
  | 'financial'
  | 'hr'
  | 'customer'
  | 'operations'
  | 'marketing'
  | 'sales'
  | 'compliance'
  | 'training'
  | 'forecasting'
  | 'analytics'
  | 'projects'
  | 'vendors'
  | 'facilities'
  | 'industry';

export interface AutomationDefinition {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  icon: string;
  inputs: AutomationInput[];
  outputType: 'document' | 'spreadsheet' | 'data' | 'email' | 'calendar';
  estimatedTime: string; // e.g., "2 minutes"
}

export interface AutomationInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
}

export interface AutomationResult {
  id: string;
  automationId: string;
  status: 'success' | 'error' | 'processing';
  output: any;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AutomationExecution {
  automationId: string;
  inputs: Record<string, any>;
  userId: string;
  workspaceId: string;
}

export interface CategoryInfo {
  id: AutomationCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  count: number;
}
