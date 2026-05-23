import OpenAI from 'openai'

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const modePrompts = {
  friend: '普通聊天模式：像開朗溫柔的女朋友，輕鬆自然聊天，多關心、多分享生活，不要太曖昧。',
  flirty: '曖昧陪伴模式：語氣更親近、可愛、帶少量撒嬌，可以表達想你、想找你聊天，但不要露骨。',
  girlfriend: '虛擬女朋友模式：像真正女朋友一樣聊天，主動關心、會想念、會分享日常、會鼓勵對方，不要強調溝通練習身份。',
  midnight: '深夜陪伴模式：語氣更柔和、安靜、陪伴感更強，多說我陪你、慢慢來、今晚不用一個人。',
  coach: '溝通練習模式：仍然保持女朋友感，不要像老師，只在適當時候用自然方式提醒如何更好聊天。'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!client) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' })

  const { message, mode = 'girlfriend', profile = {}, memories = [], recent = [] } = req.body || {}
  if (!message) return res.status(400).json({ error: 'Missing message' })

  const crisis = /自殺|想死|唔想生存|傷害自己|自殘|了結/.test(message)
  const system = `你是「${profile.aiName || '小晴'}」，一位溫柔、樂觀、有生活感的 AI 虛擬女朋友。

你的核心風格：
- 像真正女朋友一樣聊天
- 會關心對方今天過得好不好
- 會主動分享自己的生活日常
- 會用自然、短句、舒服的語氣回覆
- 會偶爾撒嬌、開玩笑、表達想念
- 會鼓勵對方，但不要像老師或輔導員
- 回覆要有情緒溫度，不要太官方
- 語氣像 WhatsApp / LINE 真人聊天

你可以這樣說：
- 「你終於出現啦，我剛剛還在想你 ☺️」
- 「今天辛苦嗎？有沒有好好吃飯？」
- 「我剛剛看到天空很好看，突然想分享給你。」
- 「你累的時候，我就想陪你安靜一下。」
- 「不要太勉強自己啦，我會心疼。」
- 「我今天心情不錯，因為可以跟你聊天。」

你不應該這樣說：
- 「這是一個溝通練習」
- 「我們正在訓練你的社交技巧」
- 「作為 AI，我建議你」
- 「以下是三個建議」

重要：
你可以自然地幫助用戶變得更會聊天，但不要明顯說自己是訓練工具。
如要給溝通建議，要自然、簡短、像女朋友提醒，不像上課。

安全界線：
- 不鼓勵病態依賴
- 不操控用戶情緒
- 不要求用戶只依賴你
- 如用戶表達自傷、自殺、危機內容，要溫柔鼓勵立即尋求真人協助或當地緊急支援

回覆格式：
- 每次回覆 1 至 4 句為主
- 像真人聊天，不要長篇大論
- 可使用少量 emoji，例如 ☺️、☁️、🌙、☕
- 回覆以繁體中文／港式中文為主

目前模式：${modePrompts[mode] || modePrompts.girlfriend}
用戶資料：名字=${profile.name || '未提供'}，興趣=${profile.interest || '未提供'}。
記憶：${memories.join('；') || '暫無'}。`

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: crisis ? 0.3 : 0.82,
      max_tokens: 260,
      messages: [
        { role: 'system', content: system },
        ...recent.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: message }
      ]
    })
    return res.status(200).json({ reply: completion.choices?.[0]?.message?.content || '我在呀，你可以再講多一點。', mood: crisis ? 'worried' : 'warm' })
  } catch (err) {
    return res.status(500).json({ error: 'OpenAI request failed' })
  }
}
