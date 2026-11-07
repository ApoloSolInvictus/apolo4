import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AudioLines,
  ChevronDown,
  CircleHelp,
  Clock3,
  FolderOpen,
  Gauge,
  Headphones,
  ListMusic,
  LoaderCircle,
  LockKeyhole,
  Mic2,
  Moon,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react'
import './styles.css'

const PLAYLISTS = {
  manana: { id: 'manana', name: 'Mañana', icon: Sun, accent: '#e7b35a', window: '05:00 — 12:00', description: 'Luz, energía y comienzo' },
  tarde: { id: 'tarde', name: 'Tarde', icon: Waves, accent: '#ef8965', window: '12:00 — 18:00', description: 'Ritmo para acompañar el día' },
  noche: { id: 'noche', name: 'Noche', icon: Moon, accent: '#9ca8e7', window: '18:00 — 05:00', description: 'Calma para cerrar la jornada' },
}

const TUNING_RATIO = 432 / 440

function voiceGender(voice) {
  const label = String(voice.labels?.gender || voice.gender || '').trim().toLowerCase()
  if (/^(female|woman|feminine|mujer|femenina)$/.test(label)) return 'female'
  if (/^(male|man|masculine|hombre|masculino)$/.test(label)) return 'male'
  return 'unknown'
}

function voicePreviewUrl(voice) {
  return voice.preview_url || voice.samples?.find((sample) => sample.preview_url)?.preview_url || ''
}

function readLibrary() {
  // Blob URLs are valid only for the current app session. The actual library
  // is kept in memory until file-path persistence is added to the desktop shell.
  return { manana: [], tarde: [], noche: [] }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

function getMomentPlaylist() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'manana'
  if (hour >= 12 && hour < 18) return 'tarde'
  return 'noche'
}

