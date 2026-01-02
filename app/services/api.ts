import { AuthResponse, User, FileListResponse, SearchResult } from '../types';

// For single-service deployment, API is on the same domain
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to set auth token
export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

// Helper function to clear auth token
export const clearAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

// Auth API
export const authAPI = {
  async register(email: string, password: string, businessName?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, businessName }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data = await response.json();
    setAuthToken(data.token);
    return data;
  },

  async getMe(): Promise<User> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user');
    }
    
    const data = await response.json();
    return data.user;
  },

  logout() {
    clearAuthToken();
  },
};

// Files API
export const filesAPI = {
  async upload(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      xhr.open('POST', `${API_URL}/api/files/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  async list(page: number = 1, limit: number = 20): Promise<FileListResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/files?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to list files');
    }
    
    return response.json();
  },

  async getById(id: number): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/files/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get file');
    }
    
    return response.json();
  },

  async delete(id: number): Promise<void> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/files/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },

  getDownloadUrl(id: number): string {
    const token = getAuthToken();
    return `${API_URL}/api/files/${id}/download?token=${token}`;
  },
};

// Search API
export const searchAPI = {
  async search(query: string): Promise<SearchResult> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    return response.json();
  },

  async getSuggestions(): Promise<{ recent: string[]; examples: string[] }> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/search/suggestions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get suggestions');
    }
    
    return response.json();
  },
};
