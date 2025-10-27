import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const pdfUrl = `${backendUrl}/uploads/${path}`;
    
    // Rediriger vers le backend
    return NextResponse.redirect(pdfUrl);
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
}


