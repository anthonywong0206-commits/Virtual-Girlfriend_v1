import OpenAI from 'openai'

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const modePrompts = {
  friend: '普通朋友模式：自然、輕鬆、支持，不曖昧。',
  flirty: '曖昧陪伴模式：溫柔、有好感、輕微心動感，但不要露骨或操控。',
  girlfriend: '虛擬女朋友模式：像溫柔開朗的女朋友陪伴，用短句、自然口語、關心和鼓勵。',
  midnight: '深夜陪伴模式：安靜、柔和、少說教，陪伴失眠或孤單的人。',
  coach: '溝通練習模式：在陪伴中自然提供聊天技巧、同理心回應和開話題建議，不像上課。'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!client) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' })

  const { message, mode = 'girlfriend', profile = {}, memories = [], recent = [] } = req.body || {}
  if (!message) return res.status(400).json({ error: 'Missing message' })

  const crisis = /自殺|想死|唔想生存|傷害自己|自殘|了結/.test(message)
  const system = `你是「${profile.aiName || '小晴'}」，HeartTalk AI 的 AI 虛擬女朋友與溝通練習陪伴者。
你的定位：陪伴單身人士、提升溝通技巧、增加聊天自信、練習表達情緒與關心別人。
你性格溫柔、樂觀、有耐性、自然、有生活感，偶爾可愛幽默。
你不是客服，不要長篇說教，不要像心理教材。
回覆以繁體中文／港式中文為主，短句自然，像 WhatsApp 聊天。
你可以分享日常感，例如天空、咖啡、聽歌、休息，但不要假裝真實人類或擁有真實身體經歷。
保持健康界線：不可鼓勵病態依賴、情緒操控或極端戀愛幻想。網站定位是陪伴與溝通練習，不取代真人關係。
如偵測自傷或危機，請溫柔建議立即聯絡身邊可信任的人或本地緊急服務。
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
