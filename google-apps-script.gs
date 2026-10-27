/**
 * ============================================================================
 * RECEPTOR DE LEADS DO FORMULÁRIO — cole este código no Google Apps Script
 * (Extensions > Apps Script, dentro da própria planilha de leads).
 *
 * Veja o passo a passo completo em: docs/configurar-google-sheets.md
 * ============================================================================
 *
 * O que ele faz:
 * - Recebe cada etapa concluída do formulário (POST em JSON)
 * - Escreve uma linha por lead na aba "Leads" (cria a aba se não existir)
 * - Se a pessoa concluir mais etapas depois, ATUALIZA a mesma linha (pelo
 *   sessaoId) em vez de criar uma nova — assim cada lead ocupa só 1 linha,
 *   que vai se completando conforme ela avança no formulário.
 */

const ABA = 'Leads'

const CABECALHO = [
  'Sessão ID', 'Atualizado em', 'Etapa', 'Nome da etapa', 'Status',
  'Nome', 'WhatsApp', 'Empresa', 'Instagram/Site', 'Segmento',
  'Necessidade', 'Prazo', 'Pacote de interesse', 'Contexto',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content',
  'URL de origem', 'Referrer',
]

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents)
    salvarLead(dados)
    return resposta({ ok: true })
  } catch (erro) {
    return resposta({ ok: false, erro: String(erro) })
  }
}

/* Visitar a URL do app no navegador deve mostrar isso — é o jeito mais
   rápido de confirmar que o deploy funcionou, sem precisar testar o site. */
function doGet() {
  return resposta({ ok: true, mensagem: 'Receptor de leads ativo.' })
}

function salvarLead(dados) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet()
  let aba = planilha.getSheetByName(ABA)
  if (!aba) {
    aba = planilha.insertSheet(ABA)
  }
  if (aba.getLastRow() === 0) {
    aba.appendRow(CABECALHO)
    aba.setFrozenRows(1)
  }

  const lead = dados.lead || {}
  const utm = dados.utm || {}
  const origem = dados.origem || {}

  const linha = [
    dados.sessaoId || '',
    dados.enviadoEm || new Date().toISOString(),
    dados.etapa || '',
    dados.etapaNome || '',
    dados.status || '',
    lead.nome || '',
    lead.whatsapp || '',
    lead.empresa || '',
    lead.instagramOuSite || '',
    lead.segmento || '',
    lead.necessidade || '',
    lead.prazo || '',
    lead.pacoteInteresse || '',
    lead.contexto || '',
    utm.utm_source || '',
    utm.utm_medium || '',
    utm.utm_campaign || '',
    utm.utm_content || '',
    origem.url || '',
    origem.referrer || '',
  ]

  const linhaExistente = encontrarLinhaPorSessao(aba, dados.sessaoId)
  if (linhaExistente > 0) {
    aba.getRange(linhaExistente, 1, 1, linha.length).setValues([linha])
  } else {
    aba.appendRow(linha)
  }
}

/* Procura, na coluna A (Sessão ID), uma linha já existente desse mesmo
   lead — é isso que evita que cada etapa vire uma linha separada. */
function encontrarLinhaPorSessao(aba, sessaoId) {
  if (!sessaoId) return -1
  const ultimaLinha = aba.getLastRow()
  if (ultimaLinha <= 1) return -1

  const ids = aba.getRange(2, 1, ultimaLinha - 1, 1).getValues()
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === sessaoId) return i + 2
  }
  return -1
}

function resposta(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON)
}
