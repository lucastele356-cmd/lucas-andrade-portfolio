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

// ---- Subtle hero parallax (pointer devices, motion allowed) ----
const heroFloat = document.getElementById('hero-float')
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hasFinePointer = window.matchMedia('(pointer: fine)').matches

if (heroFloat && !prefersReducedMotion && hasFinePointer) {
  const cards = heroFloat.querySelectorAll(':scope > div')
  heroFloat.addEventListener('mousemove', (e) => {
    const rect = heroFloat.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cards.forEach((card, i) => {
      const strength = i === 0 ? 10 : 14
      card.style.transform = `translate(${x * strength}px, ${y * strength}px) rotate(${i === 0 ? -4 : 5}deg)`
    })
  })
  heroFloat.addEventListener('mouseleave', () => {
    cards.forEach((card, i) => {
      card.style.transform = `rotate(${i === 0 ? -4 : 5}deg)`
    })
  })
}
