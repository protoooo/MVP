"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, MoreHorizontal } from "lucide-react";
import type { DatabaseProperty, DatabaseItem, DatabasePropertyValue } from "@/lib/notion/types";

interface BoardViewProps {
  databaseId: string;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onItemsChange: () => void;
}

export default function BoardView({ databaseId, properties, items, onItemsChange }: BoardViewProps) {
  const [propertyValues, setPropertyValues] = useState<Record<string, DatabasePropertyValue[]>>({});
  const [groupByProperty, setGroupByProperty] = useState<DatabaseProperty | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Find first select or status property for grouping
    const selectProp = properties.find(p => p.type === 'select' || p.type === 'status');
    if (selectProp) {
      setGroupByProperty(selectProp);
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

  const getGroupedItems = () => {
    if (!groupByProperty) return { 'All Items': items };
    
    const groups: Record<string, DatabaseItem[]> = {};
    const options = groupByProperty.config?.options || [];
    
    // Create empty groups for all options
    options.forEach((option: any) => {
      groups[option.name] = [];
    });
    
    // Add items to groups
    items.forEach(item => {
      const value = getItemValue(item.id, groupByProperty.id);
      const groupName = value || 'No Status';
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
    });
    
    return groups;
  };

  const groups = getGroupedItems();

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {Object.entries(groups).map(([groupName, groupItems]) => (
        <div key={groupName} className="flex-shrink-0 w-80">
          <div className="bg-background-secondary rounded-lg">
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-text-primary">{groupName}</h3>
                  <span className="text-xs text-text-tertiary bg-background-tertiary px-2 py-0.5 rounded">
                    {groupItems.length}
                  </span>
                </div>
                <button className="p-1 hover:bg-background rounded">
                  <MoreHorizontal className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
            </div>
            
            <div className="p-2 space-y-2 min-h-[200px]">
              {groupItems.map(item => (
                <div
                  key={item.id}
                  className="bg-surface border border-border rounded-lg p-3 hover:border-indigo-500 cursor-pointer transition"
                >
                  <div className="font-medium text-sm text-text-primary mb-2">
                    Item {item.id.substring(0, 8)}
                  </div>
                  
                  {/* Show some property values */}
                  <div className="space-y-1">
                    {properties.slice(0, 3).map(prop => {
                      const value = getItemValue(item.id, prop.id);
                      if (!value) return null;
                      
                      return (
                        <div key={prop.id} className="text-xs text-text-secondary">
                          <span className="text-text-tertiary">{prop.name}:</span> {String(value)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-tertiary hover:bg-background rounded"
              >
                <Plus className="w-4 h-4" />
                Add item
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
