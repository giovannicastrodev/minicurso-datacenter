'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Aula, Questionario, MetricasGestao, Perfil } from '../../types/database'
import PainelAnalytics from '../../components/gestao/PainelAnalytics'
import GerenciadorAulas from '../../components/gestao/GerenciadorAulas'
import GerenciadorQuestionarios from '../../components/gestao/GerenciadorQuestionarios'

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
      alert(`Para promover seu usuário a Gestor, execute o script 'supabase/admin_gestao.sql' no Supabase! Detalhes: ${error.message}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-700 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-gray-700">Carregando portal de gestão...</p>
        </div>
      </div>
    )
  }

  // TELA DE ACESSO NEGADO SE NÃO FOR GESTOR
  if (!isGestor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
            🔒
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito ao Gestor</h2>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              O seu usuário (<strong className="text-gray-900">{perfilUsuario?.nome}</strong>)
              atualmente possui o papel de <strong>Aluno</strong>. Apenas gestores e professores
              possuem autorização para gerenciar aulas, questionários e visualizar indicadores de
              evasão.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 text-left text-xs text-gray-600 space-y-2 border border-gray-200">
            <p className="font-bold text-gray-800">Como habilitar permissão de gestor no Supabase:</p>
            <p>1. Execute a migração do arquivo <code className="font-mono text-purple-700">supabase/admin_gestao.sql</code> no SQL Editor do Supabase.</p>
            <p>2. Em seguida, execute o comando:</p>
            <pre className="rounded bg-gray-900 p-2 text-[11px] font-mono text-green-400 overflow-x-auto">
              UPDATE public.perfis SET papel = &apos;gestor&apos; WHERE id = &apos;{perfilUsuario?.id}&apos;;
            </pre>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={handlePromoverParaGestorDev}
              className="rounded-xl bg-purple-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-800 transition"
            >
              Tentar Habilitar Acesso Gestor Agora ⚡
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Voltar ao Modo Aluno
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* BARRA SUPERIOR DO GESTOR */}
      <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-lg">
              ⚙️
            </span>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-purple-700 uppercase">
                Painel do Gestor • IFSP Hortolândia
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 leading-tight">
                Gestão do Minicurso de Data Centers
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <span>🎓</span>
              <span className="hidden sm:inline">Visualizar como Aluno</span>
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-red-500 transition"
            >
              Sair
            </button>
          </div>
        </div>

        {/* ABAS DE NAVEGAÇÃO DO GESTOR */}
        <div className="border-t border-gray-100 bg-gray-50/80 px-4 sm:px-8">
          <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto py-2">
            <button
              onClick={() => setAbaAtiva('analytics')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shrink-0 transition ${
                abaAtiva === 'analytics'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span>📊</span>
              <span>Indicadores & Evasão</span>
            </button>

            <button
              onClick={() => setAbaAtiva('aulas')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shrink-0 transition ${
                abaAtiva === 'aulas'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span>📚</span>
              <span>Módulos & Videoaulas</span>
            </button>

            <button
              onClick={() => setAbaAtiva('questionarios')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shrink-0 transition ${
                abaAtiva === 'questionarios'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span>📝</span>
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

