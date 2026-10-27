# Configurar o Google Sheets como destino dos leads

## 1. Criar a planilha
1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco.
2. Dá um nome pra ela, tipo "Leads — Site".

## 2. Colar o código
1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague o conteúdo que já estiver lá (`function myFunction() {}`).
3. Abra o arquivo [`google-apps-script.gs`](../google-apps-script.gs) deste repositório, copie tudo e cole no editor do Apps Script.
4. Clique no ícone de disquete (💾) pra salvar o projeto (ele vai pedir um nome, pode ser "Receptor de leads").

## 3. Publicar como aplicativo da web
1. No canto superior direito, clique em **Implantar → Nova implantação**.
2. No ícone de engrenagem ⚙️ ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - **Executar como**: Eu (seu e-mail)
   - **Quem pode acessar**: **Qualquer pessoa** — isso é importante, sem isso o site não consegue enviar os dados.
4. Clique em **Implantar**.
5. O Google vai pedir autorização (é o seu próprio script acessando a sua própria planilha) — aceite e autorize.
6. Copie a **URL do aplicativo da Web** que aparece (termina em `/exec`).

## 4. Testar se funcionou
Cole essa URL no navegador e abra. Se aparecer algo como:
```json
{"ok":true,"mensagem":"Receptor de leads ativo."}
```
está funcionando.

## 5. Conectar no site
Abra [`src/lead-form.js`](../src/lead-form.js) e cole a URL na primeira linha:
```js
const WEBHOOK_URL = 'https://script.google.com/macros/s/SEU-ID-AQUI/exec'
```
Salve, publique o site, e teste preenchendo o formulário de verdade — uma linha nova deve aparecer na aba "Leads" da planilha.

## Se precisar atualizar o código depois
Sempre que mudar o conteúdo de `google-apps-script.gs`, repita o passo 2 (cole o código novo no editor do Apps Script) e depois **Implantar → Gerenciar implantações → ✏️ (editar) → Nova versão → Implantar**. A URL continua a mesma, não precisa trocar no site.

## Como fica a planilha
Uma aba "Leads" é criada sozinha na primeira vez que alguém preenche o formulário, com uma linha por lead (pelo "Sessão ID") — se a pessoa concluir mais etapas depois, a mesma linha vai sendo completada, em vez de criar linhas repetidas.
