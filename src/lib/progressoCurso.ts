import { Aula, Questionario, Tentativa } from '../types/database'

// ---------------------------------------------------------------------------
// REGRAS DO CURSO (altere aqui e vale para o dashboard inteiro)
// ---------------------------------------------------------------------------
export const MAX_TENTATIVAS = 2
export const MINIMO_FIXACAO = 50 // % mínimo para aprovar uma atividade de fixação
export const MINIMO_FINAL = 70 // % mínimo para aprovar a Avaliação Final

const passou = (t: Tentativa, minimo: number) => t.aprovado || t.percentual >= minimo

const maisRecentePrimeiro = (a: Tentativa, b: Tentativa) =>
  new Date(b.enviada_em).getTime() - new Date(a.enviada_em).getTime()

export function getQuestionarioFixacao(aula: Aula): Questionario | null {
  const q = Array.isArray(aula.questionarios)
    ? aula.questionarios[0]
    : (aula.questionarios as unknown as Questionario)
  return q || null
}

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------
export interface StatusModulo {
  aula: Aula
  qFixacao: Questionario | null
  totalTentativasFix: number
  ultimaTentativaFix: Tentativa | null
  tentativaAprovadaFix: Tentativa | null
  fixacaoAprovada: boolean
  esgotouFixacao: boolean
  todosMateriaisLidos: boolean
  /** O módulo anterior foi concluído? (o primeiro módulo sempre está liberado) */
  liberada: boolean
  /** Materiais lidos + fixação aprovada (ou sem fixação cadastrada) */
  concluida: boolean
}

export interface StatusFinal {
  total: number
  ultima: Tentativa | null
  tentativaAprovada: Tentativa | null
  aprovado: boolean
  /** 2 tentativas usadas sem aprovação => reinício obrigatório */
  esgotou: boolean
  todosModulosConcluidos: boolean
  /** Pode abrir a prova agora? */
  liberada: boolean
}

export interface ProgressoCurso {
  modulos: StatusModulo[]
  todosModulosConcluidos: boolean
  final: StatusFinal | null
}

interface Entrada {
  aulas: Aula[]
  avaliacaoFinal: Questionario | null
  tentativas: Tentativa[]
  materiaisLidos: string[]
}

// ---------------------------------------------------------------------------
// CÁLCULO
// ---------------------------------------------------------------------------
export function calcularProgresso({
  aulas,
  avaliacaoFinal,
  tentativas,
  materiaisLidos,
}: Entrada): ProgressoCurso {
  const tentativasDe = (questionarioId: string) =>
    tentativas
      .filter((t) => t.questionario_id === questionarioId)
      .sort(maisRecentePrimeiro)

  let anteriorConcluida = true

  const modulos: StatusModulo[] = [...aulas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((aula) => {
      const qFixacao = getQuestionarioFixacao(aula)
      const lista = qFixacao ? tentativasDe(qFixacao.id) : []

      const tentativaAprovadaFix = lista.find((t) => passou(t, MINIMO_FIXACAO)) || null
      const fixacaoAprovada = !!tentativaAprovadaFix
      const esgotouFixacao = lista.length >= MAX_TENTATIVAS && !fixacaoAprovada

      const materiais = aula.materiais || []
      const temMateriais = materiais.length > 0
      // Leitura só é considerada concluída se houver materiais anexados e TODOS tiverem sido marcados como lidos
      const todosMateriaisLidos =
        temMateriais ? materiais.every((m) => materiaisLidos.includes(m.id)) : false

      const concluida = todosMateriaisLidos && (qFixacao ? fixacaoAprovada : true)
      const liberada = anteriorConcluida
      anteriorConcluida = concluida

      return {
        aula,
        qFixacao,
        totalTentativasFix: lista.length,
        ultimaTentativaFix: lista[0] || null,
        tentativaAprovadaFix,
        fixacaoAprovada,
        esgotouFixacao,
        todosMateriaisLidos,
        liberada,
        concluida,
      }
    })

  // TODOS os módulos precisam estar concluídos (e existir pelo menos um)
  const todosModulosConcluidos = modulos.length > 0 && modulos.every((m) => m.concluida)

  let final: StatusFinal | null = null
  if (avaliacaoFinal) {
    const lista = tentativasDe(avaliacaoFinal.id)
    const tentativaAprovada = lista.find((t) => passou(t, MINIMO_FINAL)) || null
    const aprovado = !!tentativaAprovada
    const esgotou = lista.length >= MAX_TENTATIVAS && !aprovado

    final = {
      total: lista.length,
      ultima: lista[0] || null,
      tentativaAprovada,
      aprovado,
      esgotou,
      todosModulosConcluidos,
      liberada: todosModulosConcluidos && !esgotou,
    }
  }

  return { modulos, todosModulosConcluidos, final }
}
