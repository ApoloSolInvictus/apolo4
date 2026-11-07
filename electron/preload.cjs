const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('apolo', {
  settings: {
    read: () => ipcRenderer.invoke('settings:read'),
    write: (settings) => ipcRenderer.invoke('settings:write', settings),
  },
  music: {
    chooseFolder: () => ipcRenderer.invoke('music:choose-folder'),
  },
  elevenlabs: {
    voices: (apiKey) => ipcRenderer.invoke('elevenlabs:voices', apiKey),
    sharedVoices: (payload) => ipcRenderer.invoke('elevenlabs:shared-voices', payload),
    addSharedVoice: (payload) => ipcRenderer.invoke('elevenlabs:add-shared-voice', payload),
    synthesize: (payload) => ipcRenderer.invoke('elevenlabs:synthesize', payload),
  },
})
