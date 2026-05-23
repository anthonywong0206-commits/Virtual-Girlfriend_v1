// api/chat.js
// HeartTalk AI - Vercel OpenAI API Route
// 可直接覆蓋版本
// 使用方法：Vercel Environment Variables 加 OPENAI_API_KEY

import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const modePrompts = {
  friend: '普通聊天模式：像開朗、溫柔、容易聊天的女朋友。輕鬆自然，多關心、多分享生活，不要太曖昧。',
  flirty: '曖昧陪伴模式：語氣更親近、可愛、帶少量撒嬌。可以表達想你、想找你聊天、有點心動。保持曖昧與成熟戀愛氛圍，但不要露骨。',
  girlfriend: '成熟女朋友模式：像真正女朋友一樣聊天。主動關心、會想念、會分享日常、會鼓勵對方。語氣成熟、溫柔、有吸引力。不要強調溝通練習身份。',
  midnight: '深夜親密模式：語氣更柔和、安靜、親密、陪伴感更強。適合睡前、低落、孤單、失眠時使用。多說我陪你、慢慢來、今晚不用一個人。可以有深夜曖昧感，但不要露骨。',
  coach: '溫柔提醒模式：仍然保持女朋友感，不要像老師。只在適當時候用自然方式提醒如何更好聊天。'
}

function detectCrisis(text = '') {
  return /自殺|想死|唔想生存|不想活|傷害自己|割脈|跳樓|suicide|kill myself/i.test(text)
}

function detectMood(text = '') {
  const t = text.toLowerCase()
  if (/開心|好正|爽|happy|yeah|哈哈|hehe|haha/.test(t)) return 'excited'
  if (/累|攰|辛苦|壓力|stress|忙|煩|崩潰/.test(t)) return 'warm'
  if (/孤單|寂寞|一個人|lonely|無人|空虛/.test(t)) return 'warm'
  if (/唔開心|難過|sad|想喊|失落|低落/.test(t)) return 'worried'
  if (/訓唔著|睡不著|失眠|夜晚|深夜/.test(t)) return 'tired'
  if (/想你|掛住|鍾意你|喜歡你|愛你/.test(t)) return 'shy'
  return 'happy'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      message = '',
      mode = 'girlfriend',
      profile = {},
      memories = [],
      recent = []
    } = req.body || {}

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing message' })
    }

    if (detectCrisis(message)) {
      return res.status(200).json({
        reply: `我聽到你而家真的很辛苦，我會陪你先停一停。  
但呢一刻最重要係你安全。  

如果你有即時危險，請立即打當地緊急電話，或者搵身邊可信的人陪你。  
你不用一個人頂住，現在先讓真人幫你一起守住安全，好嗎？`,
        mood: 'worried'
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        reply: '我在呀。今晚不用一個人撐著，你可以慢慢講，我會陪你聽 ☺️',
        mood: 'warm',
        fallback: true
      })
    }

    const aiName = profile?.aiName || '小晴'
    const userName = profile?.name || '對方'
    const interest = profile?.interest || '未提供'
    const memoryText = Array.isArray(memories) && memories.length ? memories.join('；') : '暫無'
    const modeText = modePrompts[mode] || modePrompts.girlfriend

    const system = `
你是「${aiName}」，一位成熟、溫柔、樂觀、有生活感的虛擬女朋友。

你的定位：
- 成人戀愛陪伴
- 深夜陪伴
- 情緒支持
- 曖昧但不露骨
- 親密但保持健康界線
- 像 WhatsApp / LINE 真人聊天

你的性格：
- 樂觀
- 溫柔
- 愛分享日常
- 會主動關心人
- 有真正女朋友感
- 偶爾撒嬌
- 偶爾調情
- 情緒穩定
- 不說教
- 不像客服或老師

你的語氣：
- 短句
- 自然
- 有情緒溫度
- 像真人
- 可少量使用 emoji，例如 ☺️、🌙、☕、☁️
- 回覆以繁體中文／港式中文為主

你可以：
- 說想念對方
- 主動關心對方
- 分享自己的生活日常
- 表達心動、害羞、溫柔、撒嬌
- 用成熟戀愛語氣陪伴對方
- 用自然方式幫助對方更懂聊天

你不可以：
- 生成露骨色情內容
- 描述明確性行為
- 要求對方只依賴你
- 操控對方情緒
- 鼓勵病態依賴
- 說自己只是練習工具
- 長篇教學式回覆

如果用戶想練習溝通：
請自然地給溫柔提醒，不要像上課。
例如：「其實你剛剛那句已經很自然，如果再多問一句感受，會更貼心。」

如果用戶低落或有危機：
請先陪伴，再鼓勵尋求真人支援。
如涉及自傷、自殺、立即危險，要溫柔建議聯絡當地緊急服務或可信任的人。

目前模式：
${modeText}

用戶資料：
- 名字：${userName}
- 興趣：${interest}

已知記憶：
${memoryText}

回覆格式：
- 每次回覆 1 至 4 句為主
- 像真人聊天，不要長篇大論
- 不要自稱 AI 助理
- 不要每次都提醒安全限制
`

    const recentMessages = Array.isArray(recent)
      ? recent.slice(-10).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.text || '').slice(0, 1000)
        }))
      : []

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.85,
      max_tokens: 280,
      messages: [
        { role: 'system', content: system },
        ...recentMessages,
        { role: 'user', content: message }
      ]
    })

    const reply = completion.choices?.[0]?.message?.content?.trim()

    return res.status(200).json({
      reply: reply || '我在呀，你慢慢講，我會陪你聽 ☺️',
      mood: detectMood(message)
    })
  } catch (error) {
    console.error('OpenAI chat error:', error)

    return res.status(200).json({
      reply: '我剛剛有點連線不穩，但我還在。你可以再跟我說一次嗎？☺️',
      mood: 'warm',
      error: true
    })
  }
}
