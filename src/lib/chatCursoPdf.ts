import { extractText, getDocumentProxy } from 'unpdf'

const MAX_BYTES = 12 * 1024 * 1024
const cache = new Map<string, { expires: number; pages: Promise<string[]> }>()

export async function lerCorpo(body: ReadableStream<Uint8Array> | null, limite: number) {
  if (!body) throw new Error('Corpo ausente')
  const reader = body.getReader()
  const partes: Uint8Array[] = []
  let tamanho = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      tamanho += value.byteLength
      if (tamanho > limite) {
        await reader.cancel()
        throw new Error('Corpo acima do limite')
      }
      partes.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(partes, tamanho)
}

export function urlPdfPermitida(valor: string, supabaseUrl: string) {
  try {
    const url = new URL(valor)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    url.hash = ''
    if (url.origin === new URL(supabaseUrl).origin) {
      return /^\/storage\/v1\/object\/(public|sign)\//.test(url.pathname) ? url : null
    }
    const origens = (process.env.CHAT_PDF_ORIGINS ?? '').split(',').map((item) => item.trim())
    return origens.includes(url.origin) ? url : null
  } catch {
    return null
  }
}

async function extrairPaginas(url: URL) {
  const resposta = await fetch(url, {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!resposta.ok) {
    await resposta.body?.cancel()
    throw new Error('PDF indisponível')
  }

  const bytes = await lerCorpo(resposta.body, MAX_BYTES)
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Arquivo inválido')
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { isEvalSupported: false })
  try {
    if (pdf.numPages > 150) throw new Error('PDF acima do limite de páginas')
    const { text } = await extractText(pdf, { mergePages: false })
    const paginas = text.map((pagina) => pagina.replace(/\s+/g, ' ').trim())
    const caracteres = paginas.reduce((total, pagina) => total + pagina.length, 0)
    if (caracteres === 0 || caracteres > 250_000) {
      throw new Error('Texto do PDF indisponível ou acima do limite')
    }
    return paginas
  } finally {
    await pdf.destroy()
  }
}

export function lerPaginasPdf(url: URL) {
  if (url.search) return extrairPaginas(url)
  const chave = url.href
  const existente = cache.get(chave)
  if (existente && existente.expires > Date.now()) return existente.pages
  cache.delete(chave)

  if (cache.size >= 32) {
    const maisAntiga = cache.keys().next().value
    if (maisAntiga) cache.delete(maisAntiga)
  }

  const pages = extrairPaginas(url).catch((erro: unknown) => {
    if (cache.get(chave)?.pages === pages) cache.delete(chave)
    throw erro
  })
  cache.set(chave, { expires: Date.now() + 5 * 60_000, pages })
  return pages
}
