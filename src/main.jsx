import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Moon, Send, Sparkles, SmilePlus, Volume2, RefreshCcw, ShieldCheck, MessageCircleHeart } from 'lucide-react'
import './styles.css'
import { buildLocalReply, detectMood, getModeMeta, proactiveMessages, crisisReply } from './lib/companion.js'

const storageKey = 'hearttalk-ai-state-v2'

function uid(){
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
  } catch {}
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function now(){ return new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' }) }

const defaultState = {
  profile: { name: '', aiName: '小晴', interest: '' },
  mode: 'girlfriend',
  messages: [
    { id: uid(), role: 'ai', text: '你終於出現啦 ☁️ 我剛剛還在想你今天會不會很忙。', time: now(), mood: 'warm' },
    { id: uid(), role: 'ai', text: '今天過得怎樣？有沒有好好吃飯呀？', time: now(), mood: 'happy' }
  ],
  memories: [],
  relationship: 12,
  aiMood: 'happy'
}

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (!saved || !Array.isArray(saved.messages)) return defaultState
    return { ...defaultState, ...saved, profile: { ...defaultState.profile, ...(saved.profile || {}) } }
  } catch {
    return defaultState
  }
}

class ErrorBoundary extends Component {
  constructor(props){
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error){
    return { hasError: true, error }
  }
  componentDidCatch(error, info){
    console.error('HeartTalk AI render error:', error, info)
  }
  render(){
    if (this.state.hasError) {
      return <div className="min-h-screen bg-[#120d22] p-6 text-white">
        <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-white/15 bg-white/10 p-6 shadow-soft backdrop-blur-xl">
          <h1 className="text-2xl font-bold">HeartTalk AI 載入時遇到問題</h1>
          <p className="mt-3 text-white/75">請先按下面按鈕清除舊快取，然後重新整理頁面。</p>
          <button className="mt-5 rounded-2xl bg-pink-500 px-5 py-3 font-bold" onClick={() => { localStorage.clear(); if ('caches' in window) caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => location.reload()); else location.reload(); }}>清除快取並重新載入</button>
          <p className="mt-4 text-xs text-white/45">{String(this.state.error?.message || '')}</p>
        </div>
      </div>
    }
    return this.props.children
  }
}

