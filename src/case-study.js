import { initLayout, initScrollReveal } from './layout.js'
import { projetos } from './data/projetos.js'

initLayout()

const params = new URLSearchParams(window.location.search)
const projeto = projetos[params.get('slug')]

if (!projeto) {
  window.location.href = '/#projetos'
} else {
  document.title = `${projeto.titulo} — Lucas Andrade Design`

  document.getElementById('case-eyebrow').textContent = projeto.categoriaLabel
  document.getElementById('case-title').textContent = projeto.titulo

  const metaList = document.getElementById('case-meta-list')
  projeto.meta.forEach(({ label, value }) => {
    const row = document.createElement('div')
    row.className = 'case-meta-row'
    row.innerHTML = `
      <p class="case-meta-label">${label}</p>
      <p class="case-meta-value">${value}</p>
    `
    metaList.appendChild(row)
  })

  const cta = document.getElementById('case-cta')
  cta.href = projeto.ctaHref
  cta.querySelector('span').textContent = projeto.ctaLabel
  if (projeto.ctaHref.startsWith('http')) {
    cta.target = '_blank'
    cta.rel = 'noopener'
  }

  const content = document.getElementById('case-content')
  projeto.blocos.forEach((bloco) => {
    if (bloco.tipo === 'texto') {
      const p = document.createElement('p')
      p.innerHTML = bloco.html
      p.setAttribute('data-reveal', '')
      content.appendChild(p)
    } else if (bloco.tipo === 'imagem') {
      const wrap = document.createElement('div')
      wrap.className = 'case-slide'
      wrap.setAttribute('data-reveal', '')
      const img = document.createElement('img')
      img.src = bloco.src
      img.alt = bloco.alt
      img.loading = 'lazy'
      wrap.appendChild(img)
      content.appendChild(wrap)
    } else if (bloco.tipo === 'link') {
      const link = document.createElement('a')
      link.href = bloco.href
      link.target = '_blank'
      link.rel = 'noopener'
      link.setAttribute('data-reveal', '')
      link.className =
        'group self-start inline-flex items-center gap-2 px-6 py-3.5 chamfer-tr bg-brand text-white font-mono-brand text-xs uppercase tracking-[0.1em] glow-lilac hover:bg-brand-ink transition-colors'
      link.innerHTML = `
        <span>${bloco.label}</span>
        <svg class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
      `
      content.appendChild(link)
    }
  })

  // Blocks are inserted after initLayout() already scanned the DOM for
  // [data-reveal], so wire the reveal choreography again for this content.
  initScrollReveal(content)
}
