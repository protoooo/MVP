import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Force dynamic so it checks for files every time you load the page
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Point to the "public/documents" folder in your code
    const documentsDir = path.join(process.cwd(), "public", "documents");

    // Safety check: if folder is missing, return empty list
    if (!fs.existsSync(documentsDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = fs.readdirSync(documentsDir);

    // Filter out the placeholder text file and hidden system files
    const fileList = files
      .filter(fileName => fileName !== 'keep.txt' && !fileName.startsWith('.'))
      .map((fileName) => {
        const filePath = path.join(documentsDir, fileName);
        const stats = fs.statSync(filePath);
        return {
            name: fileName,
            size: (stats.size / 1024).toFixed(2) + " KB",
        };
    });

    return NextResponse.json({ files: fileList });

  } catch (error) {
    console.error("Error reading document list:", error);
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}
