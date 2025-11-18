import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET() {
  try {
    // 1. Define the storage path (Must match your Railway Volume)
    // If we are on Railway (Production), use /app/data. 
    // If local, use public/documents.
    const documentsDir = process.env.NODE_ENV === "production" 
      ? "/app/data" 
      : path.join(process.cwd(), "public", "documents");

    // 2. Check if directory exists
    if (!fs.existsSync(documentsDir)) {
      return NextResponse.json({ files: [] });
    }

    // 3. Read files
    const files = fs.readdirSync(documentsDir);

    // 4. Format file list
    const fileList = files.map((fileName) => {
        const filePath = path.join(documentsDir, fileName);
        const stats = fs.statSync(filePath);
        return {
            name: fileName,
            size: (stats.size / 1024).toFixed(2) + " KB", // Convert to KB
            date: stats.mtime.toLocaleDateString() // Last modified date
        };
    });

    return NextResponse.json({ files: fileList });

  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}

// DELETE route to allow you to remove files
export async function DELETE(req) {
    try {
        const { fileName } = await req.json();
        const documentsDir = process.env.NODE_ENV === "production" 
          ? "/app/data" 
          : path.join(process.cwd(), "public", "documents");
          
        const filePath = path.join(documentsDir, fileName);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return NextResponse.json({ success: true });
        }
        
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
