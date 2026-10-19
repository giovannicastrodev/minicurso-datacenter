export type PapelUsuario = 'aluno' | 'gestor'

export interface Perfil {
  id: string
  nome: string
  criado_em: string
  papel?: PapelUsuario
}

export interface MaterialComplementar {
  id: string
  aula_id?: string
  titulo: string
  url_arquivo: string
}

export interface Alternativa {
  id: string
  questao_id: string
  texto: string
  ordem: number
  correta?: boolean // Visível para gestores
}

export interface Questao {
  id: string
  questionario_id: string
  enunciado: string
  ordem: number
  alternativas: Alternativa[]
}

export interface Questionario {
  id: string
  aula_id?: string | null
  tipo: 'FIXACAO' | 'FINAL'
  titulo: string
  percentual_minimo?: number | null
  questoes: Questao[]
}

export interface Aula {
  id: string
  titulo: string
  descricao: string
  url_video: string
  ordem: number
  materiais?: MaterialComplementar[]
  questionarios?: Questionario[]
}

export interface Tentativa {
  id: string
  questionario_id: string
  enviada_em: string
  acertos: number
  total_questoes: number
  percentual: number
  aprovado: boolean | null
}

export interface Certificado {
  id: string
  usuario_id: string
  tentativa_id: string
  codigo: string
  emitido_em: string
}

export interface ResultadoTentativa {
  tentativa_id: string
  acertos: number
  total_questoes: number
  percentual: number
  aprovado: boolean | null
}

export type StatusAtividade = 'CONCLUIDO' | 'DISPONIVEL' | 'BLOQUEADO'

export interface ItemTimeline {
  id: string
  tipo: 'AULA' | 'MATERIAL' | 'FIXACAO' | 'FINAL'
  titulo: string
  modulo: string
  descricao?: string
  status: StatusAtividade
  badgeInfo?: string
  ordem: number
}

// Tipos para Analytics e Gestão
export interface QuestaoTaxaErro {
  questao_id: string
  enunciado: string
  questionario_titulo: string
  total_respostas: number
  total_erros: number
  taxa_erro: number
}

export interface DesempenhoQuestionario {
  questionario_id: string
  titulo: string
  tipo: 'FIXACAO' | 'FINAL'
  total_tentativas: number
  media_percentual: number
  taxa_aprovacao: number | null
}

export interface AlunoDetalheGestao {
  id: string
  nome: string
  email: string
  criado_em: string
  total_tentativas: number
  ultimo_acesso: string | null
  inativo_15_dias: boolean
  certificado: boolean
}

export interface MetricasGestao {
  total_alunos: number
  alunos_iniciaram: number
  alunos_certificados: number
  alunos_inativos_15_dias: number
  taxa_conclusao: number
  questoes_ranking: QuestaoTaxaErro[]
  desempenho_questionarios: DesempenhoQuestionario[]
  alunos_lista: AlunoDetalheGestao[]
}
