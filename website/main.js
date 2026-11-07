document.documentElement.classList.add('js')

const loader = document.querySelector('#loader')
const finishLoading = () => {
  if (!loader || loader.classList.contains('loader--done')) return
  loader.classList.add('loader--done')
  window.setTimeout(() => loader.remove(), 750)
}

window.addEventListener('load', () => window.setTimeout(finishLoading, 450), { once: true })
window.setTimeout(finishLoading, 1800)

const menuToggle = document.querySelector('#menu-toggle')
const navigation = document.querySelector('#primary-nav')

menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true'
  menuToggle.setAttribute('aria-expanded', String(!expanded))
  menuToggle.setAttribute('aria-label', expanded ? 'Abrir menú' : 'Cerrar menú')
  navigation?.classList.toggle('nav--open', !expanded)
  document.body.classList.toggle('menu-open', !expanded)
})

navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuToggle?.setAttribute('aria-expanded', 'false')
  menuToggle?.setAttribute('aria-label', 'Abrir menú')
  navigation.classList.remove('nav--open')
  document.body.classList.remove('menu-open')
}))

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12 })
  : null

document.querySelectorAll('.reveal').forEach((element) => {
  if (revealObserver) revealObserver.observe(element)
  else element.classList.add('is-visible')
})

const year = document.querySelector('#year')
if (year) year.textContent = String(new Date().getFullYear())

const backgroundMusic = document.querySelector('#background-music')
const musicSilenceButton = document.querySelector('#music-silence')

if (backgroundMusic && musicSilenceButton) {
  const musicPlaylist = [
    './assets/music/apollo-sol-invictus.mp3',
    './assets/music/apollo-sol-invictus-2.mp3',
  ]
  let currentTrack = 0
  let needsUserGesture = false
  backgroundMusic.src = musicPlaylist[currentTrack]
  backgroundMusic.volume = 0.35

  const setMusicControl = (muted, blocked = false) => {
    musicSilenceButton.textContent = muted ? (blocked ? 'Activar música' : 'Activar sonido') : 'Silencio'
    musicSilenceButton.setAttribute('aria-label', muted ? 'Activar música de fondo' : 'Silenciar música de fondo')
    musicSilenceButton.setAttribute('aria-pressed', String(muted))
  }

  const playAudibly = () => {
    backgroundMusic.muted = false
    return backgroundMusic.play().then(() => {
      needsUserGesture = false
      setMusicControl(false)
      return true
    }).catch(() => {
      needsUserGesture = true
      backgroundMusic.muted = true
      setMusicControl(true, true)
      return backgroundMusic.play().then(() => false).catch(() => false)
    })
  }

  backgroundMusic.addEventListener('ended', () => {
    currentTrack = (currentTrack + 1) % musicPlaylist.length
    backgroundMusic.src = musicPlaylist[currentTrack]
    backgroundMusic.play().catch(() => {
      needsUserGesture = true
      backgroundMusic.muted = true
      setMusicControl(true, true)
      backgroundMusic.play().catch(() => {})
    })
  })

  musicSilenceButton.addEventListener('click', () => {
    if (backgroundMusic.muted || backgroundMusic.paused) {
      playAudibly()
      return
    }

    backgroundMusic.muted = true
    setMusicControl(true)
  })

  const resumeAfterPageGesture = (event) => {
    if (!needsUserGesture || event.target.closest?.('#music-silence')) return
    playAudibly()
  }

  document.addEventListener('pointerdown', resumeAfterPageGesture, true)
  document.addEventListener('keydown', resumeAfterPageGesture, true)

  playAudibly()
}
