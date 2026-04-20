// Coze API Proxy - Vercel Serverless Function
// Handles SSE streaming format from Coze API

const COZE_API_URL = 'https://3vzkq4qypr.coze.site/stream_run';
const API_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjliOWYxZTRjLWE4ZWYtNDA4Yy1iYjU2LTMwNmI5NjJhMzllMCJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbImx5bXRQUTRRRHUzb05GamxnSmpYZnJadk1Pc1JiNUY1Il0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzc2Njk1MDI0LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjMwODI0OTc3MTEzMDIyNDkxIiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjMwODQ3MDIzNzQyMTg5NjIwIn0.iMsRXDihmP-lI9yW0tlw2Bd0gOJQMr-tDaLCnheFIu5iAWcDXmHFVBhQKe5F4XT8VDPnV6Z-AFfIzbBr0E4b0b_VBAUetTjKaS3CsSerJHVxN3CuO12HbRtayzxjFix52ql2zcAuClLbXcD8USbH45VbeWwPCnFqF6dbN2CSb2uiCkRWgoKT9JH-ft5W-ZjdmqBc2iEn-QVRfJzOW-y-iOULuY8B89DogofaA-44eadufJ22AQRKxMnsdre0RXGBqwclj7V9lWZLEwMXnHrCv7yAcKqc1BPA1pB8pKEDZJyC2YpYwWa_FXNXSxQUs8PcQ775JwLmxFXFapr5sCU0-g';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, session_id } = req.body;

    const response = await fetch(COZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        user_id: session_id || 'yuli_resume'
      })
    });

    if (!response.ok) {
      return res.status(200).json({
        error: `API returned ${response.status}`,
        message: response.statusText
      });
    }

    // Coze returns SSE stream - need to read all chunks
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer) {
          fullAnswer += processLine(buffer);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        fullAnswer += processLine(line);
      }
    }

    fullAnswer = fullAnswer.trim();

    return res.status(200).json({
      message: fullAnswer || '收到消息'
    });

  } catch (error) {
    console.error('Coze API Error:', error.message);
    return res.status(200).json({
      error: 'Failed to connect',
      message: error.message
    });
  }
}

function processLine(line) {
  if (!line.startsWith('data:')) return '';

  const jsonStr = line.slice(5).trim();
  if (!jsonStr) return '';

  try {
    const data = JSON.parse(jsonStr);
    if (data?.type === 'answer' && data?.content?.answer) {
      return data.content.answer;
    }
  } catch (e) {}

  return '';
}
