import { createClient } from '@supabase/supabase-js'
import { LIMITE_PERGUNTA, type RespostaCurso, type TrechoCurso } from '../../../lib/chatCurso'
import { responderComFontes, CotaModeloEsgotada, pedeVisaoGeral, selecionarContexto } from '../../../lib/chatCursoModelo'
import { lerCorpo, lerPaginasPdf, urlPdfPermitida } from '../../../lib/chatCursoPdf'

export const maxDuration = 60

const ultimasSolicitacoes = new Map<string, number>()
const COOLDOWN_MS = 6000
const MAX_MATERIAIS = 20

interface AulaComMateriais {
  titulo: string
  descricao: string | null
  materiais: { titulo: string; url_arquivo: string }[]
}

function adicionarFonte(fontes: TrechoCurso[], fonte: TrechoCurso) {
  const { texto } = fonte
  for (let inicio = 0; inicio < texto.length; inicio += 1800) {
    fontes.push({ ...fonte, texto: texto.slice(inicio, inicio + 2100) })
    if (inicio + 2100 >= texto.length) break
  }
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (!token) return Response.json({ erro: 'Entre na plataforma para usar o chat.' }, { status: 401 })

  let pergunta: string
  try {
    const body = await lerCorpo(request.body, 8192)
    const dados = JSON.parse(body.toString('utf8'))
    pergunta = typeof dados?.pergunta === 'string' ? dados.pergunta.trim() : ''
    if (!pergunta || pergunta.length > LIMITE_PERGUNTA) throw new Error('Pergunta inválida')
  } catch {
    return Response.json({ erro: `Envie uma pergunta de até ${LIMITE_PERGUNTA} caracteres.` }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ erro: 'O chat ainda não foi configurado.' }, { status: 503 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => fetch(input, {
          ...init,
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        }),
      },
    })
    const { data: { user }, error: erroAuth } = await supabase.auth.getUser(token)
    if (erroAuth || !user) {
      return Response.json({ erro: 'Sua sessão expirou. Entre novamente.' }, { status: 401 })
    }

    const agora = Date.now()
    for (const [id, instante] of ultimasSolicitacoes) {
      if (agora - instante >= COOLDOWN_MS) ultimasSolicitacoes.delete(id)
    }
    if (ultimasSolicitacoes.has(user.id)) {
      return Response.json({ erro: 'Aguarde alguns segundos antes de perguntar novamente.' }, {
        status: 429,
        headers: { 'Retry-After': String(COOLDOWN_MS / 1000) },
      })
    }
    ultimasSolicitacoes.set(user.id, agora)

    const { data, error } = await supabase
      .from('aulas')
      .select('titulo, descricao, materiais(titulo, url_arquivo)')
      .order('ordem')
    if (error) throw new Error(`Consulta do curso: ${error.code}`)

    const aulas: AulaComMateriais[] = data
    if (pedeVisaoGeral(pergunta)) {
      return Response.json({
        visaoGeral: true,
        explicacao: aulas.length ? 'Você vai estudar os temas abaixo, na ordem em que aparecem na trilha.' : null,
        trechos: aulas.map(({ titulo, descricao }) => ({ titulo, texto: descricao?.trim() || titulo })),
        materiaisIndisponiveis: false,
      } satisfies RespostaCurso)
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return Response.json({ erro: 'O chat ainda não foi configurado.' }, { status: 503 })
    }

    const fontes: TrechoCurso[] = []
    for (const aula of aulas) {
      const texto = aula.descricao?.replace(/\s+/g, ' ').trim()
      if (texto) adicionarFonte(fontes, { titulo: aula.titulo, texto })
    }

    const materiais = aulas.flatMap((aula) => aula.materiais)
    const consultaveis = materiais.slice(0, MAX_MATERIAIS)
    let materiaisIndisponiveis = materiais.length > MAX_MATERIAIS
    for (let inicio = 0; inicio < consultaveis.length; inicio += 5) {
      const lote = consultaveis.slice(inicio, inicio + 5)
      const resultados = await Promise.allSettled(lote.map(async (material) => {
        const url = urlPdfPermitida(material.url_arquivo, supabaseUrl)
        if (!url) throw new Error('Origem do PDF não configurada')
        const paginas = await lerPaginasPdf(url)
        return paginas.map((texto, indice) => ({
          texto,
          titulo: material.titulo,
          pagina: indice + 1,
          url: url.href,
        }))
      }))
      for (const resultado of resultados) {
        if (resultado.status === 'rejected') {
          materiaisIndisponiveis = true
          continue
        }
        for (const fonte of resultado.value) adicionarFonte(fontes, fonte)
      }
    }

    const resposta = await responderComFontes(apiKey, pergunta, selecionarContexto(fontes, pergunta))
    return Response.json({ ...resposta, materiaisIndisponiveis } satisfies RespostaCurso)
  } catch (erro) {
    if (erro instanceof CotaModeloEsgotada) {
      return Response.json({ erro: 'O chat atingiu o limite de uso da API. Tente novamente mais tarde.' }, { status: 503 })
    }
    console.error('Falha no chat do curso', erro instanceof Error ? erro.name : 'Erro desconhecido')
    return Response.json({ erro: 'O chat está indisponível no momento. Tente novamente.' }, { status: 502 })
  }
}
