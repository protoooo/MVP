"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, MoreHorizontal, Eye, Table as TableIcon, LayoutGrid, Calendar, List, ChevronDown } from "lucide-react";
import type { Database, DatabaseProperty, DatabaseView, DatabaseItem } from "@/lib/notion/types";

interface DatabaseTableProps {
  databaseId: string;
}

export default function DatabaseTable({ databaseId }: DatabaseTableProps) {
  const [database, setDatabase] = useState<Database | null>(null);
  const [properties, setProperties] = useState<DatabaseProperty[]>([]);
  const [views, setViews] = useState<DatabaseView[]>([]);
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [currentView, setCurrentView] = useState<DatabaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDatabase();
  }, [databaseId]);

  const loadDatabase = async () => {
    try {
      setLoading(true);
      
      // Load database metadata
      const { data: dbData } = await supabase
        .from("databases")
        .select("*")
        .eq("id", databaseId)
        .single();
      
      if (dbData) {
        setDatabase(dbData);
        
        // Load properties
        const { data: propsData } = await supabase
          .from("database_properties")
          .select("*")
          .eq("database_id", databaseId)
          .order("position");
        
        setProperties(propsData || []);
        
        // Load views
        const { data: viewsData } = await supabase
          .from("database_views")
          .select("*")
          .eq("database_id", databaseId)
          .order("position");
        
        setViews(viewsData || []);
        if (viewsData && viewsData.length > 0) {
          setCurrentView(viewsData.find(v => v.is_default) || viewsData[0]);
        }
        
        // Load items
        const { data: itemsData } = await supabase
          .from("database_items")
          .select("*")
          .eq("database_id", databaseId)
          .order("position");
        
        setItems(itemsData || []);
      }
    } catch (error) {
      console.error("Error loading database:", error);
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async () => {
    const name = prompt("Property name:");
    if (!name) return;
    
    const { error } = await supabase
      .from("database_properties")
      .insert({
        database_id: databaseId,
        name,
        type: "text",
        position: properties.length
      });
    
    if (!error) {
      await loadDatabase();
    }
  };

  const addItem = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Create a new page for the item
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .insert({
        workspace_id: database?.page_id, // This would need to be properly set
        title: "Untitled",
        created_by: user.id
      })
      .select()
      .single();
    
    if (!pageError && page) {
      const { error } = await supabase
        .from("database_items")
        .insert({
          database_id: databaseId,
          page_id: page.id,
          position: items.length
        });
      
      if (!error) {
        await loadDatabase();
      }
    }
  };

  const getViewIcon = (type: string) => {
    switch (type) {
      case "table": return <TableIcon className="w-4 h-4" />;
      case "board": return <LayoutGrid className="w-4 h-4" />;
      case "calendar": return <Calendar className="w-4 h-4" />;
      case "list": return <List className="w-4 h-4" />;
      default: return <TableIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-text-tertiary">
        Loading database...
      </div>
    );
  }

  if (!database) {
    return (
      <div className="p-4 text-center text-text-tertiary">
        Database not found
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Database Header */}
      <div className="border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{database.icon || "📊"}</span>
          <h3 className="font-semibold text-text-primary">{database.name}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Selector */}
          {views.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-background-secondary rounded-md">
              {getViewIcon(currentView?.type || "table")}
              <span className="text-sm text-text-secondary">{currentView?.name}</span>
              <ChevronDown className="w-3 h-3 text-text-tertiary" />
            </div>
          )}
          
          <button className="p-1 hover:bg-background-secondary rounded">
            <MoreHorizontal className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Table View */}
      {currentView?.type === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {properties.map((prop) => (
                  <th
                    key={prop.id}
                    className="px-4 py-2 text-left text-sm font-medium text-text-secondary bg-background-secondary"
                  >
                    {prop.name}
                  </th>
                ))}
                <th className="px-4 py-2 w-10 bg-background-secondary">
                  <button
                    onClick={addProperty}
                    className="p-1 hover:bg-background-tertiary rounded"
                  >
                    <Plus className="w-3 h-3 text-text-tertiary" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={properties.length + 1} className="px-4 py-8 text-center text-text-tertiary">
                    <p className="mb-2">No items yet</p>
                    <button
                      onClick={addItem}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Add an item
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-background-secondary">
                    {properties.map((prop) => (
                      <td key={prop.id} className="px-4 py-2 text-sm text-text-primary">
                        <input
                          type="text"
                          placeholder="Empty"
                          className="w-full bg-transparent border-none outline-none"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Row Button */}
      {items.length > 0 && (
        <div className="border-t border-border p-2">
          <button
            onClick={addItem}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-tertiary hover:bg-background-secondary rounded"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      )}
    </div>
  );
}