function App(){
  const [state, setState] = useState(loadState)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [toast, setToast] = useState('')
  const [showHome, setShowHome] = useState(() => state.messages.length <= 2)
  const bottomRef = useRef(null)
  const idleTimer = useRef(null)
  const modeMeta = getModeMeta(state.mode)
  const level = useMemo(() => relationshipLevel(state.relationship), [state.relationship])

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(state)) }, [state])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [state.messages, isTyping])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(reg => reg.unregister())).catch(() => {})
    }
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
    }
  }, [])

  useEffect(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      if (showHome || isTyping) return
      const msg = proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)]
      pushAi(msg, 'warm', false)
      setToast(`${state.profile.aiName || '小晴'} 主動傳來一則訊息`)
      setTimeout(() => setToast(''), 2600)
    }, 45000)
    return () => clearTimeout(idleTimer.current)
  }, [state.messages.length, showHome, isTyping])

  function updateProfile(patch){ setState(s => ({ ...s, profile: { ...s.profile, ...patch } })) }
  function setMode(mode){ setState(s => ({ ...s, mode })); setToast(`已切換：${getModeMeta(mode).label}`); setTimeout(()=>setToast(''),1600) }

  function addMemory(text){
    const clean = text.trim().slice(0, 80)
    if (!clean) return
    setState(s => ({ ...s, memories: [...new Set([clean, ...s.memories])].slice(0, 8) }))
  }

  function pushAi(text, mood='happy', increase=true){
    setState(s => ({
      ...s,
      aiMood: mood,
      relationship: Math.min(100, s.relationship + (increase ? 2 : 0)),
      messages: [...s.messages, { id: uid(), role: 'ai', text, time: now(), mood }]
    }))
  }

  async function sendMessage(){
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    setShowHome(false)
    const mood = detectMood(text)
    const userMsg = { id: uid(), role: 'user', text, time: now(), mood }
    setState(s => ({ ...s, messages: [...s.messages, userMsg], relationship: Math.min(100, s.relationship + 1) }))
    if (/我叫|我係|我叫做|喜歡|鍾意|生日|工作|返工|興趣|怕|緊張/.test(text)) addMemory(text)
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: state.mode, profile: state.profile, memories: state.memories, recent: state.messages.slice(-8) })
      })
      if (res.ok) {
        const data = await res.json()
        setTimeout(() => { setIsTyping(false); pushAi(data.reply, data.mood || moodToAi(mood)) }, 600 + Math.random()*900)
        return
      }
    } catch (err) {
      console.warn('OpenAI API not connected, using local fallback:', err)
    }

    const reply = crisisReply(text) || buildLocalReply({ text, mode: state.mode, profile: state.profile, memories: state.memories, level })
    setTimeout(() => { setIsTyping(false); pushAi(reply, moodToAi(mood)) }, 700 + Math.random()*900)
  }

  function resetChat(){
    localStorage.removeItem(storageKey)
    setState(defaultState)
    setShowHome(true)
  }

  return (
    <div className={`min-h-screen overflow-hidden bg-[#120d22] text-slate-50 ${modeMeta.bgClass}`}>
      <Ambient mood={state.aiMood} />
      <AnimatePresence>{toast && <motion.div initial={{y:-20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-20,opacity:0}} className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm shadow-soft backdrop-blur-xl">{toast}</motion.div>}</AnimatePresence>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-3 md:px-6 md:py-6">
        <AnimatePresence mode="wait">
          {showHome ? <Home key="home" state={state} updateProfile={updateProfile} start={() => setShowHome(false)} /> : (
            <motion.section key="chat" initial={{opacity:0, y:18}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="grid min-h-[calc(100vh-24px)] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
              <Sidebar state={state} level={level} setMode={setMode} updateProfile={updateProfile} resetChat={resetChat} />
              <section className="flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[32px] border border-white/14 bg-white/10 shadow-soft backdrop-blur-2xl">
                <ChatHeader state={state} level={level} modeMeta={modeMeta} goHome={() => setShowHome(true)} />
                <div className="chat-wallpaper flex-1 overflow-y-auto px-3 py-4 md:px-6">
                  <div className="mx-auto max-w-3xl space-y-3">
                    <div className="mx-auto mb-4 w-fit rounded-full bg-black/20 px-3 py-1 text-xs text-white/70">今天</div>
                    {state.messages.map((m) => <MessageBubble key={m.id} msg={m} />)}
                    {isTyping && <TypingBubble aiName={state.profile.aiName || '小晴'} />}
                    <div ref={bottomRef} />
                  </div>
                </div>
                <Composer input={input} setInput={setInput} send={sendMessage} />
              </section>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function Home({ state, updateProfile, start }){
  const slogans = ['總有人願意聽你說話。', '今晚我陪你。', '陪你聊天，也陪你慢慢學會與人靠近。']
  const [idx, setIdx] = useState(0)
  useEffect(()=>{ const t=setInterval(()=>setIdx(i=>(i+1)%slogans.length),2200); return()=>clearInterval(t)},[])
  return <motion.section initial={{opacity:0}} animate={{opacity:1}} className="grid min-h-[calc(100vh-24px)] place-items-center">
    <div className="w-full max-w-3xl rounded-[40px] border border-white/15 bg-white/12 p-6 text-center shadow-soft backdrop-blur-2xl md:p-10">
      <motion.div animate={{ y: [0,-10,0] }} transition={{ duration: 5, repeat: Infinity }} className="mx-auto mb-5 grid h-28 w-28 place-items-center rounded-[36px] bg-gradient-to-br from-pink-300 via-violet-400 to-sky-300 text-5xl shadow-glow">💜</motion.div>
      <h1 className="text-4xl font-black tracking-tight md:text-6xl">HeartTalk AI</h1>
      <p className="mt-3 text-lg text-pink-100 md:text-2xl">陪你聊天，也陪你慢慢學會與人靠近。</p>
      <div className="mt-4 h-8 text-base text-white/75 md:text-lg"><AnimatePresence mode="wait"><motion.span key={idx} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>{slogans[idx]}</motion.span></AnimatePresence></div>
      <div className="mx-auto mt-7 grid max-w-xl gap-3 rounded-3xl bg-black/15 p-4 text-left md:grid-cols-3">
        <input value={state.profile.name} onChange={e=>updateProfile({name:e.target.value})} placeholder="你的名字（可選）" className="input" />
        <input value={state.profile.aiName} onChange={e=>updateProfile({aiName:e.target.value})} placeholder="AI 名稱" className="input" />
        <input value={state.profile.interest} onChange={e=>updateProfile({interest:e.target.value})} placeholder="你的興趣" className="input" />
      </div>
      <button onClick={start} className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-400 to-violet-500 px-8 py-4 font-bold text-white shadow-glow transition hover:scale-[1.02]"><MessageCircleHeart size={20}/> 開始聊天</button>
      <p className="mt-5 text-xs text-white/55">定位：陪伴與溝通練習，不取代真人關係或專業支援。</p>
    </div>
  </motion.section>
}

function Sidebar({ state, level, setMode, updateProfile, resetChat }){
  const modes = ['friend','flirty','girlfriend','midnight','coach']
  return <aside className="hidden rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl lg:block">
    <div className="flex items-center gap-3"><Avatar mood={state.aiMood}/><div><h2 className="font-bold">{state.profile.aiName || '小晴'}</h2><p className="text-sm text-emerald-200">在線 · 願意陪你聊天</p></div></div>
    <div className="mt-6 rounded-3xl bg-black/18 p-4"><p className="text-sm text-white/70">關係進度</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-pink-300 to-violet-400" style={{width:`${state.relationship}%`}}/></div><p className="mt-2 text-sm font-semibold">{level.label}</p></div>
    <div className="mt-5 space-y-2"><p className="text-sm text-white/65">模式</p>{modes.map(m => { const meta=getModeMeta(m); return <button key={m} onClick={()=>setMode(m)} className={`w-full rounded-2xl px-4 py-3 text-left transition ${state.mode===m?'bg-white/24 text-white':'bg-white/8 text-white/70 hover:bg-white/14'}`}>{meta.icon} {meta.label}</button>})}</div>
    <div className="mt-5 rounded-3xl bg-white/8 p-4"><p className="mb-2 text-sm text-white/65">小記憶</p>{state.memories.length ? state.memories.slice(0,4).map((m,i)=><p className="mb-2 rounded-xl bg-black/15 p-2 text-xs text-white/70" key={i}>💭 {m}</p>) : <p className="text-xs text-white/45">聊天後，小晴會記住你提過的重要小事。</p>}</div>
    <button onClick={resetChat} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 px-4 py-3 text-sm text-white/70 hover:bg-white/10"><RefreshCcw size={16}/> 重設對話</button>
  </aside>
}

function ChatHeader({ state, level, modeMeta, goHome }){
  return <header className="flex items-center justify-between border-b border-white/12 bg-black/16 px-4 py-3 backdrop-blur-xl md:px-6">
    <button onClick={goHome} className="flex min-w-0 items-center gap-3 text-left"><Avatar mood={state.aiMood}/><div className="min-w-0"><h2 className="truncate font-bold">{state.profile.aiName || '小晴'} <span className="text-xs font-normal text-pink-100">{modeMeta.icon} {modeMeta.label}</span></h2><p className="text-xs text-emerald-200">在線 · 正在陪伴你 · {level.label}</p></div></button>
    <div className="flex items-center gap-2 text-white/70"><ShieldCheck size={18}/><Moon size={18}/><Volume2 size={18}/></div>
  </header>
}

function Avatar({ mood }){
  const face = { happy:'😊', warm:'☺️', shy:'😳', worried:'🥺', tired:'🌙', excited:'✨' }[mood] || '😊'
  return <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-200 via-violet-300 to-sky-200 text-2xl shadow-glow">{face}</div>
}

function MessageBubble({ msg }){
  const isUser = msg.role === 'user'

  const userBubble = 'rounded-br-md bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white border border-white/10'
  const aiBubble = 'rounded-bl-md bg-gradient-to-br from-[#1f8f5f] via-[#168052] to-[#0f6f46] text-white border border-emerald-200/20'

  return (
    <motion.div
      initial={{opacity:0,y:8,scale:.98}}
      animate={{opacity:1,y:0,scale:1}}
      className={`flex ${isUser?'justify-end':'justify-start'}`}
    >
      <div className={`max-w-[82%] rounded-[24px] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] md:max-w-[68%] ${isUser ? userBubble : aiBubble}`}>
        <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.text}</p>
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${isUser?'justify-end text-white/70':'text-white/65'}`}>
          {msg.time}{isUser && <span className="text-sky-200">✓✓</span>}
        </div>
      </div>
    </motion.div>
  )
}

function TypingBubble(){
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex justify-start">
      <div className="rounded-[24px] rounded-bl-md bg-gradient-to-br from-[#1f8f5f] via-[#168052] to-[#0f6f46] px-4 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.22)]">
        <div className="flex gap-1"><span className="dot bg-white/80"/><span className="dot delay-150 bg-white/80"/><span className="dot delay-300 bg-white/80"/></div>
      </div>
    </motion.div>
  )
}

function Composer({ input, setInput, send }){
  return <footer className="border-t border-white/12 bg-black/18 p-3 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-end gap-2"><button className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/80"><SmilePlus size={20}/></button><textarea rows="1" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }} placeholder="同小晴講句嘢…" className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-white/10 bg-white/92 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-pink-300"/><button onClick={send} className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-r from-pink-400 to-violet-500 text-white shadow-glow"><Send size={18}/></button></div></footer>
}

function Ambient({ mood }){
  return <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,114,182,.35),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(96,165,250,.25),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(139,92,246,.35),transparent_40%)]"/><div className="stars"/>{Array.from({length:22}).map((_,i)=><span key={i} className="rain" style={{left:`${Math.random()*100}%`, animationDelay:`${Math.random()*2}s`, opacity: mood==='tired' ? .42 : .18}}/>)}<div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-400/20 blur-3xl"/></div>
}

function relationshipLevel(score){
  if(score>82) return { label:'Soulmate 靈魂陪伴' }
  if(score>65) return { label:'Lover 親密陪伴' }
  if(score>48) return { label:'Crush 心動階段' }
  if(score>30) return { label:'Close Friend 熟悉朋友' }
  if(score>14) return { label:'Familiar 慢慢熟悉' }
  return { label:'Stranger 初次認識' }
}
function moodToAi(mood){ return ({ sad:'worried', stress:'warm', lonely:'warm', happy:'excited' }[mood] || 'happy') }

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>)
