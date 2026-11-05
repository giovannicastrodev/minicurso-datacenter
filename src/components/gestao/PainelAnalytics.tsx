'use client'

import React, { useState, useMemo } from 'react'
import { MetricasGestao } from '../../types/database'
import {
  IconUsers,
  IconRocket,
  IconAward,
  IconAlertCircle,
  IconRefresh,
  IconTrendingDown,
  IconFileText,
  IconCheckCircle,
} from '../ui/Icons'

interface PainelAnalyticsProps {
  metricas: MetricasGestao
  carregando: boolean
  onAtualizar: () => void
}

export default function PainelAnalytics({
  metricas,
  carregando,
  onAtualizar,
}: PainelAnalyticsProps) {
  const [buscaAluno, setBuscaAluno] = useState('')
  const [filtroEvasao, setFiltroEvasao] = useState<'TODOS' | 'INATIVOS' | 'CERTIFICADOS'>('TODOS')

  const alunosFiltrados = useMemo(() => {
    return metricas.alunos_lista.filter((aluno) => {
      if (filtroEvasao === 'INATIVOS' && !aluno.inativo_15_dias) return false
      if (filtroEvasao === 'CERTIFICADOS' && !aluno.certificado) return false

      if (buscaAluno.trim()) {
        const termo = buscaAluno.toLowerCase()
        return (
          aluno.nome.toLowerCase().includes(termo) ||
          aluno.email.toLowerCase().includes(termo)
        )
      }
      return true
    })
  }, [metricas.alunos_lista, filtroEvasao, buscaAluno])

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-xs border-2 border-sky-400 border-t-transparent mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            Calculando métricas da plataforma...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 1. CARDS DE MÉTRICAS PRINCIPAIS (KPIs) COM ARESTAS RETANGULARES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 shadow-sm">
          <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Total de Alunos
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-white">
              {metricas.total_alunos}
            </span>
            <IconUsers className="w-5 h-5 text-sky-400" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">Cadastros na base</p>
        </div>

        <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 shadow-sm">
          <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Iniciaram Trilha
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-sky-400">
              {metricas.alunos_iniciaram}
            </span>
            <IconRocket className="w-5 h-5 text-sky-400" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">
            {metricas.total_alunos > 0
              ? `${Math.round((metricas.alunos_iniciaram / metricas.total_alunos) * 100)}% engajamento`
              : 'Sem dados'}
          </p>
        </div>

        <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 shadow-sm">
          <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Certificados
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-emerald-400">
              {metricas.alunos_certificados}
            </span>
            <IconAward className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">
            {metricas.taxa_conclusao}% de conclusão
          </p>
        </div>

        <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 shadow-sm">
          <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Risco de Evasão
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-amber-400">
              {metricas.alunos_inativos_15_dias}
            </span>
            <IconAlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono">Inativos há &gt; 15 dias</p>
        </div>

        <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 shadow-sm flex flex-col justify-between">
          <p className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
            Ações Rápidas
          </p>
          <button
            onClick={onAtualizar}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-sm bg-[#090b10] border border-zinc-700 hover:border-sky-400 hover:text-sky-300 px-3 py-2 text-xs font-bold text-zinc-200 transition"
          >
            <IconRefresh className="w-3.5 h-3.5 text-sky-400" />
            <span>Atualizar Dados</span>
          </button>
          <p className="mt-1 text-[11px] text-zinc-500 font-mono text-center">Base PostgreSQL</p>
        </div>
      </div>

      {/* 2. RANKING DE QUESTÕES COM MAIOR TAXA DE ERRO */}
      <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-6 shadow-sm">
        <div className="border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <IconTrendingDown className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Diagnóstico de Dificuldade: Questões com Maior Taxa de Erro
            </h3>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Identifique onde os alunos encontram maior barreira conceitual para reforçar nas aulas e materiais.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {metricas.questoes_ranking.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center font-mono">
              Ainda não há dados suficientes de respostas para gerar o ranking de erros.
            </p>
          ) : (
            metricas.questoes_ranking.map((item, idx) => (
              <div key={item.questao_id} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-semibold text-zinc-200 line-clamp-1 max-w-2xl">
                    <strong className="text-sky-400 mr-1.5 font-mono">#{idx + 1}</strong>
                    {item.enunciado}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className="text-zinc-500">[{item.questionario_titulo}]</span>
                    <span className="font-bold text-red-400">
                      {item.taxa_erro}% erro ({item.total_erros}/{item.total_respostas})
                    </span>
                  </div>
                </div>

                {/* Barra percentual */}
                <div className="h-1.5 w-full overflow-hidden rounded-xs bg-[#090b10] border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
                    style={{ width: `${item.taxa_erro}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. DESEMPENHO POR QUESTIONÁRIO */}
      <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-6 shadow-sm">
        <div className="border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <IconFileText className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Desempenho Geral por Avaliação</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Média de aproveitamento e volume de tentativas registradas em cada questionário do curso.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-left text-xs">
            <thead>
              <tr className="bg-[#090b10] text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Questionário</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Tentativas</th>
                <th className="py-3 px-4">Média de Acertos</th>
                <th className="py-3 px-4">Taxa de Aprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {metricas.desempenho_questionarios.map((q) => (
                <tr key={q.questionario_id} className="hover:bg-zinc-800/20">
                  <td className="py-3.5 px-4 font-bold text-white">{q.titulo}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <span
                      className={`rounded-xs px-2 py-0.5 font-bold ${
                        q.tipo === 'FINAL'
                          ? 'bg-sky-950/80 border border-sky-800 text-sky-400'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {q.tipo === 'FINAL' ? 'Avaliação Final' : 'Fixação'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold">{q.total_tentativas} envios</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="font-bold text-sky-400">{q.media_percentual}%</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {q.taxa_aprovacao !== null ? (
                      <span className="rounded-xs bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 font-bold text-emerald-400">
                        {q.taxa_aprovacao}% aprovados
                      </span>
                    ) : (
                      <span className="text-zinc-500">Fixação de conteúdo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MONITORAMENTO DE ALUNOS E GESTÃO DE EVASÃO */}
      <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <IconUsers className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">
                Alunos Matriculados & Monitoramento de Engajamento
              </h3>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Acompanhe o ritmo de estudos e identifique alunos parados há mais de 15 dias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroEvasao}
              onChange={(e) => setFiltroEvasao(e.target.value as any)}
              className="rounded-sm border border-zinc-700 bg-[#090b10] px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-xs focus:border-sky-400 focus:outline-none"
            >
              <option value="TODOS">Todos os alunos</option>
              <option value="INATIVOS">Risco de Evasão (&gt; 15 dias)</option>
              <option value="CERTIFICADOS">Alunos Certificados</option>
            </select>

            <input
              type="text"
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              placeholder="Buscar aluno por nome ou e-mail..."
              className="w-full sm:w-60 rounded-sm border border-zinc-700 bg-[#090b10] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 shadow-xs focus:border-sky-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-left text-xs">
            <thead>
              <tr className="bg-[#090b10] text-zinc-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Aluno</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Data de Cadastro</th>
                <th className="py-3 px-4">Tentativas</th>
                <th className="py-3 px-4">Última Atividade</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {alunosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-zinc-500 font-mono">
                    Nenhum aluno encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                alunosFiltrados.map((aluno) => {
                  const dataCad = new Date(aluno.criado_em).toLocaleDateString('pt-BR')
                  const dataUltimo = aluno.ultimo_acesso
                    ? new Date(aluno.ultimo_acesso).toLocaleDateString('pt-BR')
                    : 'Sem envios'

                  return (
                    <tr key={aluno.id} className="hover:bg-zinc-800/20">
                      <td className="py-3.5 px-4 font-bold text-white">{aluno.nome}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400">
                        {aluno.email}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{dataCad}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">{aluno.total_tentativas} atividades</td>
                      <td className="py-3.5 px-4 font-mono">{dataUltimo}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {aluno.certificado ? (
                          <span className="rounded-xs bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 font-bold text-emerald-400">
                            CERTIFICADO
                          </span>
                        ) : aluno.inativo_15_dias ? (
                          <span className="rounded-xs bg-amber-950/60 border border-amber-800 px-2.5 py-0.5 font-bold text-amber-400">
                            INATIVO &gt; 15D
                          </span>
                        ) : (
                          <span className="rounded-xs bg-sky-950/60 border border-sky-800 px-2.5 py-0.5 font-bold text-sky-400">
                            CURSANDO
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
