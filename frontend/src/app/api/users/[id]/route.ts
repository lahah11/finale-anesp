import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Récupérer le token depuis les cookies ou les headers
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.headers.get('cookie')?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

    const response = await fetch(`${BACKEND_URL}/api/users/${params.id}`, {
      method: 'PUT',
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
        errorData = { error: 'Failed to update user' };
      }
      return NextResponse.json({ error: errorData.error || 'Failed to update user' }, { status: response.status });
    }

    let data;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = { success: true, message: 'User updated successfully' };
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      data = { success: true, message: 'User updated successfully' };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer le token depuis les cookies ou les headers
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.headers.get('cookie')?.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

    const response = await fetch(`${BACKEND_URL}/api/users/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Failed to delete user' };
      }
      return NextResponse.json({ error: errorData.error || 'Failed to delete user' }, { status: response.status });
    }

    let data;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      } else {
        data = { success: true, message: 'User deleted successfully' };
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      data = { success: true, message: 'User deleted successfully' };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
