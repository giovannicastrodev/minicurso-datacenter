'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Aula, Questionario, MetricasGestao, Perfil } from '../../types/database'
import PainelAnalytics from '../../components/gestao/PainelAnalytics'
import GerenciadorAulas from '../../components/gestao/GerenciadorAulas'
import GerenciadorQuestionarios from '../../components/gestao/GerenciadorQuestionarios'
import IfspLogo from '../../components/ui/IfspLogo'
import MicrosoftLogo from '../../components/ui/MicrosoftLogo'
import {
  IconBarChart,
  IconBookOpen,
  IconFileText,
  IconSettings,
  IconGraduationCap,
  IconLogOut,
  IconLock,
} from '../../components/ui/Icons'

type AbaGestao = 'analytics' | 'aulas' | 'questionarios'

export default function GestaoPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [perfilUsuario, setPerfilUsuario] = useState<Perfil | null>(null)
  const [isGestor, setIsGestor] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<AbaGestao>('analytics')

  // Dados do Curso
  const [aulas, setAulas] = useState<Aula[]>([])
  const [questionarios, setQuestionarios] = useState<Questionario[]>([])
  const [metricas, setMetricas] = useState<MetricasGestao | null>(null)
  const [carregandoMetricas, setCarregandoMetricas] = useState(false)

  const carregarDadosGestor = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/')
      return
    }

    // Busca o perfil e verifica o papel de gestor
    const { data: perfil } = await supabase
      .from('perfis')
      .select('id, nome, papel, criado_em')
      .eq('id', session.user.id)
      .maybeSingle()

    if (perfil) {
      setPerfilUsuario(perfil as Perfil)
      const gestor = perfil.papel === 'gestor'
      setIsGestor(gestor)

      if (gestor) {
        // Carrega Aulas e Questionários
        const { data: dadosAulas } = await supabase
          .from('aulas')
          .select(`
            id,
            titulo,
            descricao,
            url_video,
            ordem,
            materiais (id, titulo, url_arquivo),
            questionarios (id, tipo, titulo)
          `)
          .order('ordem')

        if (dadosAulas) {
          setAulas(dadosAulas as unknown as Aula[])
        }

        const { data: dadosQuest } = await supabase
          .from('questionarios')
          .select('id, aula_id, tipo, titulo, percentual_minimo')
          .order('tipo', { ascending: false })

        if (dadosQuest) {
          setQuestionarios(dadosQuest as unknown as Questionario[])
        }

        // Carrega Métricas via RPC
        setCarregandoMetricas(true)
        const { data: dadosMetricas, error: errMetricas } = await supabase.rpc(
          'obter_metricas_gestao'
        )
        if (!errMetricas && dadosMetricas) {
          setMetricas(dadosMetricas as MetricasGestao)
        }
        setCarregandoMetricas(false)
      }
    }

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregarDadosGestor()
  }, [carregarDadosGestor])

  const handlePromoverParaGestorDev = async () => {
    if (!perfilUsuario) return
    const { error } = await supabase
      .from('perfis')
      .update({ papel: 'gestor' })
      .eq('id', perfilUsuario.id)

    if (!error) {
      alert('Perfil promovido para Gestor com sucesso! Recarregando...')
      carregarDadosGestor()
    } else {
      alert(
        `Para promover seu usuário a Gestor, execute a migração 'supabase/admin_gestao.sql' no Supabase! Detalhes: ${error.message}`
      )
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090b10] text-zinc-100">
        <div className="text-center space-y-4">
          <div className="h-9 w-9 animate-spin rounded-xs border-2 border-sky-400 border-t-transparent mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            Carregando painel de gestão...
          </p>
        </div>
      </div>
    )
  }

  // TELA DE ACESSO NEGADO SE NÃO FOR GESTOR
  if (!isGestor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090b10] p-4 text-zinc-100">
        <div className="w-full max-w-lg rounded-sm border border-zinc-800 bg-[#11141c] p-8 text-center shadow-2xl space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xs bg-amber-950/60 border border-amber-800 text-amber-400">
            <IconLock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              Permissão Insuficiente
            </span>
            <h2 className="text-xl font-bold text-white mt-1">Acesso Restrito à Coordenação</h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              O seu usuário (<strong className="text-white">{perfilUsuario?.nome}</strong>)
              atualmente possui o papel de <strong>Aluno</strong>. Apenas gestores e professores
              possuem autorização para gerenciar aulas, questionários e visualizar indicadores de
              evasão.
            </p>
          </div>

          <div className="rounded-sm bg-[#090b10] p-4 text-left text-xs text-zinc-400 space-y-2 border border-zinc-800">
            <p className="font-bold text-zinc-300 font-mono text-[11px]">Como habilitar permissão de gestor no Supabase:</p>
            <p className="text-[11px]">1. Execute a migração do arquivo <code className="font-mono text-sky-400">supabase/admin_gestao.sql</code> no SQL Editor do Supabase.</p>
            <p className="text-[11px]">2. Em seguida, execute o comando:</p>
            <pre className="rounded-xs bg-black p-2 text-[11px] font-mono text-emerald-400 overflow-x-auto border border-zinc-800">
              UPDATE public.perfis SET papel = &apos;gestor&apos; WHERE id = &apos;{perfilUsuario?.id}&apos;;
            </pre>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={handlePromoverParaGestorDev}
              className="rounded-sm bg-sky-500 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md hover:bg-sky-400 transition"
            >
              Habilitar Acesso Gestor Agora
            </button>
            <Link
              href="/dashboard"
              className="rounded-sm border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              Voltar ao Modo Aluno
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100 pb-20">
      {/* BARRA SUPERIOR DO GESTOR */}
      <header className="sticky top-0 z-40 bg-[#0d1017]/95 border-b border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <IfspLogo textColor="light" className="h-8" />
            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-sky-400">
                  Painel de Gestão • IFSP / Microsoft
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Administração do Minicurso de Data Centers
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-[#090b10] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-sky-400 hover:text-white transition"
            >
              <IconGraduationCap className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Visualizar como Aluno</span>
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-[#090b10] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            >
              <IconLogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* ABAS DE NAVEGAÇÃO DO GESTOR COM ARESTAS RETANGULARES */}
        <div className="border-t border-zinc-800 bg-[#090b10] px-4 sm:px-8">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-2">
            <button
              onClick={() => setAbaAtiva('analytics')}
              className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold shrink-0 transition ${
                abaAtiva === 'analytics'
                  ? 'bg-sky-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:bg-[#11141c] hover:text-white'
              }`}
            >
              <IconBarChart className="w-4 h-4" />
              <span>Indicadores & Evasão</span>
            </button>

            <button
              onClick={() => setAbaAtiva('aulas')}
              className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold shrink-0 transition ${
                abaAtiva === 'aulas'
                  ? 'bg-sky-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:bg-[#11141c] hover:text-white'
              }`}
            >
              <IconBookOpen className="w-4 h-4" />
              <span>Módulos & Apresentações</span>
            </button>

            <button
              onClick={() => setAbaAtiva('questionarios')}
              className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold shrink-0 transition ${
                abaAtiva === 'questionarios'
                  ? 'bg-sky-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:bg-[#11141c] hover:text-white'
              }`}
            >
              <IconFileText className="w-4 h-4" />
              <span>Banco de Questionários</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO GESTOR */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {abaAtiva === 'analytics' && (
          <PainelAnalytics
            metricas={
              metricas || {
                total_alunos: 0,
                alunos_iniciaram: 0,
                alunos_certificados: 0,
                alunos_inativos_15_dias: 0,
                taxa_conclusao: 0,
                questoes_ranking: [],
                desempenho_questionarios: [],
                alunos_lista: [],
              }
            }
            carregando={carregandoMetricas}
            onAtualizar={carregarDadosGestor}
          />
        )}

        {abaAtiva === 'aulas' && (
          <GerenciadorAulas aulas={aulas} onAtualizar={carregarDadosGestor} />
        )}

        {abaAtiva === 'questionarios' && (
          <GerenciadorQuestionarios
            questionarios={questionarios}
            onAtualizar={carregarDadosGestor}
          />
        )}
      </main>
    </div>
  )
}
