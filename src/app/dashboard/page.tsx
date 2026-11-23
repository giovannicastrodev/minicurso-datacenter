'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Aula, Questionario, Tentativa, Certificado, ResultadoTentativa } from '../../types/database'
import TimelineMoodle from '../../components/TimelineMoodle'
import VisualizadorAula from '../../components/VisualizadorAula'
import PrimeiroAcessoView from '../../components/PrimeiroAcessoView'
import ModalQuestionario from '../../components/ModalQuestionario'
import ModalCertificado from '../../components/ModalCertificado'
import IfspLogo from '../../components/ui/IfspLogo'
import MicrosoftLogo from '../../components/ui/MicrosoftLogo'
import ChatCurso from '../../components/ChatCurso'
import { IconAward, IconSettings, IconLogOut } from '../../components/ui/Icons'

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

  // Carregamento dos dados da plataforma - sem dependência em aulaAtivaId para evitar recarga de tela
  const carregarDadosPlataforma = useCallback(async (forcarResetLocal = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/')
      return
    }

    const userId = session.user.id

    // Busca perfil, papel e timestamp de reinício
    const { data: perfil } = await supabase
      .from('perfis')
      .select('nome, papel, curso_reiniciado_em')
      .eq('id', userId)
      .maybeSingle()

    if (perfil) {
      setNomeUsuario(perfil.nome)
      setIsGestor(perfil.papel === 'gestor')
    }

    // Identifica quando o curso foi reiniciado (se aplicável)
    const reiniciadoEm =
      perfil?.curso_reiniciado_em ||
      session.user.user_metadata?.curso_reiniciado_em ||
      localStorage.getItem(`curso_reiniciado_${userId}`)

    // Determina materiais lidos de forma segura
    let finalMateriais: string[] = []
    if (!forcarResetLocal) {
      const localStr = localStorage.getItem(`materiais_lidos_${userId}`)
      const localMateriais: string[] = localStr ? JSON.parse(localStr) : []
      const metaMateriais: string[] = Array.isArray(session.user.user_metadata?.materiais_lidos)
        ? session.user.user_metadata.materiais_lidos
        : []

      // Se o curso foi reiniciado, não ressuscita materiais lidos do metadata antigo
      if (reiniciadoEm) {
        finalMateriais = localMateriais
      } else {
        finalMateriais = Array.from(new Set([...metaMateriais, ...localMateriais]))
      }
    }

    setCursoIniciado(true)
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
            ativa,
            alternativas (id, questao_id, texto, ordem)
          )
        )
      `)
      .order('ordem')

    if (dadosAulas) {
      const aulasFiltradas = (dadosAulas as unknown as Aula[]).map((aula) => ({
        ...aula,
        questionarios: Array.isArray(aula.questionarios)
          ? aula.questionarios.map((questionario) => ({
              ...questionario,
              questoes: (questionario.questoes || []).filter(
                (questao) => questao.ativa !== false
              ),
            }))
          : aula.questionarios,
      }))

      setAulas(aulasFiltradas)
      if (dadosAulas.length > 0) {
        setAulaAtivaId((prev) => prev || dadosAulas[0].id)
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
          ativa,
          alternativas (id, questao_id, texto, ordem)
        )
      `)
      .eq('tipo', 'FINAL')
      .maybeSingle()

    if (dadosFinal) {
      if (dadosFinal) {
      const avaliacao = dadosFinal as unknown as Questionario

      setAvaliacaoFinal({
        ...avaliacao,
        questoes: (avaliacao.questoes || []).filter(
          (questao) => questao.ativa !== false
        ),
      })
    }
    }

    // Consulta histórico de tentativas (filtrando estritamente pelo usuário autenticado)
    const { data: dadosTentativas } = await supabase
      .from('tentativas')
      .select('id, questionario_id, acertos, total_questoes, percentual, aprovado, enviada_em')
      .eq('usuario_id', userId)
      .order('enviada_em', { ascending: false })

    if (dadosTentativas) {
      const tentativasValidas = reiniciadoEm
        ? (dadosTentativas as Tentativa[]).filter((t) => {
            return new Date(t.enviada_em).getTime() > new Date(reiniciadoEm).getTime()
          })
        : (dadosTentativas as Tentativa[])

      setTentativas(tentativasValidas)

      if (tentativasValidas.length > 0) {
        setVisao((prev) => (prev === 'apresentacao' ? 'timeline' : prev))
      }
    } else {
      setTentativas([])
    }

    // Consulta certificado
    const { data: dadosCert } = await supabase
      .from('certificados')
      .select('id, usuario_id, tentativa_id, codigo, emitido_em')
      .eq('usuario_id', userId)
      .maybeSingle()

    if (dadosCert) {
      const certificadoValido = reiniciadoEm
        ? new Date(dadosCert.emitido_em).getTime() > new Date(reiniciadoEm).getTime()
        : true

      setCertificado(certificadoValido ? (dadosCert as Certificado) : null)
    } else {
      setCertificado(null)
    }

    setCarregando(false)
  }, [router])

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
      'Atenção: Ao reiniciar o curso, todo o seu progresso, histórico de atividades e leituras serão zerados para que você refaça a trilha desde o início. Deseja prosseguir?'
    )
    if (!confirmou) return

    setCarregando(true)
    const agora = new Date().toISOString()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      const userId = session.user.id

      // 1. Armazena no localStorage para sincronização imediata
      localStorage.setItem(`curso_reiniciado_${userId}`, agora)
      localStorage.setItem(`materiais_lidos_${userId}`, JSON.stringify([]))

      // 2. Chama RPC atômico no banco Supabase
      const { error: rpcError } = await supabase.rpc('reiniciar_trilha_aluno')
      if (rpcError) {
        console.warn('RPC reiniciar_trilha_aluno indisponível, aplicando fallback direto:', rpcError)
        // Fallback direto nas tabelas
        await supabase
          .from('perfis')
          .update({ curso_reiniciado_em: agora })
          .eq('id', userId)

        await supabase
          .from('tentativas')
          .delete()
          .eq('usuario_id', userId)

        await supabase
          .from('certificados')
          .delete()
          .eq('usuario_id', userId)
      }

      // 3. Atualiza os metadados do auth do usuário
      await supabase.auth.updateUser({
        data: {
          curso_reiniciado_em: agora,
          materiais_lidos: [],
          curso_iniciado: true,
        },
      })
    }

    // 4. Limpa estados da tela
    setMateriaisLidos([])
    setTentativas([])
    setCertificado(null)
    setQuestionarioAtivo(null)
    setVisao('timeline')

    // 5. Recarrega dados com flag de reset
    await carregarDadosPlataforma(true)
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

  const abrirQuestionario = (q: Questionario) => {
    setQuestionarioAtivo(q)
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090b10] text-zinc-100">
        <div className="text-center space-y-4">
          <div className="h-9 w-9 animate-spin rounded-xs border-2 border-sky-400 border-t-transparent mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            Carregando ambiente técnico...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100 pb-20">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO INSTITUCIONAL */}
      <header className="sticky top-0 z-40 bg-[#0d1017]/95 border-b border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <IfspLogo textColor="light" className="h-8" />
            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-sky-400">
                Data Centers
              </span>
              <MicrosoftLogo textColor="light" className="h-4" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Navegação Superior com Arestas Nítidas */}
            {cursoIniciado && (
              <nav className="hidden md:flex items-center gap-1 rounded-sm bg-[#090b10] border border-zinc-800 p-1">
                <button
                  onClick={() => setVisao('timeline')}
                  className={`rounded-sm px-3.5 py-1.5 text-xs font-bold transition ${
                    visao === 'timeline'
                      ? 'bg-sky-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Linha do Tempo
                </button>
                <button
                  onClick={() => setVisao('aula')}
                  className={`rounded-sm px-3.5 py-1.5 text-xs font-bold transition ${
                    visao === 'aula'
                      ? 'bg-sky-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Módulo Atual
                </button>
                <button
                  onClick={() => setVisao('apresentacao')}
                  className={`rounded-sm px-3.5 py-1.5 text-xs font-bold transition ${
                    visao === 'apresentacao'
                      ? 'bg-sky-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Visão Geral
                </button>
              </nav>
            )}

            {certificado && (
              <button
                onClick={() => setModalCertificadoAberto(true)}
                className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition"
              >
                <IconAward className="w-4 h-4" />
                <span>Certificado</span>
              </button>
            )}

            {isGestor && (
              <Link
                href="/gestao"
                className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-[#090b10] px-3 py-1.5 text-xs font-bold text-zinc-300 hover:border-sky-400 hover:text-sky-300 transition"
              >
                <IconSettings className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Painel do Gestor</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-[#090b10] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              title="Encerrar Sessão"
            >
              <IconLogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Abas Mobile */}
        {cursoIniciado && (
          <div className="flex md:hidden border-t border-zinc-800 bg-[#090b10] px-4 py-2 gap-2 overflow-x-auto">
            <button
              onClick={() => setVisao('timeline')}
              className={`rounded-sm px-3 py-1.5 text-xs font-bold shrink-0 ${
                visao === 'timeline'
                  ? 'bg-sky-500 text-zinc-950'
                  : 'bg-[#11141c] text-zinc-400 border border-zinc-800'
              }`}
            >
              Linha do Tempo
            </button>
            <button
              onClick={() => setVisao('aula')}
              className={`rounded-sm px-3 py-1.5 text-xs font-bold shrink-0 ${
                visao === 'aula'
                  ? 'bg-sky-500 text-zinc-950'
                  : 'bg-[#11141c] text-zinc-400 border border-zinc-800'
              }`}
            >
              Módulo Atual
            </button>
            <button
              onClick={() => setVisao('apresentacao')}
              className={`rounded-sm px-3 py-1.5 text-xs font-bold shrink-0 ${
                visao === 'apresentacao'
                  ? 'bg-sky-500 text-zinc-950'
                  : 'bg-[#11141c] text-zinc-400 border border-zinc-800'
              }`}
            >
              Visão Geral
            </button>
          </div>
        )}
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* BANNER DE CERTIFICAÇÃO (QUANDO APROVADO) */}
        {certificado && visao !== 'apresentacao' && (
          <div className="rounded-sm border border-emerald-800/80 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-emerald-950/60 p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-500/20 px-2.5 py-0.5 text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
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
                className="self-start sm:self-center rounded-sm bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-emerald-500 transition"
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

        {/* CENÁRIO 2: LINHA DO TEMPO */}
        {visao === 'timeline' && (
          <TimelineMoodle
            aulas={aulas}
            avaliacaoFinal={avaliacaoFinal}
            tentativas={tentativas}
            materiaisLidos={materiaisLidos}
            onAcessarAula={handleAcessarAula}
            onAbrirQuestionario={abrirQuestionario}
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
            onAbrirQuestionario={abrirQuestionario}
            onSelecionarAula={(id) => setAulaAtivaId(id)}
            onVoltarTimeline={() => setVisao('timeline')}
          />
        )}
      </main>

      <ChatCurso />

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
