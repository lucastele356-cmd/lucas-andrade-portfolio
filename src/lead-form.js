import { trackPixelEvent } from './pixel.js'

/* ============================================================================
   FORMULÁRIO DE CAPTAÇÃO EM ETAPAS — abre como popup (#lead-modal)

   >>> CONFIGURE AQUI <<<
   Cole abaixo a URL do webhook que vai receber os leads (Make, Zapier, n8n,
   Google Apps Script, backend próprio...). Enquanto estiver vazio o
   formulário funciona normalmente — só não envia nada (e avisa no console).
   ========================================================================== */
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyar3Mwjq86Js_stMCH7uJwqbac3KzSMu3PNYNOK1r3j0eH51IyuPrKHbqcoogh5GD5/exec'

/* O número que recebe a conversa na tela final. */
const WHATSAPP_NUMBER = '5561995259902'

/* Por padrão o POST vai como text/plain para evitar o preflight CORS (OPTIONS),
   que a maioria dos webhooks no-code não responde — o corpo continua sendo
   JSON e esses serviços o interpretam normalmente. Se o seu endpoint exigir
   application/json de verdade (e souber responder ao OPTIONS), troque aqui. */
const WEBHOOK_CONTENT_TYPE = 'text/plain;charset=UTF-8'

const STEP_NAMES = ['contato', 'empresa', 'necessidade', 'prazo-pacote', 'contexto']
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
const STORE_SESSION = 'la_lead_sessao'
const STORE_UTM = 'la_lead_utm'

/* ---------- utilidades de sessão ---------------------------------------- */

/* sessionStorage pode lançar (aba anônima, cookies bloqueados), então todo
   acesso é protegido — o formulário nunca pode quebrar por causa disso. */
function storageGet(key) {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    /* segue sem persistir */
  }
}

function novoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* Mesmo id enquanto a aba viver, pra que as 5 etapas cheguem no webhook como
   um lead só em vez de cinco registros soltos. */
function idDaSessao() {
  let id = storageGet(STORE_SESSION)
  if (!id) {
    id = novoId()
    storageSet(STORE_SESSION, id)
  }
  return id
}

/* Os UTMs só existem na URL do primeiro clique do anúncio. Guardando na
   sessão, eles sobrevivem se a pessoa navegar pra um case e voltar. */
function utms() {
  const guardados = (() => {
    try {
      return JSON.parse(storageGet(STORE_UTM) || '{}')
    } catch {
      return {}
    }
  })()

  const daUrl = {}
  try {
    const params = new URLSearchParams(window.location.search)
    UTM_KEYS.forEach((k) => {
      const v = params.get(k)
      if (v) daUrl[k] = v
    })
  } catch {
    /* URL malformada: segue sem UTM */
  }

  const merged = { ...guardados, ...daUrl }
  if (Object.keys(daUrl).length) storageSet(STORE_UTM, JSON.stringify(merged))
  return merged
}

/* ---------- máscara de telefone ----------------------------------------- */

function soDigitos(valor) {
  return String(valor).replace(/\D/g, '').slice(0, 11)
}

