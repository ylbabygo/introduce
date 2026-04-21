// Coze API Proxy - Vercel Serverless Function
// Handles chat API format from Coze API

const COZE_API_URL = 'https://api.coze.cn/open_api/v2/chat';

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
        'Authorization': `Bearer ${process.env.COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        bot_id: process.env.COZE_BOT_ID,
        user_id: session_id || 'yuli_resume',
        session_id: session_id,
        query: query,
        stream: false
      })
    });

    if (!response.ok) {
      return res.status(200).json({
        error: `API returned ${response.status}`,
        message: response.statusText
      });
    }

    const data = await response.json();
    console.log('Coze API Response:', JSON.stringify(data));

    // Extract answer from messages array
    let answer = '';
    if (data.messages && data.messages.length > 0) {
      // Find message with type 'answer'
      const answerMsg = data.messages.find(msg => msg.type === 'answer');
      if (answerMsg && answerMsg.content) {
        answer = answerMsg.content;
      } else {
        // If no answer type, get the last message
        const lastMsg = data.messages[data.messages.length - 1];
        answer = lastMsg?.content || '';
      }
    }

    // Also check for conversation_id in response for context
    if (data.conversation_id) {
      console.log('Conversation ID:', data.conversation_id);
    }

    return res.status(200).json({
      message: answer || '收到消息',
      conversation_id: data.conversation_id
    });

  } catch (error) {
    console.error('Coze API Error:', error.message);
    return res.status(200).json({
      error: 'Failed to connect',
      message: error.message
    });
  }
}
