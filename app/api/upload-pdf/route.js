import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request) {
  try {
    // Simple admin password check
    const adminPassword = request.headers.get('x-admin-password');
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      console.error('❌ Unauthorized upload attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Admin authenticated');

    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📄 File received:', fileName || file.name, 'Size:', file.size);

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let content;
    let finalFileName = (fileName || file.name)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);

    // Handle PDFs
    if (file.name.endsWith('.pdf')) {
      console.log('📖 Parsing PDF...');
      try {
        const pdfData = await pdf(buffer);
        content = pdfData.text;
      } catch (pdfError) {
        console.error('❌ PDF parse error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to parse PDF. File may be corrupted or password-protected.' },
          { status: 400 }
        );
      }

      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { error: 'PDF appears to be empty or contains no readable text' },
          { status: 400 }
        );
      }

      console.log('✅ PDF parsed, content length:', content.length);
      
      // Save as .txt file
      finalFileName = finalFileName.replace('.pdf', '.txt');
    } else {
      // Handle text files
      content = buffer.toString('utf-8');
    }

    // Save to knowledge-base directory
    const knowledgeDir = path.join(process.cwd(), 'knowledge-base');
    
    // Create directory if it doesn't exist
    try {
      await fs.mkdir(knowledgeDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    const filePath = path.join(knowledgeDir, finalFileName);
    await fs.writeFile(filePath, content, 'utf-8');

    console.log('✅ File saved:', filePath);

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      fileName: finalFileName,
      charactersExtracted: content.length,
      path: `/knowledge-base/${finalFileName}`
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    let errorMessage = 'Failed to process file';
    if (error.message.includes('timeout')) {
      errorMessage = 'Upload timed out. Please try a smaller file.';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection.';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// List files endpoint
export async function GET(request) {
  try {
    // Simple admin password check
    const adminPassword = request.headers.get('x-admin-password');
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const knowledgeDir = path.join(process.cwd(), 'knowledge-base');
    
    try {
      const files = await fs.readdir(knowledgeDir);
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.stat(path.join(knowledgeDir, file));
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      
      return NextResponse.json({ files: fileDetails });
    } catch (err) {
      return NextResponse.json({ files: [] });
    }

  } catch (error) {
    console.error('❌ List files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// Delete file endpoint
export async function DELETE(request) {
  try {
    const adminPassword = request.headers.get('x-admin-password');
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName } = await request.json();
    if (!fileName) {
      return NextResponse.json({ error: 'No fileName provided' }, { status: 400 });
    }

    const knowledgeDir = path.join(process.cwd(), 'knowledge-base');
    const filePath = path.join(knowledgeDir, fileName);

    await fs.unlink(filePath);
    console.log('✅ File deleted:', filePath);

    return NextResponse.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