function mascaraTelefone(valor) {
  const d = soDigitos(valor)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/* Fixo (10) ou celular (11) com DDD. */
function telefoneValido(valor) {
  const d = soDigitos(valor)
  return d.length === 10 || d.length === 11
}

/* Elementos focáveis dentro do modal, pra prender o Tab nele enquanto aberto. */
const SELETOR_FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/* ---------- init --------------------------------------------------------- */

export function initLeadForm() {
  const modal = document.getElementById('lead-modal')
  const form = document.getElementById('lead-form')
  if (!modal || !form) return

  const raiz = document.getElementById('formulario')
  const dialogo = modal.querySelector('.lead-overlay__dialog')
  const steps = Array.from(form.querySelectorAll('[data-lead-step]'))
  const wrapSteps = form.querySelector('[data-lead-steps]')
  const barra = form.querySelector('[data-lead-bar]')
  const contador = form.querySelector('[data-lead-counter]')
  const btnVoltar = form.querySelector('[data-lead-back]')
  const btnAvancar = form.querySelector('[data-lead-next]')
  const telaFim = raiz.querySelector('[data-lead-done]')
  const total = steps.length
  if (!total || !wrapSteps) return

  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let atual = 0
  let gatilho = null /* elemento que abriu o modal, pra devolver o foco ao fechar */
  let pacoteSelecionado = null /* { nome, preco } — quando aberto a partir de um pacote */

  /* ---------- coleta ------------------------------------------------------- */

  /* Serve pra input, textarea e grupo de rádios: num RadioNodeList o .value
     já devolve o valor do item marcado (e '' quando nenhum está). */
  function valor(nome) {
    const campo = form.elements[nome]
    const v = campo?.value
    return typeof v === 'string' ? v.trim() : ''
  }

  function dadosDoLead() {
    return {
      nome: valor('nome'),
      whatsapp: valor('whatsapp'),
      whatsappDigitos: soDigitos(valor('whatsapp')),
      empresa: valor('empresa'),
      instagramOuSite: valor('instagram_site'),
      segmento: valor('segmento'),
      necessidade: valor('necessidade'),
      prazo: valor('prazo'),
      pacoteInteresse: valor('pacote_interesse'),
      contexto: valor('contexto'),
    }
  }

  /* ---------- envio -------------------------------------------------------- */

  /* Dispara e esquece: a interface nunca espera a rede, e qualquer falha é
     silenciosa pro visitante. keepalive mantém o POST vivo mesmo se a pessoa
     fechar a aba logo depois de concluir a etapa. */
  function enviar(etapa, status) {
    const payload = {
      sessaoId: idDaSessao(),
      etapa,
      etapaNome: STEP_NAMES[etapa - 1] || String(etapa),
      status,
      enviadoEm: new Date().toISOString(),
      /* O pacote de interesse mora dentro de "lead" (campo pacoteInteresse,
         etapa 4) — é a escolha real da pessoa no formulário, não só qual
         botão abriu o popup. */
      lead: dadosDoLead(),
      utm: utms(),
      origem: {
        url: window.location.href,
        referrer: document.referrer || '',
      },
    }

    if (!WEBHOOK_URL) {
      console.info('[lead-form] WEBHOOK_URL vazio — nada enviado. Payload:', payload)
      return
    }

    try {
      /* no-cors: nunca lemos a resposta mesmo, e a maioria dos destinos
         no-code (Google Apps Script incluso) não manda os cabeçalhos de
         CORS que o modo 'cors' exige — o dado é salvo do mesmo jeito,
         isso só evita um erro falso no console do navegador. */
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': WEBHOOK_CONTENT_TYPE },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: 'no-cors',
      }).catch(() => {})
    } catch {
      /* nunca interrompe o preenchimento */
    }

    /* Meta Pixel: 'Lead' (evento padrão) só quando o formulário é concluído
       — é isso que o Gerenciador de Anúncios usa pra otimizar a entrega.
       Cada etapa (completa ou não) também dispara um evento customizado,
       pra dar pra montar público de remarketing de quem abandonou no meio. */
    if (status === 'completo') {
      trackPixelEvent('Lead', {
        content_name: payload.lead.pacoteInteresse || 'Formulário de contato',
      })
    }
    trackPixelEvent(`FormEtapa${etapa}`, { status }, false)
  }

  /* ---------- validação ----------------------------------------------------- */

  /* Funciona tanto pra um input único (nome, whatsapp, empresa) quanto pra um
     grupo de rádios (necessidade, prazo, pacote_interesse) — nesse segundo caso o aviso e o
     destaque vão no grupo (`data-lead-group`), não num input só. */
  function mostrarErro(campo, mensagem) {
    const alvo = form.querySelector(`[data-lead-error-for="${campo}"]`)
    if (alvo) {
      alvo.textContent = mensagem
      alvo.hidden = !mensagem
    }

    const grupo = form.querySelector(`[data-lead-group="${campo}"]`)
    if (grupo) {
      grupo.classList.toggle('is-invalid', Boolean(mensagem))
      return
    }

    const input = form.elements[campo]
    if (input?.setAttribute) {
      input.setAttribute('aria-invalid', mensagem ? 'true' : 'false')
      input.classList.toggle('is-invalid', Boolean(mensagem))
    }
  }

  /* Campos obrigatórios por etapa — os "mais importantes" de cada uma.
     instagram_site, segmento e contexto ficam de fora de propósito: são
     complementares, travar neles perderia lead por detalhe menor. */
  function validarEtapa(indice) {
    let ok = true
    let primeiroRuim = null
    const marcarRuim = (campo, el) => {
      ok = false
      primeiroRuim = primeiroRuim || el
      return campo
    }

    if (indice === 0) {
      if (valor('nome').length < 2) {
        mostrarErro(marcarRuim('nome', form.elements['nome']), 'Preciso do seu nome pra te chamar direito.')
      } else {
        mostrarErro('nome', '')
      }

      const tel = valor('whatsapp')
      if (!tel) {
        mostrarErro(marcarRuim('whatsapp', form.elements['whatsapp']), 'Preciso do seu WhatsApp pra te responder.')
      } else if (!telefoneValido(tel)) {
        mostrarErro(marcarRuim('whatsapp', form.elements['whatsapp']), 'Confere o número: precisa ter DDD + 8 ou 9 dígitos.')
      } else {
        mostrarErro('whatsapp', '')
      }
    }

    if (indice === 1) {
      if (valor('empresa').length < 2) {
        mostrarErro(marcarRuim('empresa', form.elements['empresa']), 'Preciso do nome da sua empresa.')
      } else {
        mostrarErro('empresa', '')
      }
    }

    if (indice === 2) {
      if (!valor('necessidade')) {
        mostrarErro(marcarRuim('necessidade', form.querySelector('[data-lead-group="necessidade"] input')), 'Escolhe uma opção pra eu entender o que você precisa.')
      } else {
        mostrarErro('necessidade', '')
      }
    }

    if (indice === 3) {
      if (!valor('prazo')) {
        mostrarErro(marcarRuim('prazo', form.querySelector('[data-lead-group="prazo"] input')), 'Escolhe um prazo.')
      } else {
        mostrarErro('prazo', '')
      }
      if (!valor('pacote_interesse')) {
        mostrarErro(marcarRuim('pacote_interesse', form.querySelector('[data-lead-group="pacote_interesse"] input')), 'Escolhe um pacote (ou "ainda não sei").')
      } else {
        mostrarErro('pacote_interesse', '')
      }
    }

    if (primeiroRuim?.focus) primeiroRuim.focus()
    return ok
  }

  /* ---------- navegação entre etapas ----------------------------------------- */

  function atualizarProgresso() {
    const pct = ((atual + 1) / total) * 100
    if (barra) {
      barra.style.width = `${pct}%`
      const trilho = barra.parentElement
      if (trilho) trilho.setAttribute('aria-valuenow', String(atual + 1))
    }
    if (contador) contador.textContent = `Etapa ${atual + 1} de ${total}`
    if (btnVoltar) btnVoltar.hidden = atual === 0
    if (btnAvancar) btnAvancar.textContent = atual === total - 1 ? 'Enviar' : 'Continuar'
  }

  /* Anima a altura do cartão entre etapas de tamanhos diferentes pra não dar
     um salto seco; sob prefers-reduced-motion a troca é instantânea. */
  function trocar(proximo) {
    const saindo = steps[atual]
    const entrando = steps[proximo]
    const alturaInicial = wrapSteps.offsetHeight

    saindo.classList.remove('is-active')
    saindo.hidden = true
    entrando.hidden = false
    entrando.classList.add('is-active')
    atual = proximo

    if (!semMovimento) {
      const alturaFinal = wrapSteps.offsetHeight
      if (alturaInicial !== alturaFinal) {
        wrapSteps.style.height = `${alturaInicial}px`
        void wrapSteps.offsetHeight /* força reflow pra transição pegar */
        wrapSteps.style.height = `${alturaFinal}px`
        const limpar = () => {
          wrapSteps.style.height = ''
          wrapSteps.removeEventListener('transitionend', limpar)
        }
        wrapSteps.addEventListener('transitionend', limpar)
      }
    }

    atualizarProgresso()

    /* Foca o bloco da etapa (não o input): leitor de tela acompanha, mas o
       teclado do celular não abre sozinho a cada avanço. */
    entrando.focus({ preventScroll: true })

    /* O modal tem seu próprio scroll interno (não a página) — volta ele pro
       topo, senão uma etapa curta começaria no meio do espaço que a anterior,
       mais longa, deixou rolado. */
    if (dialogo) dialogo.scrollTop = 0
  }

  /* Só monta a tela final — quem envia a última etapa é o avancar(), senão
     cada formulário concluído chegaria duplicado no webhook. */
  function concluir() {
    const dados = dadosDoLead()
    const nome = dados.nome ? dados.nome.split(' ')[0] : ''
    const empresa = dados.empresa
    const oi = nome ? `Oi, Lucas! Aqui é ${nome}` : 'Oi, Lucas!'
    const daEmpresa = empresa ? `, da ${empresa}` : ''

    /* A etapa 4 (campo "Qual pacote te interessa?") é a fonte da verdade pra
       mensagem final — não o botão que abriu o popup. Assim a mensagem bate
       com a escolha real, mesmo se a pessoa mudar de ideia no meio. */
    const pacoteEscolhido = dados.pacoteInteresse
    const temPacoteReal = pacoteEscolhido && pacoteEscolhido !== 'Ainda não sei, quero indicação'

    const texto = temPacoteReal
      ? `${oi}${daEmpresa}. Tenho interesse no pacote ${pacoteEscolhido}. Quero contratar.`
      : `${oi}${daEmpresa}. Acabei de preencher o formulário no seu site e queria conversar sobre a minha marca.`

    const link = telaFim?.querySelector('[data-lead-whatsapp]')
    if (link) link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`

    const saudacao = telaFim?.querySelector('[data-lead-nome]')
    if (saudacao) saudacao.textContent = nome ? `Valeu, ${nome}!` : 'Recebido!'

    form.hidden = true
    if (telaFim) {
      telaFim.hidden = false
      telaFim.focus({ preventScroll: true })
      if (dialogo) dialogo.scrollTop = 0
    }
  }

  function avancar() {
    if (!validarEtapa(atual)) return
    enviar(atual + 1, atual === total - 1 ? 'completo' : 'parcial')
    if (atual === total - 1) {
      concluir()
      return
    }
    trocar(atual + 1)
  }

  /* ---------- popup: abrir/fechar -------------------------------------------- */

  function trancarScrollDaPagina(travar) {
    document.documentElement.style.overflow = travar ? 'hidden' : ''
  }

  /* Se a pessoa já concluiu uma vez e volta (ex.: clicou em outro pacote
     depois), reabrir não pode mostrar a tela de agradecimento antiga, presa
     — volta pro início, como uma consulta nova (sessão nova inclusive, pra
     não misturar duas respostas diferentes sob o mesmo registro). */
  function resetarSeJaConcluido() {
    if (!form.hidden) return
    form.hidden = false
    if (telaFim) telaFim.hidden = true
    form.reset()
    atual = 0
    steps.forEach((s, i) => {
      s.hidden = i !== 0
      s.classList.toggle('is-active', i === 0)
    })
    atualizarProgresso()
    try {
      window.sessionStorage.removeItem(STORE_SESSION)
    } catch {
      /* segue mesmo assim */
    }
  }

  function abrirModal(el) {
    gatilho = el || document.activeElement
    resetarSeJaConcluido()

    const nomePacote = el?.dataset.pacote
    pacoteSelecionado = nomePacote
      ? { nome: nomePacote, preco: el.dataset.pacotePreco || '' }
      : null

    /* Pré-marca o pacote clicado na etapa 4 (a pessoa ainda pode trocar lá —
       é só um ponto de partida). Quem abre por um botão sem pacote (ex.:
       "Conversar sobre minha marca") chega na etapa 4 sem nada marcado,
       como qualquer outro campo obrigatório. */
    if (pacoteSelecionado && form.elements['pacote_interesse']) {
      form.elements['pacote_interesse'].value = `${pacoteSelecionado.nome} (${pacoteSelecionado.preco})`
    }

    modal.hidden = false
    /* reflow antes de adicionar a classe, pra transição de entrada rodar */
    void modal.offsetHeight
    modal.classList.add('is-open')
    trancarScrollDaPagina(true)

    try {
      history.replaceState(history.state, '', '#formulario')
    } catch {
      /* navegação sem histórico (ex.: file://) — segue sem mexer na URL */
    }

    const alvoFoco = form.hidden ? telaFim : steps[atual]
    ;(alvoFoco || dialogo)?.focus({ preventScroll: true })
  }

  function fecharModal() {
    modal.classList.remove('is-open')
    trancarScrollDaPagina(false)

    const aoTerminarTransicao = () => {
      modal.hidden = true
      modal.removeEventListener('transitionend', aoTerminarTransicao)
    }
    if (semMovimento) {
      modal.hidden = true
    } else {
      modal.addEventListener('transitionend', aoTerminarTransicao)
    }

    try {
      const semHash = window.location.pathname + window.location.search
      history.replaceState(history.state, '', semHash)
    } catch {
      /* idem */
    }

    gatilho?.focus?.({ preventScroll: true })
    gatilho = null
  }

  function modalAberto() {
    return !modal.hidden
  }

  /* Delegado no document: pega qualquer botão/link com esse atributo, em
     qualquer lugar da página (header, hero, cards de pacote, rodapé...). */
  document.addEventListener('click', (e) => {
    const gatilhoClicado = e.target.closest('[data-open-lead-form]')
    if (!gatilhoClicado) return
    e.preventDefault()
    abrirModal(gatilhoClicado)
  })

  modal.querySelectorAll('[data-lead-close]').forEach((el) => {
    el.addEventListener('click', fecharModal)
  })

  document.addEventListener('keydown', (e) => {
    if (!modalAberto()) return

    if (e.key === 'Escape') {
      fecharModal()
      return
    }

    /* Prende o Tab dentro do modal enquanto ele estiver aberto. */
    if (e.key === 'Tab') {
      const focaveis = Array.from(modal.querySelectorAll(SELETOR_FOCAVEL)).filter(
        (el) => el.offsetParent !== null
      )
      if (!focaveis.length) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
  })

  /* Chegou em /#formulario vindo de outra página (ex.: case study) — abre
     direto, sem precisar clicar em nada de novo. */
  if (window.location.hash === '#formulario') {
    abrirModal(null)
  }

  /* ---------- outros eventos -------------------------------------------------- */

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    avancar()
  })

  btnVoltar?.addEventListener('click', () => {
    if (atual > 0) trocar(atual - 1)
  })

  const campoTel = form.elements['whatsapp']
  if (campoTel) {
    campoTel.addEventListener('input', () => {
      const noFim = campoTel.selectionStart === campoTel.value.length
      campoTel.value = mascaraTelefone(campoTel.value)
      if (noFim) {
        const fim = campoTel.value.length
        campoTel.setSelectionRange(fim, fim)
      }
    })
  }

  /* Limpa o erro assim que a pessoa corrige, em vez de deixar o aviso
     vermelho parado na tela enquanto ela digita ou escolhe outra opção. */
  ;['nome', 'whatsapp', 'empresa'].forEach((nome) => {
    const campo = form.elements[nome]
    campo?.addEventListener('input', () => {
      if (campo.getAttribute('aria-invalid') === 'true') mostrarErro(nome, '')
    })
  })
  ;['necessidade', 'prazo', 'pacote_interesse'].forEach((nome) => {
    form.querySelectorAll(`input[name="${nome}"]`).forEach((radio) => {
      radio.addEventListener('change', () => mostrarErro(nome, ''))
    })
  })

  /* Enter num campo de texto avança a etapa em vez de não fazer nada.
     (No textarea, Enter continua quebrando linha.) */
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio') {
      e.preventDefault()
      avancar()
    }
  })

  /* Garante o estado inicial mesmo se o HTML vier com outra etapa aberta. */
  steps.forEach((s, i) => {
    s.hidden = i !== 0
    s.classList.toggle('is-active', i === 0)
  })
  atualizarProgresso()
  utms() /* captura os UTMs já na carga, antes de qualquer navegação interna */
}
