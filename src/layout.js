export function initLayout() {
  const root = document.documentElement

  // ---- Theme toggle ----
  const themeToggle = document.getElementById('theme-toggle')
  const iconSun = document.getElementById('icon-sun')
  const iconMoon = document.getElementById('icon-moon')

  function syncThemeIcon() {
    const isDark = root.classList.contains('dark')
    iconSun.classList.toggle('hidden', isDark)
    iconMoon.classList.toggle('hidden', !isDark)
    themeToggle.setAttribute('aria-pressed', String(isDark))
  }
  syncThemeIcon()

  themeToggle.addEventListener('click', () => {
    root.classList.toggle('dark')
    localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light')
    syncThemeIcon()
  })

  // ---- Mobile nav ----
  const navToggle = document.getElementById('nav-toggle')
  const mobileNav = document.getElementById('mobile-nav')

  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true'
    navToggle.setAttribute('aria-expanded', String(!isOpen))
    mobileNav.hidden = isOpen
  })

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false')
      mobileNav.hidden = true
    })
  })

  // ---- Header scroll state ----
  const header = document.getElementById('site-header')
  function onScroll() {
    header.classList.toggle('header-scrolled', window.scrollY > 8)
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}
