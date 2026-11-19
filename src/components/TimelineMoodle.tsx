'use client'

import React, { useState, useMemo } from 'react'
import { Aula, Questionario, Tentativa } from '../types/database'
import { calcularProgresso } from '../lib/progressoCurso'
import {
  IconFileText,
  IconLock,
  IconCheckCircle,
  IconGraduationCap,
  IconSearch,
  IconArrowRight,
  IconAlertCircle,
} from './ui/Icons'

interface TimelineMoodleProps {
  aulas: Aula[]
  avaliacaoFinal: Questionario | null
  tentativas: Tentativa[]
  materiaisLidos: string[]
  onAcessarAula: (aulaId: string) => void
  onAbrirQuestionario: (questionario: Questionario) => void
  onReiniciarCurso?: () => void
}

type FiltroStatus = 'TODOS' | 'PENDENTES' | 'CONCLUIDOS'

interface ItemTimeline {
  id: string
  tipo: 'AULA' | 'FIXACAO' | 'FINAL'
  titulo: string
  modulo: string
  descricao: string
  liberada: boolean
  concluida: boolean
  esgotada: boolean
  acaoLabel: string
  onAcao: () => void
}

export default function TimelineMoodle({
  aulas,
  avaliacaoFinal,
  tentativas,
  materiaisLidos,
  onAcessarAula,
  onAbrirQuestionario,
  onReiniciarCurso,
}: TimelineMoodleProps) {
  const [filtro, setFiltro] = useState<FiltroStatus>('TODOS')
  const [busca, setBusca] = useState('')

  // Regras de progresso centralizadas em lib/progressoCurso.ts
  const progresso = useMemo(
    () => calcularProgresso({ aulas, avaliacaoFinal, tentativas, materiaisLidos }),
    [aulas, avaliacaoFinal, tentativas, materiaisLidos]
  )

  const itensTimeline = useMemo(() => {
    const itens: ItemTimeline[] = []

    for (const m of progresso.modulos) {
      const { aula, qFixacao } = m

      // 1. Item dos Slides do Módulo
      itens.push({
        id: `aula-${aula.id}`,
        tipo: 'AULA',
        titulo: `Módulo ${aula.ordem}: ${aula.titulo}`,
        modulo: `Etapa Teórica • Módulo ${aula.ordem}`,
        descricao: 'Leitura interativa dos slides técnicos da apresentação (formato 16:9).',
        liberada: m.liberada,
        concluida: m.todosMateriaisLidos,
        esgotada: false,
        acaoLabel: m.todosMateriaisLidos
          ? 'Rever Slides'
          : m.liberada
          ? 'Acessar Módulo'
          : 'Bloqueado',
        onAcao: () => {
          if (!m.liberada) return
          onAcessarAula(aula.id)
        },
      })

      // 2. Item da Atividade de Fixação
      if (qFixacao) {
        const fixacaoLiberada = m.liberada && m.todosMateriaisLidos && !m.esgotouFixacao

        let descricao = 'Responda as questões para validar seu conhecimento e avançar na trilha.'
        if (!m.todosMateriaisLidos) {
          descricao = 'Requer leitura prévia dos slides do módulo para desbloquear.'
        } else if (m.esgotouFixacao) {
          descricao =
            'Tentativas esgotadas (2/2). É obrigatório reler os slides do módulo para liberar novo envio.'
        } else if (m.tentativaAprovadaFix) {
          const t = m.tentativaAprovadaFix
          descricao = `Aprovado com ${t.acertos}/${t.total_questoes} acertos (${t.percentual}%).`
        }

        itens.push({
          id: `fixacao-${qFixacao.id}`,
          tipo: 'FIXACAO',
          titulo: qFixacao.titulo,
          modulo: `Atividade Avaliativa • Módulo ${aula.ordem}`,
          descricao,
          liberada: fixacaoLiberada,
          concluida: m.fixacaoAprovada,
          esgotada: m.esgotouFixacao,
          acaoLabel: m.esgotouFixacao
            ? 'Reler Slides'
            : !fixacaoLiberada
            ? 'Bloqueado'
            : m.fixacaoAprovada
            ? 'Refazer Atividade'
            : 'Responder Atividade',
          onAcao: () => {
            if (m.esgotouFixacao) {
              onAcessarAula(aula.id)
              return
            }
            if (!fixacaoLiberada) return
            onAbrirQuestionario(qFixacao)
          },
        })
      }
    }

    // 3. Item da Avaliação Final de Certificação
    const final = progresso.final
    if (avaliacaoFinal && final) {
      let descricaoFinal =
        'Avaliação abrangente de 5 questões. Exige mínimo de 70% de acertos para emissão de Certificado (máximo de 2 tentativas).'

      if (final.esgotou) {
        descricaoFinal =
          'Limite de 2 tentativas esgotado sem atingir 70%. Conforme o regulamento institucional, é obrigatório reiniciar a trilha de estudos.'
      } else if (!final.todosModulosConcluidos) {
        descricaoFinal =
          'Bloqueado. Requer a conclusão de todos os módulos (leitura dos slides e atividades de fixação aprovadas).'
      } else if (final.tentativaAprovada) {
        descricaoFinal = `Aprovado com ${final.tentativaAprovada.percentual}% de aproveitamento. Certificado emitido com sucesso!`
      } else if (final.total === 1 && final.ultima) {
        descricaoFinal = `Tentativa 1 realizada (${final.ultima.percentual}% de acertos). Você possui 1 tentativa restante.`
      }

      // Rótulo da Ação da Prova Final de acordo com o estado do curso
      let acaoLabelFinal = 'Bloqueado'
      if (final.esgotou) {
        acaoLabelFinal = 'Reiniciar Curso'
      } else if (!final.todosModulosConcluidos) {
        acaoLabelFinal = 'Bloqueado'
      } else if (final.aprovado) {
        acaoLabelFinal = 'Visualizar / Refazer Prova'
      } else if (final.total === 1) {
        acaoLabelFinal = 'Tentar Novamente (2ª Tentativa)'
      } else {
        acaoLabelFinal = 'Iniciar Avaliação Final'
      }

      itens.push({
        id: `final-${avaliacaoFinal.id}`,
        tipo: 'FINAL',
        titulo: avaliacaoFinal.titulo,
        modulo: 'Etapa Final de Certificação IFSP',
        descricao: descricaoFinal,
        liberada: final.liberada,
        concluida: final.aprovado,
        esgotada: final.esgotou,
        acaoLabel: acaoLabelFinal,
        onAcao: () => {
          // Esgotou as 2 tentativas: a ÚNICA ação possível é reiniciar
          if (final.esgotou) {
            onReiniciarCurso?.()
            return
          }
          // Módulos pendentes: nada acontece
          if (!final.liberada) return
          onAbrirQuestionario(avaliacaoFinal)
        },
      })
    }

    return itens
  }, [progresso, avaliacaoFinal, onAcessarAula, onAbrirQuestionario, onReiniciarCurso])

  // Filtros
  const itensFiltrados = useMemo(() => {
    return itensTimeline.filter((item) => {
      if (filtro === 'CONCLUIDOS' && !item.concluida) return false
      if (filtro === 'PENDENTES' && item.concluida) return false

      if (busca.trim()) {
        const termo = busca.toLowerCase()
        return (
          item.titulo.toLowerCase().includes(termo) ||
          item.modulo.toLowerCase().includes(termo) ||
          item.descricao.toLowerCase().includes(termo)
        )
      }

      return true
    })
  }, [itensTimeline, filtro, busca])

  const totalItens = itensTimeline.length
  const concluidos = itensTimeline.filter((i) => i.concluida).length
  const progressoPercent = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0

  return (
    <div className="space-y-6">
      {/* BARRA DE PROGRESSO TÉCNICO AZURE */}
      <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-xs bg-sky-400"></span>
              <h2 className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
                Progresso na Trilha Técnica
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {concluidos} de {totalItens} etapas obrigatórias concluídas com aproveitamento
            </p>
          </div>
          <span className="text-3xl font-extrabold text-sky-400 font-mono">{progressoPercent}%</span>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-xs bg-[#090b10] border border-zinc-800">
          <div
            className="h-full bg-sky-500 transition-all duration-500 shadow-sm shadow-sky-500/50"
            style={{ width: `${progressoPercent}%` }}
          />
        </div>
      </div>

      {/* PAINEL TIMELINE COM ARESTAS RETANGULARES */}
      <div className="rounded-sm border border-zinc-800 bg-[#11141c] shadow-xl overflow-hidden">
        {/* Cabeçalho de Filtros */}
        <div className="border-b border-zinc-800 bg-[#0d1017] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
                Sequência Pedagógica
              </span>
              <h3 className="text-lg font-bold text-white">Linha do Tempo de Atividades</h3>
              <p className="text-xs text-zinc-400">
                Siga a ordem sequencial dos módulos para liberar as avaliações.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as FiltroStatus)}
                className="rounded-sm border border-zinc-700 bg-[#090b10] px-3.5 py-2 text-xs font-bold text-zinc-200 shadow-xs focus:border-sky-400 focus:outline-none"
              >
                <option value="TODOS">Todas as atividades</option>
                <option value="PENDENTES">Apenas pendentes</option>
                <option value="CONCLUIDOS">Apenas concluídas</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar módulo ou atividade..."
                  className="w-full sm:w-64 rounded-sm border border-zinc-700 bg-[#090b10] px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 shadow-xs focus:border-sky-400 focus:outline-none pl-8"
                />
                <IconSearch className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Atividades */}
        <div className="divide-y divide-zinc-800">
          {itensFiltrados.length === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-500">
              Nenhuma atividade localizada com os filtros aplicados.
            </div>
          ) : (
            itensFiltrados.map((item) => {
              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 transition ${
                    !item.liberada && !item.esgotada
                      ? 'bg-[#0a0c12]/60 opacity-50'
                      : item.esgotada
                      ? 'bg-red-950/20 border-l-4 border-red-500'
                      : 'hover:bg-zinc-800/30 bg-[#11141c]'
                  }`}
                >
                  {/* Lado Esquerdo: Ícone + Título + Status */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border ${
                        item.concluida
                          ? 'border-emerald-800/60 bg-emerald-950/50 text-emerald-400'
                          : item.esgotada
                          ? 'border-red-800/60 bg-red-950/50 text-red-400'
                          : item.liberada
                          ? 'border-sky-800/60 bg-sky-950/40 text-sky-400'
                          : 'border-zinc-800 bg-[#090b10] text-zinc-600'
                      }`}
                    >
                      {item.tipo === 'AULA' && <IconFileText className="w-5 h-5" />}
                      {item.tipo === 'FIXACAO' && <IconFileText className="w-5 h-5" />}
                      {item.tipo === 'FINAL' && <IconGraduationCap className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.liberada || item.esgotada ? (
                          <button
                            onClick={item.onAcao}
                            className="text-left text-sm font-bold text-zinc-100 hover:text-sky-400 transition"
                          >
                            {item.titulo}
                          </button>
                        ) : (
                          <span className="text-sm font-bold text-zinc-500">{item.titulo}</span>
                        )}

                        {/* Badges Técnicos com Arestas Vivas */}
                        {item.concluida ? (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-400">
                            <IconCheckCircle className="w-3 h-3" />
                            <span>CONCLUÍDO</span>
                          </span>
                        ) : item.esgotada ? (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-red-950/60 border border-red-800 px-2 py-0.5 text-[11px] font-mono font-bold text-red-400">
                            <IconAlertCircle className="w-3 h-3" />
                            <span>ESGOTADO</span>
                          </span>
                        ) : item.liberada ? (
                          <span className="rounded-xs bg-sky-950/50 border border-sky-800/70 px-2 py-0.5 text-[11px] font-mono font-bold text-sky-300">
                            DISPONÍVEL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-[#090b10] border border-zinc-800 px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-500">
                            <IconLock className="w-3 h-3" />
                            <span>BLOQUEADO</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 font-mono">
                        <strong className="text-zinc-300">{item.modulo}</strong> • Minicurso IFSP / Microsoft
                      </p>

                      <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                        {item.descricao}
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: Botão de Ação Retangular */}
                  <div className="shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={!item.liberada && !item.esgotada}
                      onClick={item.onAcao}
                      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-xs font-bold transition shadow-sm ${
                        item.esgotada
                          ? 'border border-red-700 bg-red-600 text-white hover:bg-red-700'
                          : !item.liberada
                          ? 'border border-zinc-800 bg-[#090b10] text-zinc-600 cursor-not-allowed'
                          : item.concluida
                          ? 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                          : 'bg-sky-500 text-zinc-950 hover:bg-sky-400'
                      }`}
                    >
                      <span>{item.acaoLabel}</span>
                      {item.liberada && <IconArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
