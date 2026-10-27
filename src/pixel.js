/* ============================================================================
   META PIXEL (Facebook/Instagram Ads)

   >>> CONFIGURE AQUI <<<
   Cole o ID do seu Pixel (Gerenciador de Eventos do Meta Business Suite —
   Business Manager > Origens de dados > Pixels). Enquanto estiver vazio,
   nada é carregado e nenhum evento é disparado (sem erro no console).
   ========================================================================== */
const PIXEL_ID = '1639236367736622'

let carregado = false

/* Injeta o script oficial do Pixel só se houver um ID configurado — evita
   carregar o script do Facebook à toa, e evita o fbq tentar rastrear com
   um ID vazio/inválido. */
export function initPixel() {
  if (!PIXEL_ID || carregado) return
  carregado = true

  /* Snippet oficial do Meta Pixel (base code), sem alterações de lógica —
     só formatado pra caber no estilo do projeto. */
  ;(function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  window.fbq('init', PIXEL_ID)
  window.fbq('track', 'PageView')
}

/* Dispara um evento (padrão do Meta, ex. 'Lead', ou customizado) com
   parâmetros opcionais. Nunca lança erro — se o pixel não estiver
   configurado, fbq simplesmente não existe e isso é ignorado. */
export function trackPixelEvent(evento, params, padrao = true) {
  if (!PIXEL_ID || typeof window.fbq !== 'function') return
  try {
    window.fbq(padrao ? 'track' : 'trackCustom', evento, params || {})
  } catch {
    /* nunca interrompe o fluxo do visitante por causa do pixel */
  }
}
