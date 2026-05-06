import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const applicationId = formData.get('application_id') as string;
    const documentType = formData.get('document_type') as string;

    if (!file || !applicationId || !documentType) {
      return NextResponse.json({ error: 'Missing file or metadata' }, { status: 400 });
    }

    // 1. Upload to Private Bucket
    const fileExt = file.name.split('.').pop();
    const fileName = `${applicationId}/${documentType}_${Date.now()}.${fileExt}`;
    const storagePath = `documents/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('private_docs') // Ensure this bucket is created in Supabase
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 2. Create Document Record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        application_id: applicationId,
        document_type: documentType,
        storage_path: storagePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        is_geo_tagged: false // Will be updated by EXIF extractor later
      })
      .select()
      .single();

    if (docError) throw docError;

    return NextResponse.json({ success: true, document });

  } catch (error: any) {
    console.error('[Document Upload] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
