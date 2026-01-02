"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import type { DatabaseProperty, DatabaseItem, DatabasePropertyValue } from "@/lib/notion/types";

interface ListViewProps {
  databaseId: string;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onItemsChange: () => void;
}

export default function ListView({ databaseId, properties, items, onItemsChange }: ListViewProps) {
  const [propertyValues, setPropertyValues] = useState<Record<string, DatabasePropertyValue[]>>({});
  const supabase = createClient();

  useEffect(() => {
    loadPropertyValues();
  }, [items]);

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

  return (
    <div className="p-4">
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary">
            <p className="mb-2">No items yet</p>
            <button className="text-sm text-indigo-600 hover:text-indigo-700">
              Add an item
            </button>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-lg p-4 hover:border-indigo-500 cursor-pointer transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary mb-2">
                    Item {item.id.substring(0, 8)}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {properties.map(prop => {
                      const value = getItemValue(item.id, prop.id);
                      if (!value) return null;
                      
                      return (
                        <div key={prop.id} className="text-sm">
                          <span className="text-text-tertiary">{prop.name}:</span>{' '}
                          <span className="text-text-secondary">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-text-tertiary hover:bg-background-secondary rounded-lg border-2 border-dashed border-border"
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>
    </div>
  );
}
