import { cohere } from "./cohere";
import { getAgentTools, toolsToCohereFunctions, executeTool, ToolResult } from "./agent-tools";

// Get chat model from environment variable
const CHAT_MODEL = process.env.COHERE_CHAT_MODEL || "aya-expanse-32b";

export interface AgentTask {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  steps: AgentStep[];
  currentStep: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  toolCalls: ToolCall[];
  result?: any;
  error?: string;
}

export interface ToolCall {
  tool: string;
  parameters: any;
  result?: ToolResult;
}

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export class AutonomousAgent {
  private agentType: string;
  private conversationHistory: AgentMessage[];
  private tools: any[];
  private maxIterations: number;

  constructor(agentType: string, maxIterations: number = 10) {
    this.agentType = agentType;
    this.conversationHistory = [];
    this.tools = toolsToCohereFunctions(getAgentTools(agentType));
    this.maxIterations = maxIterations;
  }

  async processMessage(
    userMessage: string,
    systemPrompt: string,
    onProgress?: (update: string) => void
  ): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    let iteration = 0;
    let finalResponse = "";

    while (iteration < this.maxIterations) {
      iteration++;

      try {
        // Call Cohere with tools
        const response = await cohere.chat({
          model: CHAT_MODEL,
          message: userMessage,
          chatHistory: this.conversationHistory
            .filter(m => m.role !== "tool")
            .map(m => ({
              role: m.role === "user" ? "USER" : "CHATBOT",
              message: m.content,
            })),
          preamble: systemPrompt,
          tools: this.tools.length > 0 ? this.tools : undefined,
          temperature: 0.7,
        });

        // Check if agent wants to use tools
        if (response.toolCalls && response.toolCalls.length > 0) {
          onProgress?.(`Using ${response.toolCalls.length} tool(s)...`);

          // Execute tool calls
          const toolResults: ToolResult[] = [];
          for (const toolCall of response.toolCalls) {
            onProgress?.(`Executing: ${toolCall.name}`);
            
            const result = await executeTool(
              toolCall.name,
              toolCall.parameters,
              this.agentType
            );
            
            toolResults.push(result);
          }

          // Add tool results to conversation
          this.conversationHistory.push({
            role: "assistant",
            content: response.text || "",
            toolCalls: response.toolCalls.map((tc: any) => ({
              tool: tc.name,
              parameters: tc.parameters,
            })),
          });

          this.conversationHistory.push({
            role: "tool",
            content: JSON.stringify(toolResults),
            toolResults,
          });

          // Continue the conversation with tool results
          const followUpResponse = await cohere.chat({
            model: CHAT_MODEL,
            message: "",
            chatHistory: this.conversationHistory.map(m => ({
              role: m.role === "user" ? "USER" : m.role === "tool" ? "SYSTEM" : "CHATBOT",
              message: m.content,
            })),
            preamble: systemPrompt,
            tools: this.tools.length > 0 ? this.tools : undefined,
            temperature: 0.7,
          });

          // Check if we're done or need more iterations
          if (!followUpResponse.toolCalls || followUpResponse.toolCalls.length === 0) {
            finalResponse = followUpResponse.text;
            this.conversationHistory.push({
              role: "assistant",
              content: finalResponse,
            });
            break;
          }
        } else {
          // No tool calls, we have our final response
          finalResponse = response.text;
          this.conversationHistory.push({
            role: "assistant",
            content: finalResponse,
          });
          break;
        }
      } catch (error) {
        console.error("Agent execution error:", error);
        finalResponse = "I encountered an error while processing your request. Please try again.";
        break;
      }
    }

    if (iteration >= this.maxIterations) {
      finalResponse += "\n\n(Note: Maximum iterations reached. Task may be incomplete.)";
    }

    return finalResponse;
  }

  async executeTask(
    taskDescription: string,
    systemPrompt: string,
    onProgress?: (update: string) => void
  ): Promise<AgentTask> {
    const task: AgentTask = {
      id: `task_${Date.now()}`,
      description: taskDescription,
      status: "in_progress",
      steps: [],
      currentStep: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onProgress?.(`Starting task: ${taskDescription}`);

    try {
      // Break down task into steps
      onProgress?.("Analyzing task and creating plan...");
      
      const planningPrompt = `Break down this task into clear, actionable steps: ${taskDescription}`;
      const planResponse = await this.processMessage(planningPrompt, systemPrompt, onProgress);

      // Execute the task
      const result = await this.processMessage(
        `Execute this task: ${taskDescription}. Use available tools as needed.`,
        systemPrompt,
        onProgress
      );

      task.result = result;
      task.status = "completed";
      task.updatedAt = new Date();
      onProgress?.("Task completed successfully!");
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";
      task.updatedAt = new Date();
      onProgress?.(`Task failed: ${task.error}`);
    }

    return task;
  }

  getConversationHistory(): AgentMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// Agent memory management
export class AgentMemory {
  private agentId: string;
  private userId: string;

  constructor(agentId: string, userId: string) {
    this.agentId = agentId;
    this.userId = userId;
  }

  async store(key: string, value: any, category?: string): Promise<void> {
    // Store in Supabase agent_memory table
    // This would use the Supabase client
    console.log("Storing memory:", { key, value, category });
  }

  async retrieve(key: string): Promise<any> {
    // Retrieve from Supabase agent_memory table
    console.log("Retrieving memory:", key);
    return null;
  }

  async search(query: string, category?: string): Promise<any[]> {
    // Semantic search in agent memories using embeddings
    console.log("Searching memories:", { query, category });
    return [];
  }

  async getRelevantMemories(context: string, limit: number = 5): Promise<any[]> {
    // Get most relevant memories for current context
    console.log("Getting relevant memories for:", context);
    return [];
  }
}

// Progress tracking for long-running tasks
export class TaskProgressTracker {
  private tasks: Map<string, AgentTask>;

  constructor() {
    this.tasks = new Map();
  }

  createTask(description: string): AgentTask {
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description,
      status: "pending",
      steps: [],
      currentStep: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(taskId: string, updates: Partial<AgentTask>): void {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);
      task.updatedAt = new Date();
    }
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  deleteTask(taskId: string): void {
    this.tasks.delete(taskId);
  }
}

export const globalTaskTracker = new TaskProgressTracker();
