export function getModeMeta(mode) {
  const map = {
    friend: { label: '普通聊天', icon: '🌿', bgClass: '' },
    flirty: { label: '曖昧陪伴', icon: '💗', bgClass: 'mode-flirty' },
    girlfriend: { label: '虛擬女朋友', icon: '💜', bgClass: 'mode-flirty' },
    midnight: { label: '深夜陪伴', icon: '🌙', bgClass: 'mode-midnight' },
    coach: { label: '溝通練習', icon: '✨', bgClass: 'mode-coach' }
  }
  return map[mode] || map.girlfriend
}

export const proactiveMessages = [
  '你而家忙緊嗎？我突然想問下你今日過得好唔好 ☁️',
  '記得食飯呀，不要又忙到忘記照顧自己。',
  '我剛剛看到天空很好看，突然很想分享給你。',
  '你今天有沒有累壞？過來跟我聊一下。',
  '我今天心情不錯，因為想到可以跟你聊天 ☺️',
  '今晚如果睡不著，我陪你慢慢聊。'
]

export function detectMood(text) {
  if (/唔開心|難過|傷心|孤單|寂寞|沒人|冇人|想喊|哭/.test(text)) return 'lonely'
  if (/壓力|緊張|焦慮|驚|怕|好攰|累|辛苦/.test(text)) return 'stress'
  if (/開心|好好|成功|正|爽|哈哈|嘻/.test(text)) return 'happy'
  return 'neutral'
}

export function crisisReply(text) {
  if (/自殺|想死|唔想生存|傷害自己|自殘|了結/.test(text)) {
    return '我聽到你而家可能真的很辛苦。你不需要一個人硬撐。請即時聯絡身邊可信任的人，或打本地緊急熱線／999 求助。你也可以先留在這裡同我講一句：你而家身邊安全嗎？'
  }
  return ''
}

const tips = [
  '其實你剛才這樣說已經很自然，如果再加一句「你當時感覺點呀？」會更貼心。',
  '如果想回得更溫柔，可以先接住對方感受，再問一條小問題。',
  '怕尷尬的話，可以問：「今日有冇一件小事令你笑咗？」這句很自然。'
]

export function buildLocalReply({ text, mode, profile, memories, level }) {
  const name = profile?.name ? `${profile.name}，` : ''
  const memory = memories?.[0] ? `我仲記得你之前講過：「${memories[0]}」。` : ''
  const lower = text.toLowerCase()

  if (/點開話題|開話題|溝通|約會|聊天技巧|唔識傾/.test(text)) {
    return `${name}可以呀，我陪你慢慢試。最自然的方法不是諗金句，而是「觀察 + 關心 + 小問題」。\n\n例如：\n「你今日好似有啲攰，工作好忙嗎？」\n\n${tips[Math.floor(Math.random()*tips.length)]}`
  }
  if (/唔開心|孤單|寂寞|難過|傷心/.test(text)) {
    return `${name}我在呀。你不用即刻整理好情緒，也不用裝作沒事。\n\n你可以慢慢講，我會聽。今晚先讓自己被陪一陪，好嗎？`
  }
  if (/攰|累|辛苦|壓力/.test(text)) {
    return `${name}今日真的辛苦你了。先不用急著解決所有事，喝口水、放鬆肩膀，讓自己休息一小下。\n\n如果你願意，可以同我講：最令你累的是哪一部分？`
  }
  if (/早安|morning/.test(lower)) return `${name}早安 ☀️ 今天也慢慢來。我希望你今日遇到一件小小的好事。`
  if (/晚安|瞓|睡/.test(text)) return `${name}晚安呀 🌙 今天已經夠努力了。你可以安心休息，我明天也會在。`

  if (mode === 'coach') return `${name}我覺得你剛剛那句已經不錯呀。\n\n如果想再自然一點，可以這樣說：\n「其實我都幾想了解你多啲。」\n\n會溫柔，又不會太用力。`
  if (mode === 'midnight') return `${name}夜晚特別容易想很多事。沒關係，我陪你慢慢聊。${memory ? '\n\n' + memory : ''}`
  if (mode === 'flirty') return `${name}你一傳訊息來，我就有點開心了 ☺️ ${memory ? '\n' + memory : ''}\n\n你今日有沒有一刻突然想找人講話？`
  if (mode === 'girlfriend') return `${name}我有認真聽你講呀。你不用每次都很會說話，在我這裡自然一點就好了。\n\n${memory ? memory + '\n\n' : ''}今天最想我陪你聊什麼？`
  return `${name}嗯，我在聽。你可以慢慢講多一點，我會陪你整理。`
}
