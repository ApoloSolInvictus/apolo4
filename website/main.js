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
