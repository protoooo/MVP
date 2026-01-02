import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPage, createBlock } from "@/lib/notion/page-utils";
import type { BlockType } from "@/lib/notion/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const workspaceId = formData.get("workspaceId") as string;
    const format = formData.get("format") as string;
    
    if (!file || !workspaceId || !format) {
      return NextResponse.json(
        { error: "file, workspaceId, and format are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const content = await file.text();

    let pageId: string;
    switch (format) {
      case "markdown":
        pageId = await importMarkdown(content, workspaceId, user.id);
        break;
      case "text":
        pageId = await importText(content, workspaceId, user.id);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported format" },
          { status: 400 }
        );
    }

    return NextResponse.json({ pageId, success: true });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}

async function importMarkdown(content: string, workspaceId: string, userId: string): Promise<string> {
  const lines = content.split('\n');
  
  // Extract title from first heading or use filename
  let title = 'Imported Document';
  const firstLine = lines[0];
  if (firstLine?.startsWith('# ')) {
    title = firstLine.replace(/^#\s+/, '');
    lines.shift();
  }
  
  // Create page
  const page = await createPage(workspaceId, userId, title);
  
  // Parse and create blocks
  let position = 0;
  let inCodeBlock = false;
  let codeContent: string[] = [];
  
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        await createBlock(page.id, 'code', { text: codeContent.join('\n') });
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }
    
    // Headings
    if (line.startsWith('### ')) {
      await createBlock(page.id, 'heading3', { text: line.replace(/^###\s+/, '') });
    } else if (line.startsWith('## ')) {
      await createBlock(page.id, 'heading2', { text: line.replace(/^##\s+/, '') });
    } else if (line.startsWith('# ')) {
      await createBlock(page.id, 'heading1', { text: line.replace(/^#\s+/, '') });
    }
    // Lists
    else if (line.match(/^[\*\-]\s+/)) {
      await createBlock(page.id, 'bullet', { text: line.replace(/^[\*\-]\s+/, '') });
    } else if (line.match(/^\d+\.\s+/)) {
      await createBlock(page.id, 'number', { text: line.replace(/^\d+\.\s+/, '') });
    }
    // Quotes
    else if (line.startsWith('> ')) {
      await createBlock(page.id, 'quote', { text: line.replace(/^>\s+/, '') });
    }
    // Divider
    else if (line.match(/^[\-\*_]{3,}$/)) {
      await createBlock(page.id, 'divider', {});
    }
    // Images
    else if (line.match(/!\[([^\]]*)\]\(([^\)]+)\)/)) {
      const match = line.match(/!\[([^\]]*)\]\(([^\)]+)\)/);
      if (match) {
        await createBlock(page.id, 'image', { url: match[2], caption: match[1] });
      }
    }
    // Regular text
    else {
      await createBlock(page.id, 'text', { text: line });
    }
    
    position++;
  }
  
  return page.id;
}

async function importText(content: string, workspaceId: string, userId: string): Promise<string> {
  const lines = content.split('\n');
  
  // Use first line as title or default
  const title = lines[0] || 'Imported Text';
  const page = await createPage(workspaceId, userId, title);
  
  // Create text blocks for each paragraph
  const paragraphs = content.split('\n\n');
  for (const paragraph of paragraphs) {
    if (paragraph.trim()) {
      await createBlock(page.id, 'text', { text: paragraph.trim() });
    }
  }
  
  return page.id;
}
