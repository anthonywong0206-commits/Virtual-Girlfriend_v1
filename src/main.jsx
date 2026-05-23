import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Moon,
  Send,
  SmilePlus,
  Volume2,
  RefreshCcw,
  ShieldCheck,
  MessageCircleHeart,
  PlusCircle,
  MessageSquareHeart,
  Settings,
  Trash2,
  CheckCircle2
} from 'lucide-react'
import './styles.css'
import { buildLocalReply, detectMood, getModeMeta, proactiveMessages, crisisReply } from './lib/companion.js'

const storageKey = 'hearttalk-ai-state-v3'

function uid(){
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
  } catch {}
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function now(){
  return new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}

function createRoom(title = '小晴'){
  return {
    id: uid(),
    title,
    createdAt: Date.now(),
    relationship: 12,
    aiMood: 'happy',
    messages: [
      { id: uid(), role: 'ai', text: '你終於出現啦 ☁️ 我剛剛還在想你今天會不會很忙。', time: now(), mood: 'warm' },
      { id: uid(), role: 'ai', text: '今天過得怎樣？有沒有好好吃飯呀？', time: now(), mood: 'happy' }
    ]
  }
}

const firstRoom = createRoom('小晴')

const defaultState = {
  profile: { name: '', aiName: '小晴', interest: '' },
  mode: 'girlfriend',
  activeTab: 'chat',
  activeRoomId: firstRoom.id,
  rooms: [firstRoom],
  memories: []
}

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (!saved || !Array.isArray(saved.rooms) || saved.rooms.length === 0) return defaultState
    return {
      ...defaultState,
      ...saved,
      profile: { ...defaultState.profile, ...(saved.profile || {}) },
      activeTab: saved.activeTab || 'chat',
      activeRoomId: saved.activeRoomId || saved.rooms[0].id
    }
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
      return (
        <div className="min-h-screen bg-[#120d22] p-6 text-white">
          <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-white/15 bg-white/10 p-6 shadow-soft backdrop-blur-xl">
            <h1 className="text-2xl font-bold">HeartTalk AI 載入時遇到問題</h1>
            <p className="mt-3 text-white/75">請先按下面按鈕清除舊快取，然後重新整理頁面。</p>
            <button
              className="mt-5 rounded-2xl bg-pink-500 px-5 py-3 font-bold"
              onClick={() => {
                localStorage.clear()
                if ('caches' in window) {
                  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => location.reload())
                } else {
                  location.reload()
                }
              }}
            >
              清除快取並重新載入
            </button>
            <p className="mt-4 text-xs text-white/45">{String(this.state.error?.message || '')}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App(){
  const [state, setState] = useState(loadState)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [toast, setToast] = useState('')
  const bottomRef = useRef(null)
  const idleTimer = useRef(null)

  const activeRoom = useMemo(() => {
    return state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0]
  }, [state.rooms, state.activeRoomId])

  const modeMeta = getModeMeta(state.mode)
  const level = useMemo(() => relationshipLevel(activeRoom?.relationship || 0), [activeRoom?.relationship])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeRoom?.messages, isTyping, state.activeTab])

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
      if (state.activeTab !== 'chat' || isTyping || !activeRoom) return
      const msg = proactiveMessages[Math.floor(Math.random() * proactiveMessages.length)]
      pushAi(msg, 'warm', false)
      setToast(`${state.profile.aiName || '小晴'} 主動傳來一則訊息`)
      setTimeout(() => setToast(''), 2600)
    }, 45000)
    return () => clearTimeout(idleTimer.current)
  }, [activeRoom?.messages?.length, state.activeTab, isTyping])

  function updateProfile(patch){
    setState(s => ({ ...s, profile: { ...s.profile, ...patch } }))
  }

  function setMode(mode){
    setState(s => ({ ...s, mode }))
    setToast(`已切換：${getModeMeta(mode).label}`)
    setTimeout(() => setToast(''), 1600)
  }

  function setTab(tab){
    setState(s => ({ ...s, activeTab: tab }))
  }

  function updateActiveRoom(patch){
    setState(s => ({
      ...s,
      rooms: s.rooms.map(r => r.id === s.activeRoomId ? { ...r, ...patch } : r)
    }))
  }

  function addMemory(text){
    const clean = text.trim().slice(0, 80)
    if (!clean) return
    setState(s => ({ ...s, memories: [...new Set([clean, ...s.memories])].slice(0, 8) }))
  }

  function pushAi(text, mood='happy', increase=true){
    setState(s => ({
      ...s,
      rooms: s.rooms.map(r => {
        if (r.id !== s.activeRoomId) return r
        return {
          ...r,
          aiMood: mood,
          relationship: Math.min(100, r.relationship + (increase ? 2 : 0)),
          messages: [...r.messages, { id: uid(), role: 'ai', text, time: now(), mood }]
        }
      })
    }))
  }

  function pushUser(text, mood){
    setState(s => ({
      ...s,
      rooms: s.rooms.map(r => {
        if (r.id !== s.activeRoomId) return r
        return {
          ...r,
          relationship: Math.min(100, r.relationship + 1),
          messages: [...r.messages, { id: uid(), role: 'user', text, time: now(), mood }]
        }
      })
    }))
  }

  async function sendMessage(){
    const text = input.trim()
    if (!text || isTyping || !activeRoom) return

    setInput('')
    setTab('chat')

    const mood = detectMood(text)
    pushUser(text, mood)

    if (/我叫|我係|我叫做|喜歡|鍾意|生日|工作|返工|興趣|怕|緊張/.test(text)) addMemory(text)

    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: state.mode,
          profile: state.profile,
          memories: state.memories,
          recent: activeRoom.messages.slice(-8)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setTimeout(() => {
          setIsTyping(false)
          pushAi(data.reply, data.mood || moodToAi(mood))
        }, 600 + Math.random() * 900)
        return
      }
    } catch (err) {
      console.warn('OpenAI API not connected, using local fallback:', err)
    }

    const reply = crisisReply(text) || buildLocalReply({
      text,
      mode: state.mode,
      profile: state.profile,
      memories: state.memories,
      level
    })

    setTimeout(() => {
      setIsTyping(false)
      pushAi(reply, moodToAi(mood))
    }, 700 + Math.random() * 900)
  }

  function createNewChat(){
    const title = `${state.profile.aiName || '小晴'} · 新聊天`
    const room = createRoom(title)

    setState(s => ({
      ...s,
      rooms: [room, ...s.rooms],
      activeRoomId: room.id,
      activeTab: 'chat'
    }))

    setToast('已新增聊天室')
    setTimeout(() => setToast(''), 1600)
  }

  function switchRoom(id){
    setState(s => ({ ...s, activeRoomId: id, activeTab: 'chat' }))
  }

  function deleteRoom(id){
    setState(s => {
      const nextRooms = s.rooms.filter(r => r.id !== id)
      if (nextRooms.length === 0) {
        const room = createRoom(s.profile.aiName || '小晴')
        return { ...s, rooms: [room], activeRoomId: room.id, activeTab: 'chat' }
      }
      return {
        ...s,
        rooms: nextRooms,
        activeRoomId: s.activeRoomId === id ? nextRooms[0].id : s.activeRoomId
      }
    })
  }

  function resetCurrentChat(){
    const room = createRoom(state.profile.aiName || '小晴')
    setState(s => ({
      ...s,
      rooms: s.rooms.map(r => r.id === s.activeRoomId ? { ...room, id: r.id, title: r.title } : r)
    }))
    setToast('已重設目前對話')
    setTimeout(() => setToast(''), 1600)
  }

  function resetAll(){
    localStorage.removeItem(storageKey)
    const fresh = createRoom('小晴')
    setState({
      ...defaultState,
      activeRoomId: fresh.id,
      rooms: [fresh],
      activeTab: 'chat'
    })
    setToast('已重設全部資料')
    setTimeout(() => setToast(''), 1600)
  }

  const appMood = activeRoom?.aiMood || 'happy'

  return (
    <div className={`min-h-screen overflow-hidden bg-[#120d22] text-slate-50 ${modeMeta.bgClass}`}>
      <Ambient mood={appMood} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm shadow-soft backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-24 pt-3 md:px-6 md:pb-28 md:pt-6">
        <AnimatePresence mode="wait">
          {state.activeTab === 'new' && (
            <motion.section
              key="new"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="min-h-[calc(100vh-116px)]"
            >
              <NewChatPage
                state={state}
                activeRoom={activeRoom}
                switchRoom={switchRoom}
                deleteRoom={deleteRoom}
                createNewChat={createNewChat}
              />
            </motion.section>
          )}

          {state.activeTab === 'chat' && (
            <motion.section
              key="chat"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid min-h-[calc(100vh-116px)] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]"
            >
              <DesktopRoomPanel
                state={state}
                activeRoom={activeRoom}
                level={level}
                switchRoom={switchRoom}
                deleteRoom={deleteRoom}
                createNewChat={createNewChat}
              />

              <section className="flex min-h-[calc(100vh-116px)] flex-col overflow-hidden rounded-[32px] border border-white/14 bg-white/10 shadow-soft backdrop-blur-2xl">
                <ChatHeader
                  state={state}
                  room={activeRoom}
                  level={level}
                  modeMeta={modeMeta}
                  openSettings={() => setTab('settings')}
                />

                <div className="chat-wallpaper flex-1 overflow-y-auto px-3 py-4 md:px-6">
                  <div className="mx-auto max-w-3xl space-y-3">
                    <div className="mx-auto mb-4 w-fit rounded-full bg-black/20 px-3 py-1 text-xs text-white/70">今天</div>
                    {activeRoom?.messages?.map((m) => <MessageBubble key={m.id} msg={m} />)}
                    {isTyping && <TypingBubble />}
                    <div ref={bottomRef} />
                  </div>
                </div>

                <Composer input={input} setInput={setInput} send={sendMessage} />
              </section>
            </motion.section>
          )}

          {state.activeTab === 'settings' && (
            <motion.section
              key="settings"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="min-h-[calc(100vh-116px)]"
            >
              <SettingsPage
                state={state}
                level={level}
                setMode={setMode}
                updateProfile={updateProfile}
                resetCurrentChat={resetCurrentChat}
                resetAll={resetAll}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <BottomBar activeTab={state.activeTab} setTab={setTab} createNewChat={createNewChat} />
    </div>
  )
}

