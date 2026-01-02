"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import type { DatabaseProperty, DatabaseItem, DatabasePropertyValue } from "@/lib/notion/types";

interface GalleryViewProps {
  databaseId: string;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onItemsChange: () => void;
}

export default function GalleryView({ databaseId, properties, items, onItemsChange }: GalleryViewProps) {
  const [propertyValues, setPropertyValues] = useState<Record<string, DatabasePropertyValue[]>>({});
  const [coverProperty, setCoverProperty] = useState<DatabaseProperty | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Find first files property for cover images
    const filesProp = properties.find(p => p.type === 'files');
    if (filesProp) {
      setCoverProperty(filesProp);
    }
    loadPropertyValues();
  }, [properties, items]);

  const loadPropertyValues = async () => {
    const values: Record<string, DatabasePropertyValue[]> = {};
    
    for (const item of items) {
      const { data } = await supabase
        .from('database_property_values')
        .select('*')
        .eq('item_id', item.id);
      
      if (data) {
        values[item.id] = data;
      }
    }
    
    setPropertyValues(values);
  };

  const getItemValue = (itemId: string, propertyId: string) => {
    const values = propertyValues[itemId] || [];
    const value = values.find(v => v.property_id === propertyId);
    return value?.value;
  };

  const getCoverImage = (itemId: string) => {
    if (!coverProperty) return null;
    const value = getItemValue(itemId, coverProperty.id);
    if (Array.isArray(value) && value.length > 0) {
      return value[0].url || value[0];
    }
    return null;
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => {
          const coverImage = getCoverImage(item.id);
          
          return (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-lg overflow-hidden hover:border-indigo-500 cursor-pointer transition group"
            >
              {/* Cover Image */}
              <div className="aspect-video bg-background-secondary flex items-center justify-center overflow-hidden">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <div className="text-text-tertiary text-4xl">📄</div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-medium text-text-primary mb-2 truncate">
                  Item {item.id.substring(0, 8)}
                </h3>
                
                <div className="space-y-1">
                  {properties.slice(0, 3).map(prop => {
                    if (prop.id === coverProperty?.id) return null;
                    const value = getItemValue(item.id, prop.id);
                    if (!value) return null;
                    
                    return (
                      <div key={prop.id} className="text-xs text-text-secondary truncate">
                        <span className="text-text-tertiary">{prop.name}:</span> {String(value)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add new card */}
        <button
          className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-text-tertiary hover:bg-background-secondary hover:border-indigo-500 transition"
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm">Add item</span>
        </button>
      </div>
    </div>
  );
}
