import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPageWithBlocks } from "@/lib/notion/page-utils";

export async function POST(request: NextRequest) {
  try {
    const { pageId, format } = await request.json();
    
    if (!pageId || !format) {
      return NextResponse.json(
        { error: "pageId and format are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get page with blocks
    const { page, blocks } = await getPageWithBlocks(pageId);

    switch (format) {
      case "markdown":
        return exportMarkdown(page, blocks);
      case "html":
        return exportHTML(page, blocks);
      case "pdf":
        return exportPDF(page, blocks);
      default:
        return NextResponse.json(
          { error: "Unsupported format" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
}

function exportMarkdown(page: any, blocks: any[]) {
  let markdown = `# ${page.title}\n\n`;
  
  blocks.forEach((block) => {
    const content = block.content.text || "";
    
    switch (block.type) {
      case "heading1":
        markdown += `# ${content}\n\n`;
        break;
      case "heading2":
        markdown += `## ${content}\n\n`;
        break;
      case "heading3":
        markdown += `### ${content}\n\n`;
        break;
      case "bullet":
        markdown += `- ${content}\n`;
        break;
      case "number":
        markdown += `1. ${content}\n`;
        break;
      case "quote":
        markdown += `> ${content}\n\n`;
        break;
      case "code":
        markdown += `\`\`\`\n${content}\n\`\`\`\n\n`;
        break;
      case "divider":
        markdown += `---\n\n`;
        break;
      case "image":
        markdown += `![${block.content.caption || ""}](${block.content.url})\n\n`;
        break;
      default:
        markdown += `${content}\n\n`;
    }
  });

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="${page.title}.md"`,
    },
  });
}

function exportHTML(page: any, blocks: any[]) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${page.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${page.title}</h1>
`;

  blocks.forEach((block) => {
    const content = block.content.text || "";
    
    switch (block.type) {
      case "heading1":
        html += `  <h1>${content}</h1>\n`;
        break;
      case "heading2":
        html += `  <h2>${content}</h2>\n`;
        break;
      case "heading3":
        html += `  <h3>${content}</h3>\n`;
        break;
      case "bullet":
        html += `  <ul><li>${content}</li></ul>\n`;
        break;
      case "number":
        html += `  <ol><li>${content}</li></ol>\n`;
        break;
      case "quote":
        html += `  <blockquote>${content}</blockquote>\n`;
        break;
      case "code":
        html += `  <pre><code>${content}</code></pre>\n`;
        break;
      case "divider":
        html += `  <hr>\n`;
        break;
      case "image":
        html += `  <img src="${block.content.url}" alt="${block.content.caption || ""}">\n`;
        break;
      default:
        html += `  <p>${content}</p>\n`;
    }
  });

  html += `</body>\n</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="${page.title}.html"`,
    },
  });
}

async function exportPDF(page: any, blocks: any[]) {
  // This would use jspdf which is already in dependencies
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  
  let y = 20;
  const lineHeight = 7;
  const pageHeight = doc.internal.pageSize.height;
  
  // Title
  doc.setFontSize(20);
  doc.text(page.title, 20, y);
  y += lineHeight * 2;
  
  // Blocks
  doc.setFontSize(12);
  blocks.forEach((block) => {
    const content = block.content.text || "";
    
    // Check if we need a new page
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    
    switch (block.type) {
      case "heading1":
        doc.setFontSize(18);
        doc.text(content, 20, y);
        doc.setFontSize(12);
        y += lineHeight * 1.5;
        break;
      case "heading2":
        doc.setFontSize(16);
        doc.text(content, 20, y);
        doc.setFontSize(12);
        y += lineHeight * 1.3;
        break;
      case "heading3":
        doc.setFontSize(14);
        doc.text(content, 20, y);
        doc.setFontSize(12);
        y += lineHeight * 1.2;
        break;
      default:
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, 20, y);
        y += lineHeight * lines.length;
    }
    
    y += lineHeight * 0.5;
  });
  
  const pdfBlob = doc.output("arraybuffer");
  
  return new NextResponse(pdfBlob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${page.title}.pdf"`,
    },
  });
}
