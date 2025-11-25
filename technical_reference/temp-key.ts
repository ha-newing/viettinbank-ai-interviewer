import { NextResponse } from 'next/server';

const SONIOX_API_BASE_URL = 'https://api.soniox.com';

export async function POST() {
  const apiKey = process.env.SONIOX_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Soniox API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${SONIOX_API_BASE_URL}/v1/auth/temporary-api-key`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 300, // 5 minutes
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Soniox temp key error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create temporary API key' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ apiKey: data.api_key });
  } catch (error) {
    console.error('Soniox temp key error:', error);
    return NextResponse.json(
      { error: 'Failed to create temporary API key' },
      { status: 500 }
    );
  }
}
