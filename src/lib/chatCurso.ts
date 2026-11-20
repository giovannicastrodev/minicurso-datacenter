export const LIMITE_PERGUNTA = 1000

export interface TrechoCurso {
  texto: string
  titulo: string
  pagina?: number
  url?: string
}

export interface RespostaCurso {
  visaoGeral?: boolean
  explicacao: string | null
  trechos: TrechoCurso[]
  materiaisIndisponiveis: boolean
}
