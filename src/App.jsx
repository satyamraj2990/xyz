import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured, BUCKET, publicMediaUrl } from './lib/supabase'
import { ArrowDown, ArrowLeft, ArrowRight, AudioLines, Cake, Camera, Check, ChevronDown, CirclePlay, CloudUpload, Film, Heart, ImagePlus, LockKeyhole, LogOut, Mail, Music2, Pause, Play, Plus, Send, ShieldCheck, Sparkles, Star, Upload, X } from 'lucide-react'

const demoMemories = [
  { id: 'demo-1', title: 'The beginning', caption: 'Every story has a first page. This one became one of my favourites.', memory_date: '2020-08-14', category: 'The beginning', media_type: 'image', media_path: '', demo: true },
  { id: 'demo-2', title: 'One of those days', caption: 'Nothing extraordinary happened. Somehow, that made it extraordinary.', memory_date: '2021-11-02', category: 'Little moments', media_type: 'image', media_path: '', demo: true },
  { id: 'demo-3', title: 'A memory in motion', caption: 'The kind of moment I wish I could press pause on.', memory_date: '2023-03-19', category: 'Adventures', media_type: 'video', media_path: '', demo: true },
  { id: 'demo-4', title: 'Still one of my favourites', caption: 'A tiny reminder of all the laughter in between.', memory_date: '2024-07-06', category: 'Favourite days', media_type: 'image', media_path: '', demo: true },
]
const apologyDefault = `Dear you,

Before wishing you, I just wanted to own up to my mistakes and acknowledge how my actions might have made you feel. I know I hurt you. I never wanted to hurt someone who meant so much to me.

I'm not asking for forgiveness,I just feel I should take responsibility for what I did. Everyone makes mistakes and blunders I made mine too.

As always, grow more, Mr. Perfectionist. You'll always be one of the best chapter whenever I talk about a friend I've had.

Sorry for everything, Suhanii. 🫶🏻`

const birthdayDefault = `Happy birthday to one of the people I’ve genuinely learned a lot from, and someone who’s still a part of my bucket list that one day, we’ll take a picture together with our own cars, bought with our own money, and post it.

Honestly, I don’t have any expectations, and I don’t even know if you’ll see this or not. Whatever has happened in the past, today is your day, and I didn’t want it to pass without wishing you.

It’s 6 PM on November 6, and here I am, making this. I know you must already be having a good time celebrating at your workplace, with people around you and lots of celebrations. I hope all the things you’ve been working so hard for find their way to you. You deserve everything, my friend.

And, as always
"Paida Lene ke Liye Sukriyaa" ♡`