function NewChatPage({ state, activeRoom, switchRoom, deleteRoom, createNewChat }){
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-pink-300 to-violet-500 text-3xl shadow-glow">💬</div>
          <div>
            <h1 className="text-2xl font-black">新增聊天</h1>
            <p className="text-sm text-white/65">你可以建立多個聊天室，分開不同心情或話題。</p>
          </div>
        </div>

        <button
          onClick={createNewChat}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-pink-400 to-violet-500 px-5 py-4 font-bold text-white shadow-glow"
        >
          <PlusCircle size={20} />
          建立新的聊天室
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {state.rooms.map((room, index) => (
          <div
            key={room.id}
            className={`rounded-3xl border p-4 shadow-soft backdrop-blur-xl ${
              room.id === activeRoom?.id ? 'border-pink-200/40 bg-white/18' : 'border-white/10 bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar mood={room.aiMood || 'happy'} />
              <button onClick={() => switchRoom(room.id)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-bold">{room.title || `聊天室 ${index + 1}`}</h2>
                  {room.id === activeRoom?.id && <CheckCircle2 className="text-emerald-200" size={16} />}
                </div>
                <p className="truncate text-sm text-white/55">{room.messages?.at(-1)?.text || '未有訊息'}</p>
              </button>
              <button
                onClick={() => deleteRoom(room.id)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white/8 text-white/65 hover:bg-red-500/30 hover:text-white"
                aria-label="刪除聊天室"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DesktopRoomPanel({ state, activeRoom, level, switchRoom, deleteRoom, createNewChat }){
  return (
    <aside className="hidden rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl lg:block">
      <div className="flex items-center gap-3">
        <Avatar mood={activeRoom?.aiMood || 'happy'} />
        <div>
          <h2 className="font-bold">{state.profile.aiName || '小晴'}</h2>
          <p className="text-sm text-emerald-200">在線 · 願意陪你聊天</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-black/18 p-4">
        <p className="text-sm text-white/70">關係進度</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-pink-300 to-violet-400" style={{ width: `${activeRoom?.relationship || 0}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold">{level.label}</p>
      </div>

      <button
        onClick={createNewChat}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-400 to-violet-500 px-4 py-3 font-bold text-white shadow-glow"
      >
        <PlusCircle size={18} />
        新增聊天
      </button>

      <div className="mt-5 space-y-2">
        <p className="text-sm text-white/65">聊天室</p>
        {state.rooms.map((room, index) => (
          <div key={room.id} className={`flex items-center gap-2 rounded-2xl px-3 py-3 ${activeRoom?.id === room.id ? 'bg-white/24' : 'bg-white/8 hover:bg-white/14'}`}>
            <button onClick={() => switchRoom(room.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold">{room.title || `聊天室 ${index + 1}`}</p>
              <p className="truncate text-xs text-white/50">{room.messages?.at(-1)?.text || '未有訊息'}</p>
            </button>
            <button onClick={() => deleteRoom(room.id)} className="text-white/45 hover:text-red-200">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}

function SettingsPage({ state, level, setMode, updateProfile, resetCurrentChat, resetAll }){
  const modes = ['friend', 'flirty', 'girlfriend', 'midnight', 'coach']

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-pink-300 to-violet-500 text-3xl shadow-glow">⚙️</div>
          <div>
            <h1 className="text-2xl font-black">設定</h1>
            <p className="text-sm text-white/65">選擇聊天風格、修改名稱或重設對話。</p>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl">
        <h2 className="font-bold">基本資料</h2>
        <div className="mt-4 grid gap-3">
          <input value={state.profile.name} onChange={e => updateProfile({ name: e.target.value })} placeholder="你的名字（可選）" className="input" />
          <input value={state.profile.aiName} onChange={e => updateProfile({ aiName: e.target.value })} placeholder="AI 名稱，例如：小晴" className="input" />
          <input value={state.profile.interest} onChange={e => updateProfile({ interest: e.target.value })} placeholder="你的興趣，例如：音樂、貓、跑步" className="input" />
        </div>
      </div>

      <div className="rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl">
        <h2 className="font-bold">聊天風格</h2>
        <p className="mt-1 text-sm text-white/55">目前關係：{level.label}</p>

        <div className="mt-4 grid gap-2">
          {modes.map(mode => {
            const meta = getModeMeta(mode)
            const active = state.mode === mode
            return (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                  active ? 'bg-white/24 text-white ring-1 ring-pink-200/30' : 'bg-white/8 text-white/75 hover:bg-white/14'
                }`}
              >
                <span>{meta.icon} {meta.label}</span>
                {active && <CheckCircle2 size={18} className="text-emerald-200" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-[32px] border border-white/14 bg-white/10 p-5 shadow-soft backdrop-blur-2xl">
        <h2 className="font-bold">重設對話</h2>
        <p className="mt-1 text-sm text-white/55">如果對話太亂，可以只重設目前聊天室，或清除全部資料。</p>

        <div className="mt-4 grid gap-3">
          <button
            onClick={resetCurrentChat}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/16"
          >
            <RefreshCcw size={18} />
            重設目前聊天室
          </button>
          <button
            onClick={resetAll}
            className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/25 px-4 py-3 font-bold text-red-100 hover:bg-red-500/35"
          >
            <Trash2 size={18} />
            清除全部資料
          </button>
        </div>
      </div>
    </div>
  )
}

function ChatHeader({ state, room, level, modeMeta, openSettings }){
  return (
    <header className="flex items-center justify-between border-b border-white/12 bg-black/16 px-4 py-3 backdrop-blur-xl md:px-6">
      <div className="flex min-w-0 items-center gap-3 text-left">
        <Avatar mood={room?.aiMood || 'happy'} />
        <div className="min-w-0">
          <h2 className="truncate font-bold">
            {state.profile.aiName || '小晴'} <span className="text-xs font-normal text-pink-100">{modeMeta.icon} {modeMeta.label}</span>
          </h2>
          <p className="text-xs text-emerald-200">在線 · 正在陪伴你 · {level.label}</p>
        </div>
      </div>
      <button onClick={openSettings} className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-white/70 hover:bg-white/14">
        <ShieldCheck size={17} />
        <Moon size={17} />
        <Volume2 size={17} />
      </button>
    </header>
  )
}

function BottomBar({ activeTab, setTab, createNewChat }){
  const itemBase = 'flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/12 bg-[#15101f]/90 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-md gap-2">
        <button
          onClick={createNewChat}
          className={`${itemBase} ${activeTab === 'new' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}
        >
          <PlusCircle size={22} />
          新增聊天
        </button>

        <button
          onClick={() => setTab('chat')}
          className={`${itemBase} ${activeTab === 'chat' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}
        >
          <MessageSquareHeart size={22} />
          聊天
        </button>

        <button
          onClick={() => setTab('settings')}
          className={`${itemBase} ${activeTab === 'settings' ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`}
        >
          <Settings size={22} />
          設定
        </button>
      </div>
    </nav>
  )
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
      initial={{ opacity: 0, y: 8, scale: .98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[82%] rounded-[24px] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] md:max-w-[68%] ${isUser ? userBubble : aiBubble}`}>
        <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.text}</p>
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${isUser ? 'justify-end text-white/70' : 'text-white/65'}`}>
          {msg.time}{isUser && <span className="text-sky-200">✓✓</span>}
        </div>
      </div>
    </motion.div>
  )
}

function TypingBubble(){
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="rounded-[24px] rounded-bl-md bg-gradient-to-br from-[#1f8f5f] via-[#168052] to-[#0f6f46] px-4 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.22)]">
        <div className="flex gap-1">
          <span className="dot bg-white/80" />
          <span className="dot delay-150 bg-white/80" />
          <span className="dot delay-300 bg-white/80" />
        </div>
      </div>
    </motion.div>
  )
}

function Composer({ input, setInput, send }){
  return (
    <footer className="border-t border-white/12 bg-black/18 p-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <button className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/80">
          <SmilePlus size={20} />
        </button>

        <textarea
          rows="1"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="同小晴講句嘢…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-white/10 bg-white/92 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-pink-300"
        />

        <button onClick={send} className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-r from-pink-400 to-violet-500 text-white shadow-glow">
          <Send size={18} />
        </button>
      </div>
    </footer>
  )
}

function Ambient({ mood }){
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,114,182,.35),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(96,165,250,.25),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(139,92,246,.35),transparent_40%)]" />
      <div className="stars" />
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          className="rain"
          style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, opacity: mood === 'tired' ? .42 : .18 }}
        />
      ))}
      <div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-400/20 blur-3xl" />
    </div>
  )
}

function relationshipLevel(score){
  if(score > 82) return { label:'Soulmate 靈魂陪伴' }
  if(score > 65) return { label:'Lover 親密陪伴' }
  if(score > 48) return { label:'Crush 心動階段' }
  if(score > 30) return { label:'Close Friend 熟悉朋友' }
  if(score > 14) return { label:'Familiar 慢慢熟悉' }
  return { label:'Stranger 初次認識' }
}

function moodToAi(mood){
  return ({ sad:'worried', stress:'warm', lonely:'warm', happy:'excited' }[mood] || 'happy')
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>)
