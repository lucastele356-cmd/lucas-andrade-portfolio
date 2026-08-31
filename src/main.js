import { initLayout } from './layout.js'

initLayout()

// ---- Project thumbnails scale up as they enter the viewport ----
const projectFrames = document.querySelectorAll('.project-card-frame')
const reducedMotionForFrames = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (projectFrames.length && 'IntersectionObserver' in window && !reducedMotionForFrames) {
  const frameObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
          frameObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
  )
  projectFrames.forEach((frame) => frameObserver.observe(frame))
} else {
  projectFrames.forEach((frame) => frame.classList.add('in-view'))
}

// ---- Hero plays along with scroll (scroll-scrub) ----
// Pre-rendered JPEG sequence drawn to a canvas, instead of seeking a <video> —
// seeking a compressed video has to decode from the nearest keyframe, which
// stutters on scroll; picking an already-decoded frame out of memory doesn't.
const heroScrub = document.getElementById('hero-scrub')
const heroCinema = document.getElementById('hero-cinema')
const heroCanvas = document.getElementById('hero-frames')
const reducedMotionForHero = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (heroScrub && heroCinema && heroCanvas) {
  // Mobile gets its own portrait-oriented footage (different framing/aspect
  // than the desktop clip), swapped in below 641px only — desktop keeps its
  // existing frame sequence and canvas resolution untouched.
  const isMobileHero = window.matchMedia('(max-width: 640px)').matches
  const FRAME_COUNT = 48
  const FRAMES_PATH = isMobileHero ? '/hero/frames-mobile' : '/hero/frames'
  if (isMobileHero) {
    heroCanvas.width = 720
    heroCanvas.height = 1280
  }
  const ctx = heroCanvas.getContext('2d')
  const frames = new Array(FRAME_COUNT)
  let drawnIndex = -1

  const drawFrame = (index) => {
    const img = frames[index]
    if (!img || !img.complete || index === drawnIndex) return
    drawnIndex = index
    ctx.drawImage(img, 0, 0, heroCanvas.width, heroCanvas.height)
  }

  const loadFrame = (i) => {
    if (frames[i]) return frames[i]
    const img = new Image()
    img.src = `${FRAMES_PATH}/f${String(i).padStart(3, '0')}.jpg`
    frames[i] = img
    return img
  }

  // Always show a static first frame, even under reduced motion — a <canvas>
  // paints nothing on its own (unlike the <video> this replaced, which showed
  // its poster frame for free).
  const firstFrame = loadFrame(0)
  firstFrame.onload = () => drawFrame(0)

  if (!reducedMotionForHero) {
    for (let i = 1; i < FRAME_COUNT; i++) loadFrame(i)

    // Headline/sub/actions (.hc-scrub-rise) and the notification tags (.hc-notif)
    // share one scroll-threshold reveal: headline rises top-to-bottom first
    // (thresholds 0.02–0.26), then the tags pop in after (0.34–0.58).
    const scrubRevealEls = document.querySelectorAll('[data-hc-at]')

    // No opacity fade-out: the hero stays sticky (and fully visible) for the
    // whole scrub range, so the next section slides up and covers it
    // directly once .hero-scrub runs out — no dark gap in between.
    let ticking = false

    const onScroll = () => {
      const rect = heroScrub.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) return
      const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1)

      drawFrame(Math.round(progress * (FRAME_COUNT - 1)))

      // Each element pops in once its scroll threshold is crossed, and
      // hides again if the user scrolls back up past it.
      scrubRevealEls.forEach((el) => {
        const at = Number(el.dataset.hcAt) || 0
        el.classList.toggle('is-visible', progress >= at)
      })

      ticking = false
    }

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true
          requestAnimationFrame(onScroll)
        }
      },
      { passive: true }
    )
    onScroll()
  }
}

// ---- Subtle parallax depth on scroll (project thumbnails, section content) ----
const parallaxEls = document.querySelectorAll('[data-parallax]')
const reducedMotionForParallax = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (parallaxEls.length && !reducedMotionForParallax) {
  let parallaxTicking = false

  const updateParallax = () => {
    const viewportCenter = window.innerHeight / 2
    parallaxEls.forEach((el) => {
      const speed = Number(el.dataset.parallax) || 0.08
      const rect = el.getBoundingClientRect()
      const elCenter = rect.top + rect.height / 2
      const offset = Math.max(Math.min((viewportCenter - elCenter) * speed, 60), -60)
      el.style.translate = `0 ${offset.toFixed(1)}px`
    })
    parallaxTicking = false
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!parallaxTicking) {
        requestAnimationFrame(updateParallax)
        parallaxTicking = true
      }
    },
    { passive: true }
  )
  updateParallax()
}

// ---- Animated stat counters (Sobre section) ----
const counters = document.querySelectorAll('[data-counter]')

if (counters.length) {
  const reducedMotionForCounters = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const runCounter = (el) => {
    const to = Number(el.dataset.counterTo || '0')
    const suffix = el.dataset.counterSuffix || ''

    if (reducedMotionForCounters) {
      el.textContent = `${to}${suffix}`
      return
    }

    const duration = 1200
    const start = performance.now()

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = `${Math.round(to * eased)}${suffix}`
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runCounter(entry.target)
            counterObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.6 }
    )
    counters.forEach((el) => counterObserver.observe(el))
  } else {
    counters.forEach(runCounter)
  }
}

// ---- Skill bars fill in as their card enters the viewport ----
const skillBars = document.querySelectorAll('.skill-bar[data-target]')

if (skillBars.length) {
  const fillBar = (el) => {
    const fill = el.querySelector('span')
    if (fill) fill.style.width = `${el.dataset.target}%`
  }

  if ('IntersectionObserver' in window) {
    const skillBarObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fillBar(entry.target)
            skillBarObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.6 }
    )
    skillBars.forEach((el) => skillBarObserver.observe(el))
  } else {
    skillBars.forEach(fillBar)
  }
}
