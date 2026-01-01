import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeAgentTask, TaskProgress } from "@/lib/agent-task-executor";

// Store for SSE connections (in production, use Redis or similar)
const progressCallbacks = new Map<string, (progress: TaskProgress) => void>();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agentType, taskType, params, taskId } = body;

    if (!agentType || !taskType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Add userId to params
    const taskParams = { ...params, userId: user.id };

    // Track progress
    const progressUpdates: TaskProgress[] = [];
    
    const outputs = await executeAgentTask(
      agentType,
      taskType,
      taskParams,
      (progress) => {
        progressUpdates.push(progress);
        
        // Call SSE callback if exists
        const callback = progressCallbacks.get(taskId);
        if (callback) {
          callback(progress);
        }
      }
    );

    // Save task results to database
    if (outputs.length > 0) {
      await supabase.from("agent_tasks").insert({
        user_id: user.id,
        agent_type: agentType,
        task_type: taskType,
        task_params: params,
        outputs: outputs,
        status: "completed",
      });
    }

    return NextResponse.json({
      success: true,
      outputs,
      progressUpdates,
    });
  } catch (error) {
    console.error("Task execution error:", error);
    return NextResponse.json(
      { 
        error: "Failed to execute task",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET endpoint for task status/results
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const agentType = searchParams.get("agentType");

    let query = supabase
      .from("agent_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (taskId) {
      query = query.eq("id", taskId).single();
    } else if (agentType) {
      query = query.eq("agent_type", agentType).limit(10);
    } else {
      query = query.limit(20);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ tasks: data });
  } catch (error) {
    console.error("Task retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve tasks" },
      { status: 500 }
    );
  }
}
