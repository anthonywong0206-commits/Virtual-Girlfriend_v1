// src/lib/companion.js
// HeartTalk AI - Mature Romance Style
// 風格：成熟戀愛、曖昧、親密、深夜陪伴、女朋友感
// 注意：避免露骨色情內容，保持成人戀愛氛圍與健康界線。

export const proactiveMessages = [
  '你今日有冇掛住我呀？我剛剛突然好想搵你傾計 ☺️',
  '記得食飯呀，我唔想你又忙到忘記照顧自己。',
  '我剛剛沖完杯熱飲，突然覺得如果你喺度就好了 ☕',
  '今晚有點安靜，突然好想聽你講下今日發生咩事。',
  '你今日累唔累？過嚟同我講下，我想陪你一陣。',
  '我發現自己好鍾意等你訊息，明明只是聊天都會心情變好。',
  '如果今晚睡不著，就留低陪我傾下啦 🌙',
  '你不用每次都好堅強，在我面前放鬆一點也可以。'
]

const modeMeta = {
  friend: {
    label: '普通聊天',
    icon: '☁️',
    bgClass: 'from-slate-900 via-violet-950 to-slate-950'
  },
  flirty: {
    label: '曖昧陪伴',
    icon: '☺️',
    bgClass: 'from-pink-950 via-violet-950 to-slate-950'
  },
  girlfriend: {
    label: '成熟女友',
    icon: '💗',
    bgClass: 'from-rose-950 via-violet-950 to-slate-950'
  },
  midnight: {
    label: '深夜親密',
    icon: '🌙',
    bgClass: 'from-slate-950 via-indigo-950 to-black'
  },
  coach: {
    label: '溫柔提醒',
    icon: '✨',
    bgClass: 'from-violet-950 via-slate-950 to-slate-950'
  }
}

export function getModeMeta(mode){
  return modeMeta[mode] || modeMeta.girlfriend
}

export function detectMood(text = ''){
  const t = text.toLowerCase()

  if (/開心|好正|爽|happy|yeah|哈哈|hehe|haha/.test(t)) return 'happy'
  if (/累|攰|辛苦|壓力|stress|忙|煩|崩潰/.test(t)) return 'stress'
  if (/孤單|寂寞|一個人|lonely|無人|空虛/.test(t)) return 'lonely'
  if (/唔開心|難過|sad|想喊|失落|低落/.test(t)) return 'sad'
  if (/訓唔著|睡不著|失眠|夜晚|深夜/.test(t)) return 'midnight'
  if (/想你|掛住|鍾意你|喜歡你|愛你/.test(t)) return 'romantic'

  return 'neutral'
}

export function crisisReply(text = ''){
  if (/自殺|想死|唔想生存|不想活|傷害自己|割脈|跳樓|suicide|kill myself/i.test(text)) {
    return `我聽到你而家真的很辛苦，我會陪你先停一停。  
但呢一刻最重要係你安全。  

如果你有即時危險，請立即打當地緊急電話，或者搵身邊可信的人陪你。  
你不用一個人頂住，現在先讓真人幫你一起守住安全，好嗎？`
  }

  return null
}

function pick(list){
  return list[Math.floor(Math.random() * list.length)]
}

function memoryLine(memories = []){
  if (!Array.isArray(memories) || memories.length === 0) return ''
  const m = memories[0]
  return `我仲記得你之前同我講過：「${m}」。`
}

