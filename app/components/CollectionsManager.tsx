'use client';

import { useState, useEffect } from 'react';
import { Folder, Plus, Edit2, Trash2, FolderPlus, X, Check, Grid3x3 } from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  file_count: number;
  total_size: number;
  last_updated?: string;
}

interface CollectionsManagerProps {
  onSelectCollection: (collectionId: number | null) => void;
  selectedCollectionId: number | null;
}

export default function CollectionsManager({ onSelectCollection, selectedCollectionId }: CollectionsManagerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#3ECF8E');
  const [formIcon, setFormIcon] = useState('folder');

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collections', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCollections(data.collections);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          color: formColor,
          icon: formIcon,
        }),
      });

      if (response.ok) {
        resetForm();
        setShowCreateModal(false);
        loadCollections();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const handleUpdate = async (collectionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          color: formColor,
          icon: formIcon,
        }),
      });

      if (response.ok) {
        resetForm();
        setEditingCollection(null);
        loadCollections();
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  };

  const handleDelete = async (collectionId: number) => {
    if (!confirm('Delete this collection? Files will not be deleted, only removed from this collection.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadCollections();
        if (selectedCollectionId === collectionId) {
          onSelectCollection(null);
        }
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('#3ECF8E');
    setFormIcon('folder');
  };

  const startEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setFormName(collection.name);
    setFormDescription(collection.description || '');
    setFormColor(collection.color);
    setFormIcon(collection.icon);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const availableColors = [
    '#3ECF8E', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#EC4899', '#6366F1'
  ];

  const availableIcons = [
    'folder', 'briefcase', 'archive', 'file-text', 'image', 'paperclip', 'shield', 'star'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Collections</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
          title="New collection"
        >
          <Plus className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* All Files Button */}
      <button
        onClick={() => onSelectCollection(null)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          selectedCollectionId === null
            ? 'bg-brand/10 text-brand border border-brand/30'
            : 'text-text-secondary hover:bg-surface-elevated border border-transparent'
        }`}
      >
        <Grid3x3 className="w-4 h-4" />
        <span className="flex-1 text-left">All Files</span>
      </button>

      {/* Collections List */}
      <div className="space-y-1">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
              selectedCollectionId === collection.id
                ? 'bg-brand/10 border border-brand/30'
                : 'hover:bg-surface-elevated border border-transparent'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: collection.color }}
            />
            
            <button
              onClick={() => onSelectCollection(collection.id)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <Folder className="w-4 h-4 flex-shrink-0" style={{ color: collection.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {collection.name}
                </p>
                <p className="text-xs text-text-tertiary">
                  {collection.file_count} files • {formatSize(collection.total_size)}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(collection);
                }}
                className="p-1 hover:bg-surface rounded transition-colors"
                title="Edit collection"
              >
                <Edit2 className="w-3.5 h-3.5 text-text-tertiary" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(collection.id);
                }}
                className="p-1 hover:bg-red-500/10 rounded transition-colors"
                title="Delete collection"
              >
                <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}

        {collections.length === 0 && (
          <div className="text-center py-8 text-text-tertiary">
            <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No collections yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs text-brand hover:text-brand-400 mt-1"
            >
              Create your first collection
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCollection) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">
                {editingCollection ? 'Edit Collection' : 'New Collection'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCollection(null);
                  resetForm();
                }}
                className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Tax Documents, Receipts, Photos"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary focus:border-brand focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What's this collection for?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary focus:border-brand focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        formColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCollection(null);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingCollection) {
                    handleUpdate(editingCollection.id);
                  } else {
                    handleCreate();
                  }
                }}
                disabled={!formName.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCollection ? 'Save Changes' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
