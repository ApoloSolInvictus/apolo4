const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
const settingsPath = () => path.join(app.getPath('userData'), 'apolo4-settings.json')

function readSettings() {
  try {
    if (!fs.existsSync(settingsPath())) return {}
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'))
    if (parsed.apiKey && parsed.apiKey.startsWith('enc:') && safeStorage.isEncryptionAvailable()) {
      parsed.apiKey = safeStorage.decryptString(Buffer.from(parsed.apiKey.slice(4), 'base64'))
    }
    return parsed
  } catch {
    return {}
  }
}

function writeSettings(settings) {
  const next = { ...settings }
  if (next.apiKey && safeStorage.isEncryptionAvailable()) {
    next.apiKey = `enc:${safeStorage.encryptString(next.apiKey).toString('base64')}`
  }
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
}

async function elevenLabsJson(url, apiKey, options = {}) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || AbortSignal.timeout(15000),
      headers: { 'xi-api-key': apiKey, ...(options.headers || {}) },
    })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error('ElevenLabs tardó más de 15 segundos en responder. Revisa la conexión y vuelve a actualizar el catálogo.')
    }
    if (error.name === 'TypeError') {
      throw new Error(`No se pudo conectar con ElevenLabs. Revisa internet y la API Key. ${error.message}`)
    }
    throw error
  }
  const body = await response.text()
  let data
  try { data = body ? JSON.parse(body) : {} } catch { data = { message: body } }
  if (!response.ok) {
    const message = data.detail?.message || data.detail || data.message || `ElevenLabs respondió ${response.status}`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data
}

async function listAccountVoices(apiKey) {
  const voices = []
  const seenTokens = new Set()
  let nextPageToken = ''

  do {
    const query = new URLSearchParams({ page_size: '100', include_total_count: 'false' })
    if (nextPageToken) query.set('next_page_token', nextPageToken)
    const data = await elevenLabsJson(`https://api.elevenlabs.io/v2/voices?${query}`, apiKey)
    voices.push(...(data.voices || []).map((voice) => ({ ...voice, source: 'account' })))
    nextPageToken = data.has_more ? data.next_page_token : ''
    if (nextPageToken && seenTokens.has(nextPageToken)) break
    if (nextPageToken) seenTokens.add(nextPageToken)
  } while (nextPageToken)

  return voices
}

async function listSharedSpanishVoicesPage(apiKey, { page = 0, gender = 'all', search = '' } = {}) {
  const query = new URLSearchParams({ page_size: '100', language: 'es', page: String(page) })
  if (gender === 'male' || gender === 'female') query.set('gender', gender)
  if (search.trim()) query.set('search', search.trim())
  const data = await elevenLabsJson(`https://api.elevenlabs.io/v1/shared-voices?${query}`, apiKey)
  return {
    voices: (data.voices || []).map((voice) => ({
      ...voice,
      source: 'library',
      labels: { gender: voice.gender || '', language: voice.language || 'es', accent: voice.accent || '' },
    })),
    hasMore: Boolean(data.has_more),
    page,
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 930,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#111411',
    title: 'Apolo4',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) mainWindow.loadURL(devUrl)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'electron.html'))
}

app.whenReady().then(() => {
  ipcMain.handle('settings:read', () => readSettings())
  ipcMain.handle('settings:write', (_event, settings) => {
    writeSettings(settings)
    return { ok: true }
  })
  ipcMain.handle('music:choose-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('elevenlabs:voices', async (_event, apiKey) => {
    if (!apiKey?.trim()) throw new Error('Falta la API Key de ElevenLabs.')
    const accountVoices = await listAccountVoices(apiKey.trim())
    return { accountVoices }
  })
  ipcMain.handle('elevenlabs:shared-voices', async (_event, { apiKey, page, gender, search }) => {
    if (!apiKey?.trim()) throw new Error('Falta la API Key de ElevenLabs.')
    return listSharedSpanishVoicesPage(apiKey.trim(), { page, gender, search })
  })
  ipcMain.handle('elevenlabs:add-shared-voice', async (_event, { apiKey, publicOwnerId, voiceId, name }) => {
    if (!apiKey?.trim()) throw new Error('Falta la API Key de ElevenLabs.')
    const owner = encodeURIComponent(publicOwnerId)
    const voice = encodeURIComponent(voiceId)
    return elevenLabsJson(`https://api.elevenlabs.io/v1/voices/add/${owner}/${voice}`, apiKey.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: name, bookmarked: true }),
    })
  })
  ipcMain.handle('elevenlabs:synthesize', async (_event, { apiKey, voiceId, text, modelId }) => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: modelId || 'eleven_multilingual_v2' }),
    })
    if (!response.ok) throw new Error(await response.text() || `ElevenLabs respondió ${response.status}`)
    return Buffer.from(await response.arrayBuffer()).toString('base64')
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
