"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DatabaseProperty, DatabaseItem, DatabasePropertyValue } from "@/lib/notion/types";

interface CalendarViewProps {
  databaseId: string;
  properties: DatabaseProperty[];
  items: DatabaseItem[];
  onItemsChange: () => void;
}

export default function CalendarView({ databaseId, properties, items, onItemsChange }: CalendarViewProps) {
  const [propertyValues, setPropertyValues] = useState<Record<string, DatabasePropertyValue[]>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateProperty, setDateProperty] = useState<DatabaseProperty | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Find first date property
    const dateProp = properties.find(p => p.type === 'date');
    if (dateProp) {
      setDateProperty(dateProp);
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getItemsForDate = (date: Date) => {
    if (!dateProperty) return [];
    
    return items.filter(item => {
      const value = getItemValue(item.id, dateProperty.id);
      if (!value) return false;
      
      const itemDate = new Date(value);
      return itemDate.toDateString() === date.toDateString();
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">{monthName}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-background-secondary rounded"
          >
            <ChevronLeft className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm hover:bg-background-secondary rounded"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-background-secondary rounded"
          >
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div
            key={day}
            className="bg-background-secondary p-2 text-center text-xs font-medium text-text-tertiary"
          >
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-surface p-2 min-h-[100px]" />
        ))}

        {/* Calendar days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const itemsOnDate = getItemsForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={day}
              className={`bg-surface p-2 min-h-[100px] ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className={`text-sm mb-1 ${isToday ? 'font-bold text-indigo-600' : 'text-text-secondary'}`}>
                {day}
              </div>
              <div className="space-y-1">
                {itemsOnDate.map(item => (
                  <div
                    key={item.id}
                    className="text-xs bg-indigo-100 text-indigo-900 rounded px-2 py-1 truncate cursor-pointer hover:bg-indigo-200"
                  >
                    Item {item.id.substring(0, 8)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!dateProperty && (
        <div className="mt-4 p-4 bg-background-secondary rounded text-center text-text-tertiary text-sm">
          Add a date property to use calendar view
        </div>
      )}
    </div>
  );
}