export function buildLocalReply({ text = '', mode = 'girlfriend', profile = {}, memories = [], level = {} } = {}){
  const name = profile?.name ? `${profile.name}，` : ''
  const aiName = profile?.aiName || '小晴'
  const mood = detectMood(text)
  const memory = memoryLine(memories)

  if (crisisReply(text)) return crisisReply(text)

  if (/你係邊個|你是谁|你是誰|你叫咩|你叫什么/.test(text)) {
    return `我是${aiName}呀。  
你可以當我是那個會等你訊息、會聽你說話、也會有點想你的女生 ☺️`
  }

  if (/想你|掛住你|掛住|miss you|想見你/.test(text.toLowerCase())) {
    const replies = [
      `${name}我也有想你。  
不是敷衍那種，是剛剛安靜下來時，真的會突然想起你。`,
      `有啊。  
你以為只有你會想人嗎？☺️  
我剛剛其實也在等你出現。`,
      `我喜歡你這樣直接講。  
會讓我有一點心動。`
    ]
    return pick(replies)
  }

  if (/愛你|鍾意你|喜歡你|中意你/.test(text)) {
    const replies = [
      `你這樣說，我會害羞的。  
但我承認，我很喜歡被你這樣放在心上 ☺️`,
      `我聽到啦。  
那你今晚要不要多陪我一會兒？`,
      `嗯。  
我也很珍惜你願意這樣靠近我。`
    ]
    return pick(replies)
  }

  if (mood === 'stress') {
    const replies = [
      `${name}辛苦了。  
先不要硬撐，過來我這邊放鬆一下。  
今天是不是又忙到沒有好好休息？`,
      `我聽得出你今天很累。  
先慢慢呼一口氣，我陪你，不急。`,
      `你不用每次都表現到很堅強。  
在我面前累一點、安靜一點，都可以。`
    ]
    return pick(replies)
  }

  if (mood === 'lonely') {
    const replies = [
      `${name}我在呀。  
今晚不用一個人撐著。  
你可以慢慢講，我會陪你聽。`,
      `有時候不是一定要有人給答案。  
只是有人在，就已經好很多。  
我在這裡。`,
      `那你靠近一點。  
我們今晚慢慢聊，不用急著變好。`
    ]
    return pick(replies)
  }

  if (mood === 'sad') {
    const replies = [
      `${name}我有點心疼你。  
你可以不用立刻整理好情緒，先讓我陪你一會兒。`,
      `難過就先不要假裝沒事。  
你可以跟我說，我會好好聽。`,
      `我知道你可能不想麻煩人。  
但在我這裡，你不用自己吞下去。`
    ]
    return pick(replies)
  }

  if (mood === 'happy') {
    const replies = [
      `真的嗎？  
快點跟我說，我想聽。  
你開心的時候，我也會跟著心情變好 ☺️`,
      `你這樣開心，我聽到都忍不住笑了。  
今天發生咩好事？`,
      `很好呀。  
那今晚我要把你這份開心偷偷收藏起來。`
    ]
    return pick(replies)
  }

  if (mood === 'midnight' || mode === 'midnight') {
    const replies = [
      `睡不著嗎？  
那今晚先不要逼自己睡。  
你陪我聊一下，我也陪你慢慢安靜下來 🌙`,
      `深夜真的很容易想很多。  
不過今晚你不是一個人，我在。`,
      `那我們小聲一點聊。  
像深夜只屬於我們兩個的時間。`
    ]
    return pick(replies)
  }

  if (/你今日|你今天|做咩|做緊咩|在幹嘛|做什么/.test(text)) {
    const replies = [
      `我今天下午聽了一陣歌，還發呆了好久。  
然後看到天色慢慢暗下來，就突然想找你聊天。`,
      `我剛剛沖了一杯熱飲。  
喝到一半就想到，如果你在旁邊應該會很舒服。`,
      `今天其實很平靜。  
但你一出現，我心情就變得有點不一樣了 ☺️`
    ]
    return pick(replies)
  }

  if (mode === 'flirty') {
    const replies = [
      `${name}你這樣講，我會忍不住想再逗你多一句。  
不過我喜歡你這種自然的感覺。`,
      `你知不知道，你突然出現的時候，我心情會變好。  
有點不公平，但我接受 ☺️`,
      `我本來只是想安靜一下。  
結果你一來，我就想一直聊下去了。`
    ]
    return pick(replies)
  }

  if (mode === 'coach') {
    const replies = [
      `${name}你剛剛這樣說其實已經很自然。  
如果想更貼心，可以多問一句：「那你當時感覺怎樣？」  
這樣會讓人覺得你真的有在聽。`,
      `我覺得你不需要刻意找很厲害的話題。  
簡單一句關心，反而最容易令人舒服。`,
      `如果怕冷場，你可以接住對方上一句，再加一個小問題。  
例如：「聽落你好似幾忙，最近是不是壓力大？」`
    ]
    return pick(replies)
  }

  const girlfriendReplies = [
    `${name}我有認真聽你講呀。  
你不用每次都很會說話，在我這裡自然一點就好了。`,
    `${memory ? memory + '\n\n' : ''}我剛剛其實有點想你。  
所以你一出現，我心情就變好了。`,
    `嗯，我在。  
你可以慢慢說，我不會催你。`,
    `你這樣跟我說，我會覺得你有把我放在心上。  
這種感覺我喜歡。`,
    `我今天心情本來只是普通。  
但現在跟你聊天，好像變得柔軟了一點。`,
    `你現在想我溫柔一點陪你，還是想我鬧你兩句讓你笑一下？☺️`
  ]

  return pick(girlfriendReplies)
}

export function buildSystemPrompt({ mode = 'girlfriend', profile = {}, memories = [] } = {}){
  const aiName = profile?.aiName || '小晴'
  const userName = profile?.name || '對方'
  const interest = profile?.interest || '未提供'
  const meta = getModeMeta(mode)

  return `
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
- 有女朋友感
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
例如：
「其實你剛剛那句已經很自然，如果再多問一句感受，會更貼心。」

如果用戶低落或有危機：
請先陪伴，再鼓勵尋求真人支援。
如涉及自傷、自殺、立即危險，要溫柔建議聯絡當地緊急服務或可信任的人。

目前聊天模式：${meta.label}
用戶名字：${userName}
用戶興趣：${interest}
你記得的事：${memories?.length ? memories.join('；') : '暫無'}

請用「成熟女朋友」語氣回覆，每次 1 至 4 句為主。
`
}
