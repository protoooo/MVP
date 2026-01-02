"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Camera, Check } from "lucide-react";

interface TaskList {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Task {
  id: string;
  list_id: string;
  title: string;
  assignee_id?: string;
  due_date?: string;
  priority: string;
  is_complete: boolean;
  completion_notes?: string;
  photo_url?: string;
  ai_analysis?: string;
  completed_at?: string;
}

export default function ChecklistsTab() {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showPhotoUpload, setShowPhotoUpload] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchTaskLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetchTasks(selectedList);
    }
  }, [selectedList]);

  async function fetchTaskLists() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("task_lists")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTaskLists(data || []);
      if (data && data.length > 0 && !selectedList) {
        setSelectedList(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching task lists:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTasks(listId: string) {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTasks(prev => ({ ...prev, [listId]: data || [] }));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }

  async function createTaskList() {
    const name = prompt("Enter task list name:");
    if (!name) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from("staff")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (!staffData) return;

      const { data, error } = await supabase
        .from("task_lists")
        .insert({
          name,
          business_id: staffData.business_id,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;
      setTaskLists(prev => [data, ...prev]);
      setSelectedList(data.id);
    } catch (error) {
      console.error("Error creating task list:", error);
    }
  }

  async function addTask() {
    if (!newTaskTitle.trim() || !selectedList) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .insert({
          list_id: selectedList,
          title: newTaskTitle,
          priority: "medium",
          is_complete: false
        });

      if (error) throw error;
      setNewTaskTitle("");
      fetchTasks(selectedList);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  }

  async function toggleTask(taskId: string, isComplete: boolean) {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          is_complete: !isComplete,
          completed_at: !isComplete ? new Date().toISOString() : null
        })
        .eq("id", taskId);

      if (error) throw error;
      if (selectedList) {
        fetchTasks(selectedList);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  }

  async function uploadPhoto(taskId: string, file: File) {
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("task-photos")
        .upload(`${taskId}/${Date.now()}.jpg`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-photos")
        .getPublicUrl(uploadData.path);

      // Analyze with Cohere Vision
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("taskId", taskId);

      const response = await fetch("/api/cohere/analyze-photo", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const { analysis } = await response.json();
        
        // Update task with photo and analysis
        await supabase
          .from("tasks")
          .update({
            photo_url: publicUrl,
            ai_analysis: analysis
          })
          .eq("id", taskId);

        if (selectedList) {
          fetchTasks(selectedList);
        }
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  }

  function calculateProgress(listId: string): number {
    const listTasks = tasks[listId] || [];
    if (listTasks.length === 0) return 0;
    const completed = listTasks.filter(t => t.is_complete).length;
    return Math.round((completed / listTasks.length) * 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const currentTasks = selectedList ? (tasks[selectedList] || []) : [];
  const progress = selectedList ? calculateProgress(selectedList) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Task Checklists</h2>
        <button
          onClick={createTaskList}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Task Lists Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">Lists</h3>
            <div className="space-y-2">
              {taskLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => setSelectedList(list.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedList === list.id
                      ? "bg-indigo-50 border-2 border-indigo-600"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <p className="font-medium text-sm">{list.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {tasks[list.id]?.length || 0} tasks
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task Details */}
        <div className="lg:col-span-3">
          {selectedList ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">
                    {taskLists.find(l => l.id === selectedList)?.name}
                  </h3>
                  <span className="text-sm text-gray-600">{progress}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Add Task */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addTask()}
                    placeholder="Add a new task..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    onClick={addTask}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-2">
                {currentTasks.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id, task.is_complete)}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        task.is_complete
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-indigo-600"
                      }`}
                    >
                      {task.is_complete && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${task.is_complete ? "line-through text-gray-500" : ""}`}>
                        {task.title}
                      </p>
                      {task.ai_analysis && (
                        <div className={`mt-2 p-2 rounded text-sm ${
                          task.ai_analysis.includes("PASS") 
                            ? "bg-green-50 text-green-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          {task.ai_analysis}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowPhotoUpload(task.id)}
                      className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Select a list to view tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
