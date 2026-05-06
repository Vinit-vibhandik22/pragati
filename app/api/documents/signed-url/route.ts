import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    // 1. Fetch document metadata and verify access (RLS handles access)
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    // 2. Generate Signed URL (60 minute expiry)
    const { data: urlData, error: signError } = await supabase.storage
      .from('private_docs')
      .createSignedUrl(document.storage_path, 3600);

    if (signError) throw signError;

    return NextResponse.json({ signedUrl: urlData.signedUrl });

  } catch (error: any) {
    console.error('[Signed URL] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
