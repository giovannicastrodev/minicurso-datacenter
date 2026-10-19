'use client'

import React, { useState, useMemo } from 'react'
import { MetricasGestao } from '../../types/database'

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
        <div className="text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-xs font-semibold text-gray-500">Calculando indicadores em tempo real...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 1. CARDS DE MÉTRICAS PRINCIPAIS (KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Alunos</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900">{metricas.total_alunos}</span>
            <span className="text-lg">👥</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Cadastros realizados</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Iniciaram o Curso</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-indigo-600">{metricas.alunos_iniciaram}</span>
            <span className="text-lg">🚀</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {metricas.total_alunos > 0
              ? `${Math.round((metricas.alunos_iniciaram / metricas.total_alunos) * 100)}% de engajamento`
              : 'Sem dados'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Certificados Emitidos</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-green-600">{metricas.alunos_certificados}</span>
            <span className="text-lg">🎓</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{metricas.taxa_conclusao}% taxa de conclusão</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Risco de Evasão</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-600">
              {metricas.alunos_inativos_15_dias}
            </span>
            <span className="text-lg">⚠️</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Inativos há &gt; 15 dias</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ações de Gestão</p>
          <button
            onClick={onAtualizar}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 px-3 py-2 text-xs font-bold text-gray-800 transition"
          >
            <span>🔄</span>
            <span>Atualizar Métricas</span>
          </button>
          <p className="mt-1 text-[11px] text-gray-400 text-center">Dados consolidados do banco</p>
        </div>
      </div>

      {/* 2. RANKING DE QUESTÕES COM MAIOR TAXA DE ERRO (Gargalos Pedagógicos) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📉</span>
            <h3 className="text-lg font-bold text-gray-900">
              Diagnóstico de Dificuldade: Questões com Maior Taxa de Erro
            </h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Identifique onde os alunos encontram maior barreira conceitual para reforçar nas aulas e materiais.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {metricas.questoes_ranking.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              Ainda não há dados suficientes de respostas para gerar o ranking de erros.
            </p>
          ) : (
            metricas.questoes_ranking.map((item, idx) => (
              <div key={item.questao_id} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-semibold text-gray-800 line-clamp-1 max-w-2xl">
                    <strong className="text-indigo-600 mr-1.5">#{idx + 1}</strong>
                    {item.enunciado}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-400 text-[11px]">[{item.questionario_titulo}]</span>
                    <span className="font-bold text-red-600">
                      {item.taxa_erro}% erro ({item.total_erros}/{item.total_respostas})
                    </span>
                  </div>
                </div>

                {/* Barra percentual */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-500"
                    style={{ width: `${item.taxa_erro}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. DESEMPENHO POR QUESTIONÁRIO */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-bold text-gray-900">Desempenho Geral por Avaliação</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Média de aproveitamento e volume de tentativas registradas em cada questionário do curso.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 text-gray-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Questionário</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Total de Tentativas</th>
                <th className="py-3 px-4">Média de Acertos</th>
                <th className="py-3 px-4">Taxa de Aprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {metricas.desempenho_questionarios.map((q) => (
                <tr key={q.questionario_id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{q.titulo}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        q.tipo === 'FINAL'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {q.tipo === 'FINAL' ? 'Avaliação Final' : 'Fixação'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold">{q.total_tentativas} envios</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-indigo-700">{q.media_percentual}%</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {q.taxa_aprovacao !== null ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-bold text-green-800">
                        {q.taxa_aprovacao}% aprovados
                      </span>
                    ) : (
                      <span className="text-gray-400">Fixação de conteúdo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MONITORAMENTO DE ALUNOS E GESTÃO DE EVASÃO */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <h3 className="text-lg font-bold text-gray-900">
                Alunos Matriculados & Monitoramento de Engajamento
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Acompanhe o ritmo de estudos e identifique alunos parados há mais de 15 dias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroEvasao}
              onChange={(e) => setFiltroEvasao(e.target.value as any)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none"
            >
              <option value="TODOS">Todos os alunos</option>
              <option value="INATIVOS">⚠️ Risco de Evasão (&gt; 15 dias)</option>
              <option value="CERTIFICADOS">🎓 Alunos Certificados</option>
            </select>

            <input
              type="text"
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              placeholder="Buscar aluno por nome ou e-mail..."
              className="w-full sm:w-60 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 shadow-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 text-gray-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Aluno</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Data de Cadastro</th>
                <th className="py-3 px-4">Tentativas Realizadas</th>
                <th className="py-3 px-4">Última Atividade</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {alunosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-400">
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
                    <tr key={aluno.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{aluno.nome}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                        {aluno.email}
                      </td>
                      <td className="py-3.5 px-4">{dataCad}</td>
                      <td className="py-3.5 px-4 font-semibold">{aluno.total_tentativas} atividades</td>
                      <td className="py-3.5 px-4">{dataUltimo}</td>
                      <td className="py-3.5 px-4">
                        {aluno.certificado ? (
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
                            Certificado 🎓
                          </span>
                        ) : aluno.inativo_15_dias ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            Inativo &gt; 15d ⚠️
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                            Cursando
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

