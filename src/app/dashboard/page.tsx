'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Aula, Questionario, Certificado, Tentativa, ResultadoTentativa } from '../../types/database'
import ModalQuestionario from '../../components/ModalQuestionario'
import ModalCertificado from '../../components/ModalCertificado'
import PrimeiroAcessoView from '../../components/PrimeiroAcessoView'
import TimelineMoodle from '../../components/TimelineMoodle'
import VisualizadorAula from '../../components/VisualizadorAula'
import IfspLogo from '../../components/ui/IfspLogo'
import MicrosoftLogo from '../../components/ui/MicrosoftLogo'
import {
  IconAward,
  IconLogOut,
  IconSettings,
  IconRefresh,
  IconLock,
  IconArrowRight,
  IconPlay,
} from '../../components/ui/Icons'

type VisaoPainel = 'apresentacao' | 'timeline' | 'aula'

export default function DashboardPage() {
  const router = useRouter()
  const [aulas, setAulas] = useState<Aula[]>([])
  const [avaliacaoFinal, setAvaliacaoFinal] = useState<Questionario | null>(null)
  const [tentativas, setTentativas] = useState<Tentativa[]>([])
  const [certificado, setCertificado] = useState<Certificado | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [isGestor, setIsGestor] = useState(false)
  const [carregando, setCarregando] = useState(true)

  // Estado pedagógico & Navegação progressiva
  const [cursoIniciado, setCursoIniciado] = useState(false)
  const [materiaisLidos, setMateriaisLidos] = useState<string[]>([])
  const [visao, setVisao] = useState<VisaoPainel>('apresentacao')
  const [aulaAtivaId, setAulaAtivaId] = useState<string | null>(null)

  // Controle de Modais
  const [questionarioAtivo, setQuestionarioAtivo] = useState<Questionario | null>(null)
  const [modalCertificadoAberto, setModalCertificadoAberto] = useState(false)

  // Carregamento dos dados da plataforma
  const carregarDadosPlataforma = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/')
      return
    }

    // Busca perfil e papel
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nome, papel')
      .eq('id', session.user.id)
      .maybeSingle()

    if (perfil) {
      setNomeUsuario(perfil.nome)
      setIsGestor(perfil.papel === 'gestor')
    }

    // Lê metadados pedagógicos
    const meta = session.user.user_metadata || {}
    const metaIniciado = !!meta.curso_iniciado
    const metaMateriais = Array.isArray(meta.materiais_lidos) ? meta.materiais_lidos : []
    const reiniciadoEm =
      meta.curso_reiniciado_em ||
      localStorage.getItem(`curso_reiniciado_${session.user.id}`)

    const localIniciado = localStorage.getItem(`curso_iniciado_${session.user.id}`) === 'true'
    const localMateriais = JSON.parse(
      localStorage.getItem(`materiais_lidos_${session.user.id}`) || '[]'
    )

    const finalIniciado = metaIniciado || localIniciado
    const finalMateriais = Array.from(new Set([...metaMateriais, ...localMateriais]))

    setCursoIniciado(finalIniciado)
    setMateriaisLidos(finalMateriais)

    // Consulta de aulas
    const { data: dadosAulas } = await supabase
      .from('aulas')
      .select(`
        id,
        titulo,
        descricao,
        url_video,
        ordem,
        materiais (id, titulo, url_arquivo),
        questionarios (
          id,
          tipo,
          titulo,
          percentual_minimo,
          questoes (
            id,
            enunciado,
            ordem,
            alternativas (id, questao_id, texto, ordem)
          )
        )
      `)
      .order('ordem')

    if (dadosAulas) {
      setAulas(dadosAulas as unknown as Aula[])
      if (!aulaAtivaId && dadosAulas.length > 0) {
        setAulaAtivaId(dadosAulas[0].id)
      }
    }

    // Consulta da Avaliação Final
    const { data: dadosFinal } = await supabase
      .from('questionarios')
      .select(`
        id,
        tipo,
        titulo,
        percentual_minimo,
        questoes (
          id,
          enunciado,
          ordem,
          alternativas (id, questao_id, texto, ordem)
        )
      `)
      .eq('tipo', 'FINAL')
      .maybeSingle()

    if (dadosFinal) {
      setAvaliacaoFinal(dadosFinal as unknown as Questionario)
    }

    // Consulta histórico de tentativas
    const { data: dadosTentativas } = await supabase
      .from('tentativas')
      .select('id, questionario_id, acertos, total_questoes, percentual, aprovado, enviada_em')
      .order('enviada_em', { ascending: false })

    if (dadosTentativas) {
      const tentativasValidas = reiniciadoEm
        ? (dadosTentativas as Tentativa[]).filter(
            (t) => new Date(t.enviada_em) > new Date(reiniciadoEm)
          )
        : (dadosTentativas as Tentativa[])

      setTentativas(tentativasValidas)

      if (tentativasValidas.length > 0 || finalIniciado) {
        setVisao('timeline')
        setCursoIniciado(true)
      } else {
        setVisao('apresentacao')
      }
    }

    // Consulta certificado
    const { data: dadosCert } = await supabase
      .from('certificados')
      .select('id, usuario_id, tentativa_id, codigo, emitido_em')
      .maybeSingle()

    if (dadosCert) {
      setCertificado(dadosCert as Certificado)
    }

    setCarregando(false)
  }, [router, aulaAtivaId])

  useEffect(() => {
    carregarDadosPlataforma()
  }, [carregarDadosPlataforma])

  const handleIniciarCurso = async () => {
    setCursoIniciado(true)
    setVisao('timeline')

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      localStorage.setItem(`curso_iniciado_${session.user.id}`, 'true')
      await supabase.auth.updateUser({
        data: { curso_iniciado: true },
      })
    }
  }

  const handleMarcarMaterialLido = async (materialId: string) => {
    if (materiaisLidos.includes(materialId)) return

    const novosMateriais = [...materiaisLidos, materialId]
    setMateriaisLidos(novosMateriais)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      localStorage.setItem(
        `materiais_lidos_${session.user.id}`,
        JSON.stringify(novosMateriais)
      )
      await supabase.auth.updateUser({
        data: { materiais_lidos: novosMateriais },
      })
    }
  }

  // Releitura de materiais obrigatória se reprovou 2 vezes na fixação
  const handleExigirReleitura = async (aulaId: string) => {
    const aula = aulas.find((a) => a.id === aulaId)
    if (!aula || !aula.materiais) return

    const idsMateriaisAula = aula.materiais.map((m) => m.id)
    const novosMateriais = materiaisLidos.filter((id) => !idsMateriaisAula.includes(id))

    setMateriaisLidos(novosMateriais)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      localStorage.setItem(
        `materiais_lidos_${session.user.id}`,
        JSON.stringify(novosMateriais)
      )
      await supabase.auth.updateUser({
        data: { materiais_lidos: novosMateriais },
      })
    }
  }

  // Reiniciar todo o curso se reprovou 2 vezes na Prova Final
  const handleReiniciarCurso = async () => {
    const confirmou = window.confirm(
      'Atenção: Ao reiniciar o curso, seu progresso nesta trilha será reiniciado para que você refaça os módulos e atividades do início. Deseja prosseguir?'
    )
    if (!confirmou) return

    const agora = new Date().toISOString()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      localStorage.setItem(`curso_reiniciado_${session.user.id}`, agora)
      localStorage.setItem(`materiais_lidos_${session.user.id}`, JSON.stringify([]))
      await supabase.auth.updateUser({
        data: {
          curso_reiniciado_em: agora,
          materiais_lidos: [],
        },
      })
    }

    setMateriaisLidos([])
    setQuestionarioAtivo(null)
    setVisao('timeline')
    await carregarDadosPlataforma()
  }

  const handleAcessarAula = (aulaId: string) => {
    setAulaAtivaId(aulaId)
    setVisao('aula')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleTentativaSucesso = async (resultado: ResultadoTentativa) => {
    await carregarDadosPlataforma()
    if (resultado.aprovado && questionarioAtivo?.tipo === 'FINAL') {
      setModalCertificadoAberto(true)
    }
  }

  const aulaAtiva = useMemo(() => {
    return aulas.find((a) => a.id === aulaAtivaId) || aulas[0] || null
  }, [aulas, aulaAtivaId])

  // Tentativas da aula ativa
  const { tentativaAulaAtiva, totalTentativasFixacao } = useMemo(() => {
    if (!aulaAtiva) return { tentativaAulaAtiva: null, totalTentativasFixacao: 0 }
    const qFix = Array.isArray(aulaAtiva.questionarios)
      ? aulaAtiva.questionarios[0]
      : (aulaAtiva.questionarios as unknown as Questionario)
    if (!qFix) return { tentativaAulaAtiva: null, totalTentativasFixacao: 0 }

    const lista = tentativas.filter((t) => t.questionario_id === qFix.id)
    return {
      tentativaAulaAtiva: lista[0] || null,
      totalTentativasFixacao: lista.length,
    }
  }, [aulaAtiva, tentativas])

  // Estado da Avaliação Final
  const { totalTentativasFinal, aprovadoFinal, esgotouTentativasFinal } = useMemo(() => {
    if (!avaliacaoFinal) {
      return { totalTentativasFinal: 0, aprovadoFinal: false, esgotouTentativasFinal: false }
    }
    const lista = tentativas.filter((t) => t.questionario_id === avaliacaoFinal.id)
    const aprov = lista.some((t) => t.aprovado || t.percentual >= 70)
    const esgotou = lista.length >= 2 && !aprov
    return {
      totalTentativasFinal: lista.length,
      aprovadoFinal: aprov,
      esgotouTentativasFinal: esgotou,
    }
  }, [avaliacaoFinal, tentativas])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Carregando ambiente educacional...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO INSTITUCIONAL (IFSP + MICROSOFT / SUAP + FIAP STYLE) */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 border-b border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <IfspLogo textColor="light" className="h-9" />
            <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                Data Centers
              </span>
              <MicrosoftLogo textColor="light" className="h-5" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Navegação Superior */}
            {cursoIniciado && (
              <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-1">
                <button
                  onClick={() => setVisao('timeline')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    visao === 'timeline'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Linha do Tempo
                </button>
                <button
                  onClick={() => setVisao('aula')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    visao === 'aula'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Módulo Atual
                </button>
                <button
                  onClick={() => setVisao('apresentacao')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    visao === 'apresentacao'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Apresentação
                </button>
              </nav>
            )}

            {certificado && (
              <button
                onClick={() => setModalCertificadoAberto(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-600 transition"
              >
                <IconAward className="w-4 h-4" />
                <span>Certificado</span>
              </button>
            )}

            {isGestor && (
              <Link
                href="/gestao"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-red-500 hover:text-white transition"
              >
                <IconSettings className="w-4 h-4" />
                <span className="hidden sm:inline">Painel do Gestor</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-red-950/60 hover:text-red-400 transition"
              title="Encerrar Sessão"
            >
              <IconLogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Abas Mobile */}
        {cursoIniciado && (
          <div className="flex md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-2 gap-2 overflow-x-auto">
            <button
              onClick={() => setVisao('timeline')}
              className={`rounded-lg px-3 py-1 text-xs font-bold shrink-0 ${
                visao === 'timeline'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              Linha do Tempo
            </button>
            <button
              onClick={() => setVisao('aula')}
              className={`rounded-lg px-3 py-1 text-xs font-bold shrink-0 ${
                visao === 'aula'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              Módulo Atual
            </button>
            <button
              onClick={() => setVisao('apresentacao')}
              className={`rounded-lg px-3 py-1 text-xs font-bold shrink-0 ${
                visao === 'apresentacao'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              Apresentação
            </button>
          </div>
        )}
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* BANNER DE CERTIFICAÇÃO (QUANDO APROVADO) */}
        {certificado && visao !== 'apresentacao' && (
          <div className="rounded-3xl border border-emerald-800/80 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-emerald-950/60 p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                  <IconAward className="w-3.5 h-3.5" />
                  <span>Aprovado no Minicurso</span>
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  Seu Certificado Oficial de Conclusão está disponível!
                </h2>
                <p className="text-xs text-zinc-400">
                  Código de Autenticação:{' '}
                  <code className="font-mono font-bold text-emerald-400">{certificado.codigo}</code>
                </p>
              </div>

              <button
                onClick={() => setModalCertificadoAberto(true)}
                className="self-start sm:self-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-emerald-500 transition"
              >
                Visualizar e Imprimir Certificado
              </button>
            </div>
          </div>
        )}

        {/* CENÁRIO 1: APRESENTAÇÃO / PRIMEIRO ACESSO */}
        {visao === 'apresentacao' && (
          <PrimeiroAcessoView
            nomeAluno={nomeUsuario}
            onIniciarCurso={handleIniciarCurso}
          />
        )}

        {/* CENÁRIO 2: LINHA DO TEMPO (MOODLE / SUAP) */}
        {visao === 'timeline' && (
          <TimelineMoodle
            aulas={aulas}
            avaliacaoFinal={avaliacaoFinal}
            tentativas={tentativas}
            materiaisLidos={materiaisLidos}
            onAcessarAula={handleAcessarAula}
            onAbrirQuestionario={(q) => setQuestionarioAtivo(q)}
            onReiniciarCurso={handleReiniciarCurso}
          />
        )}

        {/* CENÁRIO 3: MÓDULO FOCADO (HERO SLIDES 16:9) */}
        {visao === 'aula' && aulaAtiva && (
          <VisualizadorAula
            aula={aulaAtiva}
            todasAulas={aulas}
            materiaisLidos={materiaisLidos}
            tentativaFixacao={tentativaAulaAtiva}
            totalTentativasFixacao={totalTentativasFixacao}
            onMarcarMaterialLido={handleMarcarMaterialLido}
            onAbrirQuestionario={(q) => setQuestionarioAtivo(q)}
            onSelecionarAula={(id) => setAulaAtivaId(id)}
            onVoltarTimeline={() => setVisao('timeline')}
          />
        )}

        {/* SEÇÃO FINAL: CARD DA AVALIAÇÃO FINAL (COM BLOQUEIO ESTRITO DE 2 TENTATIVAS) */}
        {visao === 'timeline' && avaliacaoFinal && (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-600 px-3 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                    Etapa Final
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">
                    Aprovação mínima: 70% • Limite: 2 tentativas
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">{avaliacaoFinal.titulo}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Avaliação teórica abrangente de 5 questões cobrindo todos os módulos. Tempo máximo:
                  50 minutos.
                </p>

                {esgotouTentativasFinal && (
                  <div className="rounded-xl border border-red-800/80 bg-red-950/60 p-3 text-xs text-red-300 font-semibold flex items-center gap-2">
                    <IconLock className="w-4 h-4 text-red-500 shrink-0" />
                    <span>
                      Você esgotou suas 2 tentativas na Avaliação Final sem atingir a nota mínima de 70%.
                      Para obter o certificado, é obrigatório reiniciar a trilha de estudos.
                    </span>
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {esgotouTentativasFinal ? (
                  <button
                    onClick={handleReiniciarCurso}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-red-700 transition"
                  >
                    <IconRefresh className="w-4 h-4" />
                    <span>Reiniciar Trilha de Estudos</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setQuestionarioAtivo(avaliacaoFinal)}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-red-700 transition"
                  >
                    <span>
                      {totalTentativasFinal > 0
                        ? 'Refazer Avaliação Final'
                        : 'Iniciar Avaliação Final'}
                    </span>
                    <IconArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* QUESTIONÁRIO EM TELA CHEIA */}
      {questionarioAtivo && (
        <ModalQuestionario
          questionario={questionarioAtivo}
          isOpen={!!questionarioAtivo}
          onClose={() => setQuestionarioAtivo(null)}
          onSuccess={handleTentativaSucesso}
          tentativasAnteriores={tentativas}
          aulaId={questionarioAtivo.aula_id || aulaAtiva?.id}
          onExigirReleitura={handleExigirReleitura}
          onReiniciarCurso={handleReiniciarCurso}
          onAbrirCertificado={() => setModalCertificadoAberto(true)}
        />
      )}

      {/* CERTIFICADO OFICIAL */}
      {certificado && (
        <ModalCertificado
          certificado={certificado}
          nomeAluno={nomeUsuario}
          isOpen={modalCertificadoAberto}
          onClose={() => setModalCertificadoAberto(false)}
        />
      )}
    </div>
  )
}