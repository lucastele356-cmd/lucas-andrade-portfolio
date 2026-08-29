import { initLayout } from './layout.js'

initLayout()

// ---- Project filter ----
const filterButtons = document.querySelectorAll('.filter-btn')
const projectCards = document.querySelectorAll('.project-card')

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    const filter = btn.dataset.filter

    projectCards.forEach((card) => {
      const match = filter === 'todos' || card.dataset.category === filter
      if (match) {
        card.hidden = false
        requestAnimationFrame(() => {
          card.style.opacity = '1'
          card.style.transform = 'translateY(0)'
        })
      } else {
        card.style.opacity = '0'
        card.style.transform = 'translateY(8px)'
        setTimeout(() => {
          if (card.style.opacity === '0') card.hidden = true
        }, 350)
      }
    })
  })
})

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

// ---- Hero video plays along with scroll (scroll-scrub), then dissolves ----
const heroScrub = document.getElementById('hero-scrub')
const heroCinema = document.getElementById('hero-cinema')
const heroVideo = document.getElementById('hero-video')
const reducedMotionForHero = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (heroScrub && heroCinema && heroVideo && !reducedMotionForHero) {
  // Headline/sub/actions (.hc-scrub-rise) and the notification tags (.hc-notif)
  // share one scroll-threshold reveal: headline rises top-to-bottom first
  // (thresholds 0.02–0.26), then the tags pop in after (0.34–0.58).
  const scrubRevealEls = document.querySelectorAll('[data-hc-at]')

  const armScrub = () => {
    // iOS Safari only paints seeked frames after the video has actually played
    // once — kick it off and immediately pause so scroll takes over from frame 0.
    heroVideo.play().then(() => heroVideo.pause()).catch(() => {})

    // Hero stays fully opaque through most of the scrub, then dissolves over
    // the final stretch so it hands off to the next section instead of
    // cutting away the instant the sticky pin releases. Kept short so the
    // fade itself doesn't feel like a slow drag.
    const fadeStart = 0.9
    let targetProgress = 0
    let smoothProgress = 0
    let chasing = false

    // Seeking a compressed video is not instant. Two extra guards on top of
    // the easing: never issue a new seek while the previous one is still
    // being decoded (they'd queue up and stutter), and skip seeks too small
    // to change the visible frame at the source's 24fps.
    const frameDuration = 1 / 24
    const seekTo = (p) => {
      if (!heroVideo.duration || heroVideo.seeking) return
      const target = p * heroVideo.duration
      if (Math.abs(target - heroVideo.currentTime) < frameDuration) return
      heroVideo.currentTime = target
    }

    const chase = () => {
      const delta = targetProgress - smoothProgress
      if (Math.abs(delta) < 0.0008) {
        smoothProgress = targetProgress
        seekTo(smoothProgress)
        chasing = false
        return
      }
      smoothProgress += delta * 0.22
      seekTo(smoothProgress)
      requestAnimationFrame(chase)
    }

    const onScroll = () => {
      const rect = heroScrub.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) return
      targetProgress = Math.min(Math.max(-rect.top / scrollable, 0), 1)

      const fade = Math.min(Math.max((targetProgress - fadeStart) / (1 - fadeStart), 0), 1)
      heroCinema.style.opacity = String(1 - fade)

      // Each element pops in once its scroll threshold is crossed, and
      // hides again if the user scrolls back up past it.
      scrubRevealEls.forEach((el) => {
        const at = Number(el.dataset.hcAt) || 0
        el.classList.toggle('is-visible', targetProgress >= at)
      })

      if (!chasing) {
        chasing = true
        requestAnimationFrame(chase)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  if (heroVideo.readyState >= 1) {
    armScrub()
  } else {
    heroVideo.addEventListener('loadedmetadata', armScrub, { once: true })
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
