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

  initScrollReveal()
  initCustomCursor()
}

// ---- Scroll reveal ----
// Same choreography (translateY + opacity, brand easing) on every [data-reveal]
// element site-wide, so scrolling down reads as one continuous sequence instead
// of each section popping in on its own. Exported so pages that inject content
// after load (the case-study template) can re-scan for newly added items.
export function initScrollReveal(scope = document) {
  const items = scope.querySelectorAll('[data-reveal]')
  if (!items.length) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('in-view'))
    return
  }

  items.forEach((item) => {
    item.classList.add('reveal')
    const group = item.closest('[data-reveal-group]')
    if (group) {
      const siblings = Array.from(group.querySelectorAll('[data-reveal]'))
      const index = siblings.indexOf(item)
      item.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 0.09}s`)
    }
  })

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  )
  items.forEach((item) => revealObserver.observe(item))
}

// ---- Custom cursor ----
// Dot + trailing ring in brand lilac. Fine-pointer (mouse/trackpad) devices only —
// leaves touch devices and reduced-motion users with the native cursor.
function initCustomCursor() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  if (reducedMotion || !hasFinePointer) return

  const dot = document.createElement('div')
  dot.className = 'cursor-dot'
  const ring = document.createElement('div')
  ring.className = 'cursor-ring'
  document.body.append(dot, ring)
  document.body.classList.add('has-custom-cursor')

  // Position via the standalone `translate` property (not `transform`) so the
  // ring's hover `transform: scale()` composes instead of being clobbered by
  // the position update running every frame.
  const centerPos = (x, y) => `calc(${x}px - 50%) calc(${y}px - 50%)`

  let ringX = window.innerWidth / 2
  let ringY = window.innerHeight / 2
  let targetX = ringX
  let targetY = ringY
  dot.style.translate = centerPos(targetX, targetY)
  ring.style.translate = centerPos(ringX, ringY)

  window.addEventListener(
    'mousemove',
    (e) => {
      targetX = e.clientX
      targetY = e.clientY
      dot.style.translate = centerPos(targetX, targetY)

      const el = e.target.closest('a, button, [role="button"]')
      ring.classList.toggle('is-active', Boolean(el))
    },
    { passive: true }
  )

  function trackRing() {
    ringX += (targetX - ringX) * 0.18
    ringY += (targetY - ringY) * 0.18
    ring.style.translate = centerPos(ringX, ringY)
    requestAnimationFrame(trackRing)
  }
  requestAnimationFrame(trackRing)
}
