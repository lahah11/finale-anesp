import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token depuis les cookies ou les headers
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
    
    const response = await fetch(`${BACKEND_URL}/api/logistics/vehicles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Récupérer le token depuis les cookies ou les headers
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
    
    const response = await fetch(`${BACKEND_URL}/api/logistics/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Failed to create vehicle' };
      }
      return NextResponse.json({ error: errorData.error || 'Failed to create vehicle' }, { status: response.status });
    }

    let data;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = { success: true, message: 'Vehicle created successfully' };
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      data = { success: true, message: 'Vehicle created successfully' };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
