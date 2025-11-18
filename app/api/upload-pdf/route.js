import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_CONTENT_LENGTH = 200000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🎟️ Token preview:', token.substring(0, 20) + '...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.business_id) {
      console.error('❌ Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('✅ Profile found, business_id:', profile.business_id);

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

    console.log('📖 Parsing PDF...');
    let pdfData;
    try {
      pdfData = await pdf(buffer);
    } catch (pdfError) {
      console.error('❌ PDF parse error:', pdfError);
      return NextResponse.json(
        { error: 'Failed to parse PDF. File may be corrupted or password-protected.' },
        { status: 400 }
      );
    }

    let content = pdfData.text;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'PDF appears to be empty or contains no readable text' },
        { status: 400 }
      );
    }

    console.log('✅ PDF parsed, content length:', content.length);

    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to length...]';
    }

    const sanitizedFileName = (fileName || file.name)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);

    console.log('💾 Saving to database...');

    const { data, error } = await supabase
      .from('documents')
      .insert({
        business_id: profile.business_id,
        name: sanitizedFileName,
        content: content,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      );
    }

    console.log('✅ Document saved:', data.id);

    return NextResponse.json({ 
      document: data,
      message: 'PDF uploaded successfully',
      charactersExtracted: content.length,
      wasTruncated: pdfData.text.length > MAX_CONTENT_LENGTH
    });

  } catch (error) {
    console.error('❌ PDF upload error:', error);
    
    let errorMessage = 'Failed to process PDF';
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
