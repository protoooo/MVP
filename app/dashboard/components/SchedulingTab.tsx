"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

// Dynamically import react-big-calendar to avoid SSR issues
const Calendar = dynamic(() => import("react-big-calendar").then(mod => mod.Calendar), {
  ssr: false,
  loading: () => <div>Loading calendar...</div>
});

// Import moment for localizer
import moment from "moment";
import { momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface Schedule {
  id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  status: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  availability_prefs: any;
}

export default function SchedulingTab() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
    setupRealtimeSubscription();
  }, []);

  async function fetchSchedules() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("shift_date", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStaff() {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*");

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  }

  function setupRealtimeSubscription() {
    const channel = supabase
      .channel("schedules")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        (payload) => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function optimizeSchedule() {
    setOptimizing(true);
    try {
      const response = await fetch("/api/cohere/optimize-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff: staff.map(s => ({
            id: s.id,
            name: s.name,
            role: s.role,
            availability: s.availability_prefs,
            max_hours: 40
          })),
          requirements: {
            shifts_per_day: 2,
            roles_needed: { cook: 1, server: 2 }
          }
        })
      });

      if (response.ok) {
        const { schedules: newSchedules } = await response.json();
        // Insert new schedules into database
        for (const schedule of newSchedules) {
          await supabase.from("schedules").insert(schedule);
        }
        fetchSchedules();
      }
    } catch (error) {
      console.error("Error optimizing schedule:", error);
    } finally {
      setOptimizing(false);
    }
  }

  const events = schedules.map(schedule => ({
    id: schedule.id,
    title: `${schedule.role}`,
    start: new Date(`${schedule.shift_date}T${schedule.start_time}`),
    end: new Date(`${schedule.shift_date}T${schedule.end_time}`),
    resource: schedule
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Schedule Management</h2>
        <button
          onClick={optimizeSchedule}
          disabled={optimizing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {optimizing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              🤖 AI Optimize Schedule
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4" style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day"]}
          defaultView="week"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staff Availability */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Team Members</h3>
          <div className="space-y-2">
            {staff.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shift Swap Requests */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-4">Swap Requests</h3>
          <p className="text-gray-500 text-sm">No pending swap requests</p>
        </div>
      </div>
    </div>
  );
}