function formatDate(value) {
  if (!value) return 'A little moment'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function mediaKind(fileOrRow) {
  const type = fileOrRow?.type || fileOrRow?.media_type || ''
  if (type.startsWith('video') || type === 'video') return 'video'
  if (type.startsWith('audio') || type === 'audio') return 'audio'
  return 'image'
}
function countdownParts() {
  const target = new Date('2026-11-07T00:00:00+05:30').getTime()
  const now = Date.now()
  const diff = Math.max(0, target - now)
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000), passed: now >= target && now < target + 86400000, finished: now >= target + 86400000 }
}
function MediaView({ item, large = false }) {
  const url = item.demo ? '' : publicMediaUrl(item.media_path)
  if (!url) return <div className={`media-placeholder ${large ? 'media-placeholder-large' : ''}`}><span className="placeholder-star">✦</span><span>{item.media_type === 'video' ? 'A little moment in motion' : 'A memory waiting here'}</span><small>Add your own memories in the gallery</small></div>
  if (item.media_type === 'video') return <video src={url} controls preload="metadata" className="media-fit" />
  if (item.media_type === 'audio') return <div className="audio-card"><AudioLines size={28}/><audio src={url} controls preload="metadata" /></div>
  return <img src={url} alt={item.title || 'Friendship memory'} loading="lazy" className="media-fit" />
}
function App() {
  const [memories, setMemories] = useState(demoMemories)
  const [loadingMemories, setLoadingMemories] = useState(false)
  const [backendMessage, setBackendMessage] = useState('')
  const [activeTab, setActiveTab] = useState('home')
  const [filter, setFilter] = useState('All')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [apology, setApology] = useState(apologyDefault)
  const [birthday, setBirthday] = useState(birthdayDefault)
  const [countdown, setCountdown] = useState(countdownParts)
  const [musicOn, setMusicOn] = useState(false)
  const [session, setSession] = useState(null)
  const [adminMode, setAdminMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [draft, setDraft] = useState({ title: '', caption: '', memory_date: '', category: 'Little moments' })
  const fileInput = useRef(null)
  const [chosenFiles, setChosenFiles] = useState([])
  const musicAudioRef = useRef(null)
  const [chapter, setChapter] = useState(0)
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [finishOpen, setFinishOpen] = useState(false)
  const touchStartX = useRef(null)
  const thankYouVideoRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    setLoadingMemories(true)
    supabase.from('memories').select('id,title,caption,memory_date,category,media_type,media_path,sort_order').eq('is_published', true).order('sort_order', { ascending: true }).order('memory_date', { ascending: true }).then(({ data, error }) => {
      if (!alive) return
      if (error) setBackendMessage('Supabase is connected, but the memories table or read policy is not ready yet. Follow SETUP.md to run the SQL setup.')
      else { setMemories(data?.length ? data : []); setBackendMessage('') }
      setLoadingMemories(false)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCountdown(countdownParts()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (chapter !== 1 || !thankYouVideoRef.current) return undefined
    const video = thankYouVideoRef.current
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return undefined
    const audioContext = new AudioContext()
    const source = audioContext.createMediaElementSource(video)
    const gain = audioContext.createGain()
    gain.gain.value = 2
    source.connect(gain).connect(audioContext.destination)
    const resumeAudio = () => { if (audioContext.state === 'suspended') audioContext.resume() }
    video.addEventListener('play', resumeAudio)
    return () => {
      video.removeEventListener('play', resumeAudio)
      source.disconnect()
      gain.disconnect()
      audioContext.close()
    }
  }, [chapter])

  const years = useMemo(() => ['All', ...new Set(memories.map(m => m.memory_date ? m.memory_date.slice(0, 4) : 'Undated'))].sort((a,b) => a === 'All' ? -1 : b === 'All' ? 1 : b.localeCompare(a)), [memories])
  const filteredMemories = memories.filter(m => filter === 'All' || (filter === 'Photos' && m.media_type === 'image') || (filter === 'Videos' && m.media_type === 'video') || (filter === 'Audio' && m.media_type === 'audio') || m.memory_date?.startsWith(filter))
  const backgroundTrack = memories.find(memory => memory.media_type === 'audio' && !memory.demo)
  const uploadedLandscapeMedia = memories.find(memory => !memory.demo && (memory.media_type === 'image' || memory.media_type === 'video'))
  const landscapeMedia = uploadedLandscapeMedia || { media_type: 'image', media_path: '/birthday-photo.jpe', local: true }
  const landscapeMediaUrl = landscapeMedia.local ? landscapeMedia.media_path : publicMediaUrl(landscapeMedia.media_path)
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setActiveTab(id) }
  const chapters = [
    { year: '01', title: 'Happy Birthday', text: birthday, section: 'Happy Birthday Suhanniii' },
    { year: '02', title: 'Thank You', text: 'Thank you for every laugh, every walk, and every little moment that made ordinary days special.', section: 'Thank You' },
    { year: '03', title: 'A letter I owe you', text: apology, section: 'A letter I owe you' },
    { year: '04', title: 'There is Still Something left', text: 'The photos, videos, and song that hold the little pieces of our story. And after all of it, one last letter from my heart.', section: 'There is Still Something left' },
  ]
  const nextChapter = () => setChapter(index => (index + 1) % chapters.length)
  const previousChapter = () => setChapter(index => (index - 1 + chapters.length) % chapters.length)
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'ArrowRight' || event.key === ' ') nextChapter()
      if (event.key === 'ArrowLeft') previousChapter()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  async function toggleMusic() {
    if (!backgroundTrack) {
      setBackendMessage('Add an audio memory from the admin panel to use the background song.')
      return
    }

    if (musicOn) {
      musicAudioRef.current?.pause()
      setMusicOn(false)
      return
    }
    try {
      await musicAudioRef.current?.play()
      setMusicOn(true)
    } catch {
      setBackendMessage('Click the music button again to start the song.')
    }
  }

  function enterUniverse() {
    setWelcomeOpen(false)
  }

  function finishUniverse() {
    setFinishOpen(true)
  }

  async function signIn(e) {
    e.preventDefault(); setAuthBusy(true); setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthBusy(false)
    if (error) setAuthError(error.message)
    else { setSession(data.session); setPassword(''); setAuthError(''); setAdminMode(true) }
  }
  async function signOut() { await supabase.auth.signOut(); setSession(null); setAdminMode(false) }

  async function uploadMemories(e) {
    e.preventDefault()
    if (!supabase || !session) return
    if (!chosenFiles.length) { setUploadStatus('Choose at least one photo, video, or audio file first.'); return }
    setUploadBusy(true); setUploadStatus('Uploading your memories…')
    const inserted = []
    for (const file of chosenFiles) {
      const kind = mediaKind(file)
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').slice(-90)
      const path = `${crypto.randomUUID()}-${safeName}`
      const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })
      if (storageError) { setUploadStatus(`Upload stopped for ${file.name}: ${storageError.message}`); setUploadBusy(false); return }
      const { data, error } = await supabase.from('memories').insert({ title: draft.title.trim() || file.name.replace(/\.[^.]+$/, ''), caption: draft.caption.trim(), memory_date: draft.memory_date || null, category: draft.category, media_type: kind, media_path: path, is_published: true, sort_order: Date.now() }).select().single()
      if (error) { setUploadStatus(`File uploaded, but its memory record failed: ${error.message}. Check the SQL policies.`); setUploadBusy(false); return }
      inserted.push(data)
    }
    setMemories(prev => [...prev.filter(m => !m.demo), ...inserted].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)))
    setChosenFiles([]); if (fileInput.current) fileInput.current.value = ''
    setDraft({ title: '', caption: '', memory_date: '', category: 'Little moments' })
    setUploadStatus(`Added ${inserted.length} ${inserted.length === 1 ? 'memory' : 'memories'}.`)
    setUploadBusy(false)
  }

  async function deleteMemory(memory) {
    if (!confirm(`Delete “${memory.title}”? This removes its memory record and media file.`)) return
    const { error: rowError } = await supabase.from('memories').delete().eq('id', memory.id)
    if (rowError) { setUploadStatus(rowError.message); return }
    if (memory.media_path) {
      const { error: fileError } = await supabase.storage.from(BUCKET).remove([memory.media_path])
      if (fileError) setUploadStatus(`Memory deleted, but media cleanup failed: ${fileError.message}`)
    }
    setMemories(prev => prev.filter(m => m.id !== memory.id))
    setUploadStatus('Memory deleted.')
  }

  return <div className="app-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    {welcomeOpen && <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-card">
        <span className="eyebrow"><Sparkles size={13}/> A little request</span>
        <h2 id="welcome-title">Open this on your laptop and please Plug your earphones</h2>
        <button className="button button-primary" onClick={enterUniverse}>lessgooooooo <ArrowRight size={16}/></button>
      </div>
    </div>}
    {finishOpen && <div className="finish-overlay" role="dialog" aria-modal="true" aria-labelledby="finish-title">
      <div className="finish-card">
        <button className="finish-close" onClick={() => setFinishOpen(false)} aria-label="Close final video"><X size={20}/></button>
        <p id="finish-title">Ab samajh aaya 26 me konsi duniya khtam thi</p>
        <video className="finish-video" src="/sff.mp4" controls autoPlay playsInline preload="auto" />
      </div>
    </div>}
    {backgroundTrack && <audio ref={musicAudioRef} src={publicMediaUrl(backgroundTrack.media_path)} loop preload="metadata" />}
    {backendMessage && <div className="story-notice" role="status">{backendMessage}</div>}

    {adminMode && <section className="admin-panel" id="admin-panel">
      <div className="admin-top"><div><span className="eyebrow"><ShieldCheck size={13}/> PRIVATE ADMIN</span><h2>Manage memories</h2><p>Upload memories that will appear in the gallery.</p></div><button className="icon-button" onClick={() => setAdminMode(false)} aria-label="Close admin"><X size={18}/></button></div>
      {!isSupabaseConfigured ? <div className="setup-warning"><LockKeyhole size={20}/><div><b>Connect Supabase first</b><p>Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and anon/publishable key, then run the SQL in <code>supabase/schema.sql</code>. See <code>SETUP.md</code>.</p></div></div> : !session ? <form className="admin-login" onSubmit={signIn}><label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="Your admin email"/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Supabase Auth password"/></label>{authError && <p className="form-error">{authError}</p>}<button className="button button-primary" disabled={authBusy}>{authBusy?'Signing in…':'Sign in to upload'}</button><p className="fine-print">Admin access is enforced by Supabase Row Level Security, not just by hiding this panel.</p></form> : <div className="admin-content"><div className="admin-session"><span>Signed in as {session.user.email}</span><button className="button button-quiet" onClick={signOut}><LogOut size={15}/> Sign out</button></div><form className="upload-form" onSubmit={uploadMemories}><label className="file-drop"><input ref={fileInput} type="file" accept="image/*,video/*,audio/*" multiple onChange={e=>setChosenFiles(Array.from(e.target.files || []))}/><CloudUpload size={26}/><b>{chosenFiles.length ? `${chosenFiles.length} file(s) selected` : 'Choose photos, videos or voice notes'}</b><span>Multiple files supported · Keep individual files under 50 MB for a smoother upload</span></label><div className="form-grid"><label>Title (applies to each file)<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="A day to remember"/></label><label>Date<input type="date" value={draft.memory_date} onChange={e=>setDraft({...draft,memory_date:e.target.value})}/></label><label>Category<select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>{['The beginning','Little moments','Adventures','Favourite days','College days','Celebrations','Inside jokes','Birthday','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="span-two">Caption<textarea rows="2" value={draft.caption} onChange={e=>setDraft({...draft,caption:e.target.value})} placeholder="Why does this memory matter to you?"/></label></div><button className="button button-primary" disabled={uploadBusy}><Upload size={16}/>{uploadBusy?'Uploading…':'      Upload memories'}</button>{uploadStatus && <p className={uploadStatus.includes('failed')||uploadStatus.includes('stopped')?'form-error':'form-success'}>{uploadStatus}</p>}</form><div className="admin-list"><h3>Published memories ({memories.filter(m=>!m.demo).length})</h3>{memories.filter(m=>!m.demo).map(m=><div className="admin-list-row" key={m.id}><span>{m.media_type==='video'?<Film size={16}/>:m.media_type==='audio'?<AudioLines size={16}/>:<Camera size={16}/>}</span><div><b>{m.title}</b><small>{formatDate(m.memory_date)} · {m.category}</small></div><button className="text-button danger" onClick={()=>deleteMemory(m)}>Delete</button></div>)}</div></div>}
    </section>}

    <section className="guided-timeline" aria-label="Our story timeline" onTouchStart={event => { touchStartX.current = event.touches[0].clientX }} onTouchEnd={event => { const start = touchStartX.current; if (start === null) return; const distance = event.changedTouches[0].clientX - start; if (Math.abs(distance) > 45) distance < 0 ? nextChapter() : previousChapter(); touchStartX.current = null }}>
      <div className="guided-heading"><div className="birthday-decor birthday-decor-left" aria-hidden="true">♡　✦　♡</div><div className="birthday-decor birthday-decor-right" aria-hidden="true">✦　♡　✦</div><h1>Happy Birthday <em>Suhanniii</em></h1><span className="eyebrow birthday-motto"><Sparkles size={13}/> Made with Guts and Fear</span></div>
      <div className="guided-rail" style={{ '--timeline-progress': `${chapter / (chapters.length - 1) * 100}%` }}><div className="guided-progress" aria-hidden="true"/>{chapters.map((item, index) => <button key={item.year} className={`guided-stop ${index === chapter ? 'guided-stop-active' : ''} ${index === 3 ? 'guided-stop-final' : ''}`} onClick={() => setChapter(index)} aria-label={`Open ${item.title}`} aria-current={index === chapter ? 'step' : undefined}><span>✦</span>{index !== 3 && <><b>{item.year}</b><small>{item.title}</small></>}</button>)}</div>
      <article className={`guided-card ${chapter === 1 ? 'guided-card-thank-you' : ''} ${chapter === 3 ? 'guided-card-chapter-four' : ''}`} key={chapter}>
        {chapter !== 1 && chapter !== 3 && <div className={`guided-landscape ${landscapeMedia ? 'guided-landscape-media' : ''}`} aria-label={landscapeMedia ? 'Memory background' : 'Illustrated night landscape'}>
          {landscapeMedia.media_type === 'video' ? <><video className="landscape-media-bg" src={landscapeMediaUrl} autoPlay muted loop playsInline aria-hidden="true" /><video className="landscape-media" src={landscapeMediaUrl} autoPlay muted loop playsInline /></> : <><img className="landscape-media-bg" src={landscapeMediaUrl} alt="" aria-hidden="true" /><img className="landscape-media" src={landscapeMediaUrl} alt="A saved memory" /></>}
        </div>}
        <div className={`guided-content ${chapter === 1 ? 'guided-thank-you-content' : ''} ${chapter === 3 ? 'guided-chapter-four-content-wrap' : ''}`}>
          <span className="eyebrow">CHAPTER {String(chapter + 1).padStart(2, '0')} • {chapters[chapter].year}</span>
          <h2>{chapters[chapter].title}</h2>
          {chapter === 1 && <video ref={thankYouVideoRef} className="thank-you-video" src="/mem.mp4" controls autoPlay loop playsInline preload="auto" volume="1" aria-label="Thank you video" />}
          {chapter === 3 ? <div className="chapter-four-content"><div className="chapter-four-note"><img src="/manifestation.jpg" alt="Handwritten diary note" /></div><p className="chapter-four-quote">Over the last 8–9 months, not a single week went by without missing the people I once had in my life. These are the things I wrote down when everything was falling apart. Though a few things are still left, I hope you're reading this... and haan, I miss you guys,Sorry for everything</p></div> : <p>{chapters[chapter].text}</p>}
          <div className="guided-controls">{chapter !== 0 && <button className="button button-outline" onClick={previousChapter} aria-label="Previous chapter"><ArrowLeft size={16}/> Previous</button>}{chapter === chapters.length - 1 ? <button className="button button-primary guided-next" onClick={finishUniverse}>Finish <ArrowRight size={16}/></button> : <button className="button button-primary guided-next" onClick={nextChapter}>Next chapter <ArrowRight size={16}/></button>}</div><span className="gesture-hint">✦ Swipe left or right to explore</span>
        </div>
      </article>
    </section>
    <main>
      <section className="hero section-wrap" id="home"><div className="hero-copy"><span className="eyebrow"><Sparkles size={13}/> A little corner of the universe</span><h1>Hey, <em>you.</em></h1><h2>Welcome to <span>oppology-shoudbeloud</span></h2><p className="hero-lead">A place for our memories, little moments, big laughs, and a very special person.</p><p className="hero-note">I made this for you. <Heart size={13} fill="currentColor"/></p><button className="button button-primary hero-button" onClick={() => scrollTo('letter')}>Open oppology-shoudbeloud <ArrowRight size={16}/></button><div className="hero-signature">Some people, different dreams.<br/>Still, us. <span>✦</span></div></div><div className="hero-art" aria-label="Illustration of a quiet night sky"><div className="moon"/><div className="constellation constellation-a"><i/><i/><i/><i/></div><div className="constellation constellation-b"><i/><i/><i/></div><div className="hill hill-back"/><div className="hill hill-front"/><div className="silhouette silhouette-one"/><div className="silhouette silhouette-two"/><div className="art-caption">a thousand tiny moments <span>♥</span></div></div><div className="hero-bottom"><span>SCROLL A LITTLE</span><ArrowDown size={15}/><span>MADE WITH MEMORIES & HEART</span></div></section>

      <section className="letter-section section-wrap" id="letter"><div className="section-heading"><span className="eyebrow">02 — A LETTER I OWE YOU</span><h2>A letter I <em>owe you.</em></h2><p>Some things deserve more than a quick message.</p></div><div className="letter-paper"><div className="paper-holes"><i/><i/><i/><i/><i/><i/></div><div className="paper-content"><div className="paper-topline"><span>for you, always</span><span>✦</span></div><p className="letter-salutation">Dear you,</p><p className="letter-text">{apology}</p><div className="paper-flower">✿</div><div className="paper-footer"><span>Written with honesty,</span><span className="signature">someone who cares</span></div></div><div className="tape tape-one"/><div className="tape tape-two"/></div><p className="gentle-note"><Heart size={14}/> No pressure to reply. This is a space for honesty, not expectations.</p></section>

      <section className="timeline-section section-wrap" id="timeline"><div className="section-heading"><span className="eyebrow">02 — THE YEARS THAT MADE US</span><h2>Our friendship, <em>in little chapters.</em></h2><p>Every year has its own kind of magic. Add your dates and stories to bring this timeline to life.</p></div><div className="timeline-rail"><div className="rail-line"/>{['The beginning','First conversations','More laughs','College days','Big dreams','Through it all','Still here'].map((title,i)=><div className="rail-stop" key={title}><span className="rail-dot">✦</span><b>{['2019','2020','2021','2022','2023','2024','2025'][i]}</b><small>{title}</small></div>)}</div><div className="timeline-cards">{memories.slice(0,3).map((m,i)=><button className="timeline-card" key={m.id} onClick={() => setSelectedMemory(m)}><div className={`timeline-photo photo-tone-${i}`}><MediaView item={m}/><span className="photo-date">{formatDate(m.memory_date)}</span></div><div className="timeline-card-copy"><span className="eyebrow">CHAPTER {String(i+1).padStart(2,'0')}</span><h3>{m.title}</h3><p>{m.caption || 'A small moment, saved for later.'}</p><span className="read-more">Revisit memory <ArrowRight size={13}/></span></div></button>)}</div></section>

      <section className="gallery-section section-wrap" id="gallery"><div className="section-heading gallery-heading"><div><span className="eyebrow">03 — THE MEMORY WALL</span><h2>Little moments, <em>kept forever.</em></h2><p>Photos, videos, and tiny pieces of time that still make you smile.</p></div><span className="gallery-count"><Camera size={15}/> {memories.filter(m=>!m.demo).length} saved by you</span></div><div className="gallery-toolbar"><div className="filter-pills">{['All','Photos','Videos','Audio',...years.filter(y=>y!=='All')].map(v=><button key={v} className={filter===v?'filter-active':''} onClick={()=>setFilter(v)}>{v}</button>)}</div><button className="button button-outline" onClick={() => { setAdminMode(true); setTimeout(()=>document.getElementById('admin-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),50) }}><Plus size={15}/> Add memories</button></div>{loadingMemories && <p className="status-line">Gathering your memories…</p>}{backendMessage && <p className="status-line">{backendMessage}</p>}{!loadingMemories && filteredMemories.length===0 ? <div className="empty-gallery"><ImagePlus size={28}/><h3>Your memory wall is waiting.</h3><p>Sign in to the admin dashboard and upload the photos, videos, and voice notes you want to keep here.</p><button className="button button-primary" onClick={() => {setAdminMode(true); window.scrollTo({top:0,behavior:'smooth'})}}>Open admin dashboard <ArrowRight size={15}/></button></div> : <div className="memory-grid">{filteredMemories.map((m,i)=><button key={m.id} className={`memory-tile tile-${i%6}`} onClick={() => setSelectedMemory(m)}><div className="tile-media"><MediaView item={m}/>{m.media_type==='video' && <span className="media-play"><Play size={15} fill="currentColor"/></span>}{m.media_type==='audio' && <span className="media-play"><AudioLines size={15}/></span>}<span className="tile-date">{formatDate(m.memory_date)}</span></div><div className="tile-caption"><div><h3>{m.title}</h3><p>{m.caption || m.category}</p></div><Heart size={15}/></div></button>)}</div>}<div className="gallery-footnote"><span>✦</span> Every picture holds a little piece of a story. <span>✦</span></div></section>

      <section className="inside-section section-wrap" id="inside"><div className="section-heading"><span className="eyebrow">03 — THANK YOU</span><h2>For every little <em>thing.</em></h2><p>Thank you for the laughter, the patience, the memories, and for being part of my life in ways I will always remember.</p></div><div className="notes-grid"><article className="scrap-note note-yellow"><span className="note-pin">✦</span><span className="note-label">THANK YOU FOR</span><h3>The little moments</h3><ol><li>Every laugh that made an ordinary day brighter</li><li>The conversations that lasted too late</li><li>Showing up when it mattered</li><li>All the memories we made together</li></ol></article><article className="scrap-note note-cream"><span className="note-pin">♡</span><span className="note-label">KEPT CLOSE</span><h3>What I remember</h3><ul><li>Your kindness on difficult days</li><li>The way you make people feel understood</li><li>That laugh I can recognise anywhere</li><li>The comfort of simply being ourselves</li></ul></article><article className="scrap-note note-pink"><span className="note-pin">✿</span><span className="note-label">FROM THE HEART</span><h3>You matter to me</h3><p>Some people leave a mark quietly. Thank you for being one of those people in my story.</p><p className="note-script">Always grateful.</p></article></div></section>

      <section className="birthday-section section-wrap" id="birthday"><div className="birthday-stars"><span>✦</span><span>✧</span><span>✦</span><span>·</span><span>✧</span></div><div className="birthday-inner"><span className="eyebrow"><Cake size={14}/> 01 — 07 NOVEMBER 2026</span><h2>Happy <em>Birthday!</em></h2><p className="birthday-subtitle">This little universe begins with a wish for you.<br/>More dreams, more adventures, and a lifetime of happiness.</p><div className="countdown" aria-label="Countdown to birthday">{[['days',countdown.days],['hours',countdown.hours],['minutes',countdown.minutes],['seconds',countdown.seconds]].map(([label,val])=><div className="count-box" key={label}><b>{String(val).padStart(2,'0')}</b><span>{label}</span></div>)}</div><p className="birthday-date">{countdown.passed ? 'Today is your day ✦' : countdown.finished ? 'Keep shining, always ✦' : 'Counting down to November 7, 2026'}</p><div className="birthday-collage"><div className="collage-polaroid polaroid-left"><div className="collage-image collage-image-one">✿</div><span>the good old days</span></div><div className="cake-illustration"><div className="candle-row"><i/><i/><i/><i/><i/></div><div className="cake-top"/><div className="cake-body"><span>♡</span><span>♡</span><span>♡</span></div><div className="cake-plate"/></div><div className="collage-polaroid polaroid-right"><div className="collage-image collage-image-two">✦</div><span>more to come</span></div></div><div className="birthday-wish"><span className="wish-ornament">✧</span><p>{birthday}</p><span className="wish-ornament">♡</span></div><button className="button button-primary birthday-button" onClick={() => document.getElementById('letter')?.scrollIntoView({behavior:'smooth',block:'center'})}>Continue to your letters <ArrowDown size={15}/></button><div id="birthday-message" className="birthday-final"><Sparkles size={18}/><p>May this new chapter be kinder, brighter, and full of things that make you feel alive.</p></div></div></section>

      <section className="final-section section-wrap" id="final"><div className="final-sky"><div className="final-moon"/><span className="final-star star-a">✦</span><span className="final-star star-b">✧</span><span className="final-star star-c">·</span><span className="final-star star-d">✦</span><div className="final-hills"/></div><div className="final-copy"><span className="eyebrow">05 — ONE LAST LETTER</span><h2>For you,<br/><em>always.</em></h2><p>{birthday}</p><p>Whatever the future holds, I hope you know how deeply I value the memories, the laughter, and the person you are.</p><p>Thank you for being part of my little universe. Happy birthday.</p><div className="final-heart">♡</div><span className="final-signoff">With all my best wishes.</span></div></section>
    </main>

    <footer className="site-footer"><button className="brand footer-brand" onClick={() => scrollTo('home')}>oppology-shoudbeloud <Heart size={12} fill="currentColor"/></button><span>made with memories, honesty & a little courage</span><button className="back-top" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Back to the stars ↑</button></footer>

    {selectedMemory && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedMemory(null)}><div className="memory-modal" role="dialog" aria-modal="true" aria-label={selectedMemory.title} onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setSelectedMemory(null)} aria-label="Close memory"><X size={18}/></button><div className="modal-media"><MediaView item={selectedMemory} large/></div><div className="modal-copy"><span className="eyebrow">{formatDate(selectedMemory.memory_date)} · {selectedMemory.category}</span><h2>{selectedMemory.title}</h2><p>{selectedMemory.caption || 'A little moment worth keeping.'}</p></div></div></div>}
  </div>
}

export default App