function App() {
  const [activeView, setActiveView] = useState('studio')
  const [activePlaylist, setActivePlaylist] = useState(getMomentPlaylist())
  const [library, setLibrary] = useState(readLibrary)
  const [currentTrackId, setCurrentTrackId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [musicVolume, setMusicVolume] = useState(0.72)
  const [announcementVolume, setAnnouncementVolume] = useState(0.9)
  const [announcementText, setAnnouncementText] = useState('¡Bienvenidos a nuestra tienda! Hoy tenemos promociones especiales para ti.')
  const [announcementUrl, setAnnouncementUrl] = useState(null)
  const [announcementName, setAnnouncementName] = useState('Aún no hay un anuncio generado')
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [voices, setVoices] = useState([])
  const [libraryVoices, setLibraryVoices] = useState([])
  const [libraryError, setLibraryError] = useState('')
  const [apiError, setApiError] = useState('')
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryHasMore, setLibraryHasMore] = useState(false)
  const [libraryPage, setLibraryPage] = useState(0)
  const [libraryQuery, setLibraryQuery] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [gender, setGender] = useState('all')
  const [voiceSource, setVoiceSource] = useState('all')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [addingVoiceId, setAddingVoiceId] = useState('')
  const [modelId, setModelId] = useState('eleven_multilingual_v2')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [apiStatus, setApiStatus] = useState('not-tested')
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [autoMoment, setAutoMoment] = useState(true)
  const audioRef = useRef(null)
  const announcementAudioRef = useRef(null)
  const voicePreviewAudioRef = useRef(null)
  const pendingPlaylistRef = useRef(null)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const sharedCatalogRequestRef = useRef(0)
  const voiceSearchTimerRef = useRef(null)

  const playlist = PLAYLISTS[activePlaylist]
  const tracks = library[activePlaylist] || []
  const currentTrack = tracks.find((track) => track.id === currentTrackId) || tracks[0] || null
  const progressPercent = duration > 0 && Number.isFinite(duration)
    ? Math.min(100, Math.max(0, (progress / duration) * 100))
    : 0
  const filteredVoices = useMemo(() => {
    const available = voiceSource === 'account' ? voices : voiceSource === 'library' ? libraryVoices : [...voices, ...libraryVoices]
    const uniqueVoices = [...new Map(available.map((voice) => [voice.voice_id, voice])).values()]
    const query = voiceSearch.trim().toLowerCase()
    return uniqueVoices.filter((voice) => {
      const matchesGender = gender === 'all' || voiceGender(voice) === gender
      const searchable = [voice.name, voice.description, voice.labels?.accent, voice.accent, voice.labels?.language, voice.language, voice.category].filter(Boolean).join(' ').toLowerCase()
      return matchesGender && (!query || searchable.includes(query))
    })
  }, [voices, libraryVoices, gender, voiceSource, voiceSearch])
  const searchTracks = tracks.filter((track) => track.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    if (!window.apolo?.settings?.read) return
    window.apolo.settings.read().then((settings) => {
      if (settings?.apiKey) {
        setApiKey(settings.apiKey)
        loadVoices(settings.apiKey)
      }
      if (settings?.voiceId) setVoiceId(settings.voiceId)
      if (settings?.modelId) setModelId(settings.modelId)
    })
  }, [])
  useEffect(() => {
    if (!autoMoment) return undefined
    const interval = setInterval(() => requestPlaylistChange(getMomentPlaylist()), 60_000)
    return () => clearInterval(interval)
  }, [autoMoment, activePlaylist])
  useEffect(() => {
    const audio = audioRef.current
    setProgress(0)
    setDuration(0)
    if (!audio) return
    if (!currentTrack) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setIsPlaying(false)
      return
    }
    audio.src = currentTrack.url
    audio.playbackRate = TUNING_RATIO
    audio.load()
    if (isPlaying) audio.play().catch(() => setIsPlaying(false))
  }, [currentTrackId, activePlaylist])
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume
  }, [musicVolume])
  useEffect(() => {
    if (announcementAudioRef.current) announcementAudioRef.current.volume = announcementVolume
  }, [announcementVolume])
  useEffect(() => () => {
    library && Object.values(library).flat().forEach((track) => track.url?.startsWith('blob:') && URL.revokeObjectURL(track.url))
    if (announcementUrl) URL.revokeObjectURL(announcementUrl)
  }, []) // URLs are intentionally kept during this window session.

  function showToast(message, type = 'info') {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3600)
  }

  function togglePlayback() {
    if (!currentTrack) { showToast('Importa música para comenzar tu programación.'); return }
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else {
      if (audioRef.current.ended) audioRef.current.currentTime = 0
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => showToast('No se pudo reproducir este archivo.', 'error'))
    }
  }

  function playTrack(track) {
    if (!track) return
    setCurrentTrackId(track.id)
    setIsPlaying(true)
    if (currentTrack?.id === track.id && audioRef.current) {
      if (audioRef.current.ended) audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setIsPlaying(false))
    }
  }

  function nextTrack(step = 1) {
    if (!tracks.length) return
    const index = Math.max(0, tracks.findIndex((track) => track.id === currentTrack?.id))
    playTrack(tracks[(index + step + tracks.length) % tracks.length])
  }

  function requestPlaylistChange(playlistId, notify = false) {
    if (playlistId === activePlaylist) {
      pendingPlaylistRef.current = null
      return
    }
    const audio = audioRef.current
    if (audio && !audio.paused && !audio.ended) {
      pendingPlaylistRef.current = playlistId
      if (notify) showToast('Terminará la playlist actual antes de cambiar a la seleccionada.')
      return
    }
    pendingPlaylistRef.current = null
    setActivePlaylist(playlistId)
    setCurrentTrackId(null)
  }

  function handleEnded(event) {
    const audio = event.currentTarget
    if (!audio.ended || !currentTrack) return
    const currentIndex = tracks.findIndex((track) => track.id === currentTrack.id)
    if (currentIndex < 0) return

    if (currentIndex < tracks.length - 1) {
      playTrack(tracks[currentIndex + 1])
      return
    }

    const pendingPlaylist = pendingPlaylistRef.current
    if (pendingPlaylist) {
      pendingPlaylistRef.current = null
      const nextPlaylistTracks = library[pendingPlaylist] || []
      setActivePlaylist(pendingPlaylist)
      setCurrentTrackId(nextPlaylistTracks[0]?.id || null)
      setIsPlaying(nextPlaylistTracks.length > 0)
      return
    }

    // Complete the whole queue before looping back to its first song.
    playTrack(tracks[0])
  }

  function addFiles(fileList) {
    const files = [...fileList].filter((file) => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name))
    if (!files.length) { showToast('Selecciona archivos de audio compatibles.', 'error'); return }
    const added = files.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name.replace(/\.[^/.]+$/, ''), fileName: file.name, url: URL.createObjectURL(file), duration: 0 }))
    setLibrary((current) => ({ ...current, [activePlaylist]: [...(current[activePlaylist] || []), ...added] }))
    if (!currentTrackId) setCurrentTrackId(added[0].id)
    showToast(`${added.length} ${added.length === 1 ? 'pista agregada' : 'pistas agregadas'} a ${playlist.name}.`, 'success')
  }

  function removeTrack(trackId) {
    setLibrary((current) => ({ ...current, [activePlaylist]: current[activePlaylist].filter((track) => track.id !== trackId) }))
    if (currentTrackId === trackId) { setCurrentTrackId(null); setIsPlaying(false) }
  }

  async function saveSettings() {
    if (window.apolo?.settings?.write) await window.apolo.settings.write({ apiKey, voiceId, modelId })
    localStorage.setItem('apolo4-settings-lite', JSON.stringify({ voiceId, modelId }))
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2200)
    showToast('Configuración guardada en este equipo.', 'success')
  }

  async function loadVoices(key = apiKey) {
    if (!key?.trim()) { showToast('Escribe tu API Key de ElevenLabs primero.', 'error'); return }
    const cleanKey = key.trim()
    sharedCatalogRequestRef.current += 1
    setApiStatus('loading')
    setApiError('')
    setLibraryError('')
    setLibraryLoading(false)
    setLibraryVoices([])
    setLibraryHasMore(false)
    setLibraryPage(0)
    try {
      if (!window.apolo?.elevenlabs?.voices) throw new Error('Abre Apolo4 para cargar las voces de ElevenLabs.')
      const data = await window.apolo.elevenlabs.voices(cleanKey)
      const accountVoices = data.accountVoices || []
      setVoices(accountVoices)
      setVoiceId((current) => current || data.accountVoices?.[0]?.voice_id || '')
      setApiStatus('connected')
      setApiError('')
      showToast(`${accountVoices.length} voces de tu cuenta cargadas. Buscando voces compartidas…`, 'success')
      void loadSharedCatalogPage(0, gender, cleanKey, voiceSearch)
    } catch (error) {
      setApiStatus('error')
      const message = error.message || 'No se pudo conectar con ElevenLabs.'
      setApiError(message)
      showToast(message, 'error')
    }
  }

  async function loadSharedCatalogPage(page = 0, selectedGender = gender, key = apiKey, searchTerm = voiceSearch) {
    if (!key?.trim()) return
    if (!window.apolo?.elevenlabs?.sharedVoices) {
      setLibraryError('Actualiza Apolo4 con el instalador más reciente para cargar este catálogo.')
      return
    }
    const requestId = page === 0 ? ++sharedCatalogRequestRef.current : sharedCatalogRequestRef.current
    setLibraryLoading(true)
    setLibraryError('')
    if (page === 0) {
      setLibraryVoices([])
      setLibraryHasMore(false)
      setLibraryPage(0)
      setLibraryQuery(searchTerm)
    }
    try {
      const data = await window.apolo.elevenlabs.sharedVoices({
        apiKey: key.trim(),
        page,
        gender: selectedGender,
        search: searchTerm.trim(),
      })
      if (requestId !== sharedCatalogRequestRef.current) return
      const nextVoices = data.voices || []
      setLibraryVoices((current) => page === 0
        ? nextVoices
        : [...new Map([...current, ...nextVoices].map((voice) => [voice.voice_id, voice])).values()])
      setLibraryHasMore(Boolean(data.hasMore))
      setLibraryPage(page)
      setLibraryQuery(searchTerm)
    } catch (error) {
      if (requestId === sharedCatalogRequestRef.current) {
        setLibraryError(error.message || 'No se pudo consultar la biblioteca compartida.')
      }
    } finally {
      if (requestId === sharedCatalogRequestRef.current) setLibraryLoading(false)
    }
  }

  function loadMoreSharedVoices() {
    if (!libraryLoading && libraryHasMore) {
      void loadSharedCatalogPage(libraryPage + 1, gender, apiKey, libraryQuery)
    }
  }

  function changeGender(value) {
    setGender(value)
    if (apiStatus === 'connected') void loadSharedCatalogPage(0, value, apiKey, voiceSearch)
  }

  function changeVoiceSearch(value) {
    setVoiceSearch(value)
    window.clearTimeout(voiceSearchTimerRef.current)
    if (apiStatus === 'connected') {
      voiceSearchTimerRef.current = window.setTimeout(() => {
        void loadSharedCatalogPage(0, gender, apiKey, value)
      }, 400)
    }
  }

  async function addLibraryVoice(voice) {
    if (!window.apolo?.elevenlabs?.addSharedVoice) { showToast('Esta acción está disponible en la app de escritorio.', 'error'); return }
    setAddingVoiceId(voice.voice_id)
    try {
      const result = await window.apolo.elevenlabs.addSharedVoice({
        apiKey: apiKey.trim(),
        publicOwnerId: voice.public_owner_id,
        voiceId: voice.voice_id,
        name: voice.name,
      })
      if (!result.voice_id) throw new Error('ElevenLabs no devolvió el identificador de la voz añadida.')
      const accountVoice = { ...voice, voice_id: result.voice_id, source: 'account', is_owner: true }
      setVoices((current) => [...current.filter((item) => item.voice_id !== result.voice_id), accountVoice])
      setVoiceId(result.voice_id)
      showToast(`“${voice.name}” ya está en tu cuenta de ElevenLabs.`, 'success')
    } catch (error) {
      showToast(error.message || 'No se pudo añadir esa voz a tu cuenta.', 'error')
    } finally { setAddingVoiceId('') }
  }

  function previewVoice(voice) {
    const url = voicePreviewUrl(voice)
    if (!url) { showToast('Esta voz no tiene una muestra de audio disponible.'); return }
    voicePreviewAudioRef.current?.pause()
    const preview = new Audio(url)
    voicePreviewAudioRef.current = preview
    preview.play().catch(() => showToast('No se pudo reproducir la muestra.', 'error'))
  }

  async function generateAnnouncement() {
    if (!announcementText.trim()) { showToast('Escribe el mensaje del anuncio.', 'error'); return }
    if (!apiKey.trim()) { showToast('Agrega tu API Key en Configuración para generar la voz.', 'error'); setActiveView('settings'); return }
    setIsGenerating(true)
    try {
      const base64 = window.apolo?.elevenlabs?.synthesize
        ? await window.apolo.elevenlabs.synthesize({ apiKey: apiKey.trim(), voiceId, text: announcementText.trim(), modelId })
        : await synthesizeInBrowser()
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
      if (announcementUrl) URL.revokeObjectURL(announcementUrl)
      setAnnouncementUrl(url)
      setAnnouncementName(`Anuncio · ${new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`)
      showToast('Anuncio generado y listo para sonar sobre la música.', 'success')
    } catch (error) {
      showToast(error.message || 'No se pudo generar el anuncio.', 'error')
    } finally { setIsGenerating(false) }
  }

  async function synthesizeInBrowser() {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': apiKey.trim(), 'Content-Type': 'application/json' }, body: JSON.stringify({ text: announcementText.trim(), model_id: modelId }),
    })
    if (!response.ok) throw new Error(await response.text() || 'ElevenLabs rechazó la solicitud.')
    return btoa(String.fromCharCode(...new Uint8Array(await response.arrayBuffer())))
  }

  function playAnnouncement() {
    if (!announcementUrl) { showToast('Genera un anuncio antes de reproducirlo.'); return }
    announcementAudioRef.current?.play().catch(() => showToast('No se pudo reproducir el anuncio.', 'error'))
  }

  const navItems = [
    { id: 'studio', label: 'Estudio', icon: Radio },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ]

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src="./branding/logo2-apolo.png" alt="Apolo4" /></div>
      <div className="sidebar-caption">CENTRO DE AUDIO</div>
      <nav className="main-nav">
        {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${activeView === id ? 'active' : ''}`} onClick={() => setActiveView(id)}><Icon size={18} /><span>{label}</span>{id === 'settings' && apiStatus === 'connected' && <i className="status-dot" />}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="side-card">
        <div className="side-card-icon"><Gauge size={17} /></div>
        <div><small>AFINACIÓN ACTIVA</small><b>432 Hz</b><span>-31.77 cents · suave y natural</span></div>
      </div>
      <div className="sidebar-footer"><div className="online-dot" /> Sistema local listo <span>v0.1</span></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div><div className="topbar-brand"><img className="dashboard-favicon" src="./branding/favicon-apolo.png" alt="" /><img className="dashboard-wordmark" src="./branding/nombre-apolo.png" alt="Apolo4" /><span className="eyebrow">{activeView === 'studio' ? 'ESTUDIO DE EMISIÓN' : activeView === 'playlists' ? 'PROGRAMACIÓN MUSICAL' : 'PREFERENCIAS DEL SISTEMA'}</span></div><h1>{activeView === 'studio' ? 'Tu espacio de aire' : activeView === 'playlists' ? 'Programación musical' : 'Configuración'}</h1></div><div className="topbar-right"><div className="clock"><Clock3 size={16} /><span>{new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</span><small>{new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' })}</small></div><div className="avatar">A4</div></div></header>

      {activeView === 'studio' && <>
        <section className="hero-grid">
          <div className="hero-card">
            <div className="hero-copy"><div className="live-pill"><span /> AL AIRE · PROGRAMACIÓN LOCAL</div><h2>La música que <em>acompaña</em><br />tu momento.</h2><p>Diseña una atmósfera para cada hora del día y deja que tu mensaje llegue con una voz que se siente humana.</p><div className="hero-actions"><button className="button button-primary" onClick={() => setActiveView('playlists')}><Music2 size={16} /> Ver programación</button><button className="button button-quiet" onClick={() => setActiveView('settings')}><SlidersHorizontal size={16} /> Ajustar estudio</button></div></div>
            <div className="hero-orb"><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-core"><AudioLines size={41} /><span>432</span><small>HZ</small></div><div className="orb-label label-top">MÚSICA</div><div className="orb-label label-bottom">VOZ + AMBIENTE</div></div>
          </div>
          <div className="now-playing-card"><div className="card-heading"><span>REPRODUCIENDO AHORA</span><button className="icon-button"><CircleHelp size={15} /></button></div>{currentTrack ? <><div className="track-art"><div className="art-grid" /><Music2 size={34} /><span>LOCAL<br />SESSION</span></div><h3>{currentTrack.name}</h3><p>{playlist.name} · afinación 432 Hz</p><div className="waveform">{Array.from({ length: 29 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 31) % 38)}%` }} />)}</div><div className="now-controls"><button className="round-control" onClick={() => nextTrack(-1)}><SkipBack size={17} /></button><button className="round-control play-control" onClick={togglePlayback}>{isPlaying ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}</button><button className="round-control" onClick={() => nextTrack(1)}><SkipForward size={17} /></button></div></> : <div className="empty-now"><Music2 size={32} /><strong>Tu próxima sesión empieza aquí</strong><span>Importa canciones en la playlist activa</span><button className="text-button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Importar música</button></div>}</div>
        </section>

        <section className="section-heading"><div><span className="section-kicker">RITMO DEL DÍA</span><h2>Elige la atmósfera</h2></div><label className="toggle-label"><span>Automático por hora</span><button className={`toggle ${autoMoment ? 'on' : ''}`} onClick={() => setAutoMoment(!autoMoment)}><i /></button></label></section>
        <section className="playlist-row">{Object.values(PLAYLISTS).map((item) => { const Icon = item.icon; const isActive = activePlaylist === item.id; return <button key={item.id} className={`playlist-card ${isActive ? 'selected' : ''}`} style={{ '--accent': item.accent }} onClick={() => requestPlaylistChange(item.id, true)}><div className="playlist-icon"><Icon size={19} /></div><div className="playlist-info"><strong>{item.name}</strong><span>{item.description}</span><small>{item.window} · {library[item.id]?.length || 0} pistas</small></div><ChevronDown size={16} className="playlist-chevron" /></button> })}</section>

        <section className="section-heading announcement-heading"><div><span className="section-kicker">LOCUCIÓN COMERCIAL</span><h2>Tu mensaje, con voz</h2></div><div className="powered"><span>POWERED BY</span><b>eleven<span>labs</span></b></div></section>
        <section className="announcement-grid">
          <div className="announcement-composer panel"><div className="panel-top"><div className="panel-title"><div className="number-badge">01</div><div><strong>Escribe el anuncio</strong><span>Cuéntale a tus clientes lo que necesitan saber.</span></div></div><Mic2 size={19} className="muted-icon" /></div><textarea value={announcementText} onChange={(event) => setAnnouncementText(event.target.value)} maxLength={500} placeholder="Escribe aquí el mensaje de tu tienda..." /><div className="composer-footer"><span>{announcementText.length}/500 caracteres</span><button className="button button-primary" onClick={generateAnnouncement} disabled={isGenerating}>{isGenerating ? <><LoaderCircle size={16} className="spin" /> Generando voz...</> : <><Sparkles size={16} /> Generar voz</>}</button></div></div>
          <div className="announcement-result panel"><div className="panel-top"><div className="panel-title"><div className="number-badge soft">02</div><div><strong>Previsualiza tu voz</strong><span>{announcementName}</span></div></div><div className="voice-chip"><div className="voice-avatar">{filteredVoices.find((voice) => voice.voice_id === voiceId)?.name?.slice(0, 1) || 'V'}</div><span>{filteredVoices.find((voice) => voice.voice_id === voiceId)?.name || 'Selecciona una voz'}</span></div></div>{announcementUrl ? <><div className="voice-preview"><div className="voice-play" onClick={playAnnouncement}><Play size={18} fill="currentColor" /></div><div className="voice-wave">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${22 + ((index * 17) % 64)}%` }} />)}</div><span className="voice-time">MP3</span></div><div className="voice-controls"><label><Volume2 size={14} /><input type="range" min="0" max="1" step="0.01" value={announcementVolume} onChange={(event) => setAnnouncementVolume(Number(event.target.value))} /></label><button className="button button-quiet" onClick={playAnnouncement}><Headphones size={15} /> Escuchar</button></div></> : <div className="voice-empty"><div className="empty-mic"><AudioLines size={21} /></div><span>Tu anuncio aparecerá aquí<br /><small>Genera una voz para escucharla sobre la música</small></span></div>}</div>
        </section>
      </>}

      {activeView === 'playlists' && <PlaylistsView activePlaylist={activePlaylist} setActivePlaylist={(id) => requestPlaylistChange(id, true)} library={library} search={search} setSearch={setSearch} fileInputRef={fileInputRef} folderInputRef={folderInputRef} addFiles={addFiles} currentTrackId={currentTrackId} playTrack={playTrack} isPlaying={isPlaying} removeTrack={removeTrack} />}

      {activeView === 'settings' && <SettingsView apiKey={apiKey} setApiKey={setApiKey} voices={voices} libraryVoices={libraryVoices} libraryError={libraryError} apiError={apiError} libraryLoading={libraryLoading} libraryHasMore={libraryHasMore} filteredVoices={filteredVoices} voiceId={voiceId} setVoiceId={setVoiceId} gender={gender} setGender={changeGender} voiceSource={voiceSource} setVoiceSource={setVoiceSource} voiceSearch={voiceSearch} setVoiceSearch={changeVoiceSearch} modelId={modelId} setModelId={setModelId} loadVoices={loadVoices} loadMoreSharedVoices={loadMoreSharedVoices} addLibraryVoice={addLibraryVoice} addingVoiceId={addingVoiceId} previewVoice={previewVoice} saveSettings={saveSettings} settingsSaved={settingsSaved} apiStatus={apiStatus} />}
    </main>

    <footer className="player-dock"><div className="dock-track"><div className="dock-art"><Music2 size={16} /></div><div className="dock-track-copy"><strong>{currentTrack?.name || 'Ninguna pista seleccionada'}</strong><span>{currentTrack ? `${playlist.name} · Local` : 'Importa música para comenzar'}</span></div></div><div className="dock-center"><div className="dock-buttons"><button onClick={() => nextTrack(-1)}><SkipBack size={15} /></button><button className="dock-play" onClick={togglePlayback}>{isPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}</button><button onClick={() => nextTrack(1)}><SkipForward size={15} /></button></div><div className="dock-progress"><span>{formatTime(progress)}</span><input type="range" min="0" max={duration || 0} value={progress} disabled={!currentTrack || duration <= 0} aria-label="Progreso de reproducción" style={{ '--progress': `${progressPercent}%` }} onChange={(event) => { const value = Number(event.target.value); setProgress(value); if (audioRef.current) audioRef.current.currentTime = value }} /><span>{formatTime(duration)}</span></div></div><div className="dock-volume"><span className="tuning-tag"><Waves size={13} /> 432 Hz</span><Volume2 size={15} /><input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /></div></footer>
    <audio ref={audioRef} onTimeUpdate={() => { const time = audioRef.current?.currentTime; setProgress(Number.isFinite(time) ? time : 0) }} onLoadedMetadata={() => { const length = audioRef.current?.duration; setDuration(Number.isFinite(length) ? length : 0) }} onDurationChange={() => { const length = audioRef.current?.duration; if (Number.isFinite(length)) setDuration(length) }} onEnded={handleEnded} />
    <audio ref={announcementAudioRef} src={announcementUrl || undefined} onEnded={() => showToast('Anuncio finalizado.', 'info')} />
    <input ref={fileInputRef} className="hidden-input" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
    <input ref={folderInputRef} className="hidden-input" type="file" accept="audio/*" multiple webkitdirectory="" directory="" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
    {toast && <div className={`toast ${toast.type}`}><span>{toast.type === 'error' ? <X size={16} /> : <Sparkles size={16} />}</span>{toast.message}</div>}
  </div>
}

function PlaylistsView({ activePlaylist, setActivePlaylist, library, search, setSearch, fileInputRef, folderInputRef, addFiles, currentTrackId, playTrack, isPlaying, removeTrack }) {
  const item = PLAYLISTS[activePlaylist]
  const Icon = item.icon
  const tracks = library[activePlaylist] || []
  const visibleTracks = tracks.filter((track) => track.name.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-content"><div className="playlist-page-head"><div><div className="page-icon" style={{ color: item.accent, background: `${item.accent}18` }}><Icon size={22} /></div><span className="section-kicker">BIBLIOTECA LOCAL</span><h2>Tu música por momento</h2><p>Organiza la banda sonora de tu tienda y Apolo4 la reproducirá a 432 Hz.</p></div><div className="page-head-actions"><button className="button button-quiet" onClick={() => folderInputRef.current?.click()}><FolderOpen size={16} /> Elegir carpeta</button><button className="button button-primary" onClick={() => fileInputRef.current?.click()}><Plus size={16} /> Importar pistas</button></div></div><div className="playlist-tabs">{Object.values(PLAYLISTS).map((tab) => { const TabIcon = tab.icon; return <button key={tab.id} className={activePlaylist === tab.id ? 'active' : ''} onClick={() => setActivePlaylist(tab.id)}><TabIcon size={16} /> {tab.name}<span>{library[tab.id]?.length || 0}</span></button> })}</div><div className="library-toolbar"><div className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en esta playlist" /></div><span>{tracks.length} {tracks.length === 1 ? 'pista' : 'pistas'}</span></div>{visibleTracks.length ? <div className="track-table">{visibleTracks.map((track, index) => <div className={`track-row ${currentTrackId === track.id ? 'playing-row' : ''}`} key={track.id} onDoubleClick={() => playTrack(track)}><div className="track-index">{currentTrackId === track.id && isPlaying ? <AudioLines size={15} /> : index + 1}</div><div className="mini-art"><Music2 size={16} /></div><div className="track-name"><strong>{track.name}</strong><span>{track.fileName}</span></div><span className="track-badge">432 Hz</span><span className="track-duration">{formatTime(track.duration)}</span><button className="row-play" onClick={() => playTrack(track)}>{currentTrackId === track.id && isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button><button className="row-delete" onClick={() => removeTrack(track.id)} aria-label="Eliminar pista"><Trash2 size={15} /></button></div>)}</div> : <div className="empty-library"><div className="empty-library-icon"><Upload size={24} /></div><h3>Esta playlist está esperando música</h3><p>Agrega archivos MP3, WAV, OGG, M4A o FLAC desde tu computadora.</p><button className="button button-primary" onClick={() => fileInputRef.current?.click()}><Plus size={16} /> Agregar música</button></div>}<div className="library-note"><LockKeyhole size={14} /> Tus archivos se reproducen localmente; Apolo4 no los sube a ningún servicio.</div></div>
}

function SettingsView({ apiKey, setApiKey, voices, libraryVoices, libraryError, apiError, libraryLoading, libraryHasMore, filteredVoices, voiceId, setVoiceId, gender, setGender, voiceSource, setVoiceSource, voiceSearch, setVoiceSearch, modelId, setModelId, loadVoices, loadMoreSharedVoices, addLibraryVoice, addingVoiceId, previewVoice, saveSettings, settingsSaved, apiStatus }) {
  const emptyMessage = apiStatus === 'loading'
    ? 'Consultando las voces de tu cuenta…'
    : libraryLoading
      ? 'Cargando voces compartidas…'
    : apiStatus !== 'connected'
      ? 'Conecta con ElevenLabs para cargar voces.'
      : voiceSource === 'library' && libraryError
        ? 'La biblioteca compartida no está habilitada para esta API Key.'
        : gender === 'female'
          ? 'No hay voces de mujer con esos filtros. Prueba “Biblioteca” o busca otro estilo.'
          : 'No hay voces con esos filtros. Cambia el género o el origen.'

  return <div className="settings-page page-content">
    <div className="settings-intro"><div className="page-icon purple"><Settings size={22} /></div><span className="section-kicker">CONTROL DEL ESTUDIO</span><h2>Configuración de voz</h2><p>Conecta ElevenLabs para convertir cada promoción en una locución lista para entrar al aire.</p></div>
    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-card-head"><div><h3><LockKeyhole size={17} /> Conexión ElevenLabs</h3><p>Tu API Key se guarda localmente en este equipo.</p></div><div className={`connection-state ${apiStatus}`}><i />{apiStatus === 'connected' ? 'Conectado' : apiStatus === 'loading' ? 'Cargando voces' : apiStatus === 'error' ? 'Revisar' : 'Sin probar'}</div></div>
        <label className="field-label">API KEY <span>ELEVENLABS</span></label>
        <div className="key-field"><LockKeyhole size={15} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="xi-..." /><span>••••</span></div>
        <div className="field-hint"><CircleHelp size={14} /> Puedes encontrarla en tu panel de ElevenLabs.</div>
        <div className="settings-actions"><button className="button button-quiet" onClick={() => loadVoices()} disabled={apiStatus === 'loading'}><RefreshCw size={15} className={apiStatus === 'loading' ? 'spin' : ''} /> Actualizar catálogo</button><button className="button button-primary" onClick={saveSettings}>{settingsSaved ? <><Sparkles size={15} /> Guardado</> : <><Save size={15} /> Guardar configuración</>}</button></div>
        {apiError && <div className="library-access-note"><CircleHelp size={14} /><span>No se pudieron consultar las voces de la cuenta. {apiError}</span></div>}
      </section>
      <section className="settings-card">
        <div className="settings-card-head"><div><h3><Mic2 size={17} /> Locutor predeterminado</h3><p>Explora voces masculinas y femeninas en español.</p></div><div className="voice-count">{filteredVoices.length} voces{libraryLoading ? ' · cargando…' : ''}</div></div>
        <div className="field-row">
          <div><label className="field-label">GÉNERO</label><div className="segmented">{[['all','Todas'],['male','Hombre'],['female','Mujer']].map(([value, label]) => <button key={value} className={gender === value ? 'active' : ''} onClick={() => setGender(value)}>{label}</button>)}</div></div>
          <div><label className="field-label">MODELO</label><div className="select-wrap"><select value={modelId} onChange={(event) => setModelId(event.target.value)}><option value="eleven_multilingual_v2">Multilingual v2</option><option value="eleven_flash_v2_5">Flash v2.5</option><option value="eleven_turbo_v2_5">Turbo v2.5</option></select><ChevronDown size={15} /></div></div>
        </div>
        <div className="voice-browser-controls">
          <div className="voice-source-tabs">{[['all','Todas'],['account','Mi cuenta'],['library','Biblioteca']].map(([value, label]) => <button key={value} className={voiceSource === value ? 'active' : ''} onClick={() => setVoiceSource(value)}>{label}{value === 'account' ? <span>{voices.length}</span> : value === 'library' ? <span>{libraryVoices.length}</span> : null}</button>)}</div>
          <label className="voice-search"><Search size={14} /><input value={voiceSearch} onChange={(event) => setVoiceSearch(event.target.value)} placeholder="Buscar voz, acento o estilo" /></label>
        </div>
        {libraryError && voiceSource !== 'account' && <div className="library-access-note"><CircleHelp size={14} /><span>ElevenLabs no permitió cargar la biblioteca compartida con esta cuenta. {libraryError}</span></div>}
        <div className="voice-select-list">
          {filteredVoices.length ? filteredVoices.map((voice) => {
            const isLibraryVoice = voice.source === 'library'
            const genderLabel = voiceGender(voice) === 'female' ? 'Mujer' : voiceGender(voice) === 'male' ? 'Hombre' : 'Voz'
            const accent = voice.labels?.accent || voice.accent
            const language = voice.labels?.language || voice.language || 'Multilingüe'
            const previewUrl = voicePreviewUrl(voice)
            return <div key={`${voice.source}-${voice.voice_id}`} className={`voice-option ${voiceId === voice.voice_id && !isLibraryVoice ? 'selected' : ''} ${isLibraryVoice ? 'shared' : ''}`} role="button" tabIndex={isLibraryVoice ? -1 : 0} onClick={() => !isLibraryVoice && setVoiceId(voice.voice_id)} onKeyDown={(event) => { if (!isLibraryVoice && (event.key === 'Enter' || event.key === ' ')) setVoiceId(voice.voice_id) }}>
              <div className="voice-avatar large">{voice.name?.slice(0, 1) || 'V'}</div>
              <div className="voice-option-copy"><strong>{voice.name || 'Voz ElevenLabs'}</strong><span>{[genderLabel, accent, language, voice.category].filter(Boolean).join(' · ')}</span></div>
              <div className="voice-option-actions">
                {previewUrl && <button className="voice-action preview" onClick={(event) => { event.stopPropagation(); previewVoice(voice) }} title={`Escuchar ${voice.name}`}><Headphones size={14} /></button>}
                {isLibraryVoice
                  ? <button className="voice-action add" disabled={addingVoiceId === voice.voice_id} onClick={(event) => { event.stopPropagation(); addLibraryVoice(voice) }}>{addingVoiceId === voice.voice_id ? <LoaderCircle size={14} className="spin" /> : <Plus size={14} />} Añadir</button>
                  : <div className="radio-check" />}
              </div>
            </div>
          }) : <div className="no-voices">{emptyMessage}</div>}
        </div>
        {voiceSource !== 'account' && libraryHasMore && <button className="voice-load-more" onClick={loadMoreSharedVoices} disabled={libraryLoading}>{libraryLoading ? <LoaderCircle size={14} className="spin" /> : <Plus size={14} />}{libraryLoading ? 'Cargando voces…' : 'Cargar más voces de la biblioteca'}</button>}
        {voiceSource === 'all' && <div className="voice-library-footnote">“Añadir” guarda esa voz compartida en tu cuenta de ElevenLabs para usarla en anuncios.</div>}
      </section>
    </div>
    <div className="settings-tip"><Sparkles size={18} /><div><strong>Consejo para anuncios de tienda</strong><span>Escribe frases breves, menciona el beneficio primero y deja una pausa natural entre cada idea. La voz suena mejor entre 10 y 35 segundos.</span></div></div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
