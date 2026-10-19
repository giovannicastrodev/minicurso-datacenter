'use client'

import React, { useState, useMemo } from 'react'
import { Aula, Questionario, Tentativa } from '../types/database'
import {
  IconFileText,
  IconLock,
  IconCheckCircle,
  IconGraduationCap,
  IconSearch,
  IconRefresh,
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

  // Mapas de tentativas para lookup rápido
  const mapaTentativas = useMemo(() => {
    const mapa = new Map<string, Tentativa[]>()
    tentativas.forEach((t) => {
      const lista = mapa.get(t.questionario_id) || []
      lista.push(t)
      mapa.set(t.questionario_id, lista)
    })
    return mapa
  }, [tentativas])

  const itensTimeline = useMemo(() => {
    const itens = []
    let moduloAnteriorConcluido = true

    for (const aula of aulas.sort((a, b) => a.ordem - b.ordem)) {
      const qFixacao = Array.isArray(aula.questionarios)
        ? aula.questionarios[0]
        : (aula.questionarios as unknown as Questionario)

      const listaTentativasFix = qFixacao ? mapaTentativas.get(qFixacao.id) || [] : []
      const ultimaTentativaFix = listaTentativasFix[0] || null
      const tentativaAprovadaFix = listaTentativasFix.find(
        (tentativa) => tentativa.aprovado === true || tentativa.percentual >= 50
      )
      const totalTentativasFix = listaTentativasFix.length

      const fixacaoAprovada = !!tentativaAprovadaFix
      const esgotouFixacao = totalTentativasFix >= 2 && !fixacaoAprovada

      const materiaisAula = aula.materiais || []
      const todosMateriaisLidos =
        materiaisAula.length === 0 ||
        materiaisAula.every((m) => materiaisLidos.includes(m.id))

      const aulaLiberada = moduloAnteriorConcluido

      // 1. Item dos Slides do Módulo
      itens.push({
        id: `aula-${aula.id}`,
        tipo: 'AULA' as const,
        titulo: `Módulo ${aula.ordem}: ${aula.titulo}`,
        modulo: `Etapa Teórica • Módulo ${aula.ordem}`,
        descricao: 'Leitura interativa dos slides técnicos da apresentação (formato 16:9).',
        liberada: aulaLiberada,
        concluida: todosMateriaisLidos && fixacaoAprovada,
        esgotada: false,
        acaoLabel: aulaLiberada ? 'Acessar Módulo' : 'Bloqueado',
        onAcao: () => onAcessarAula(aula.id),
      })

      // 2. Item da Atividade de Fixação
      if (qFixacao) {
        const fixacaoLiberada = aulaLiberada && todosMateriaisLidos && !esgotouFixacao

        let descricao = 'Responda as questões para validar seu conhecimento e avançar na trilha.'
        if (!todosMateriaisLidos) {
          descricao = 'Requer leitura prévia dos slides do módulo para desbloquear.'
        } else if (esgotouFixacao) {
          descricao = 'Tentativas esgotadas (2/2). É obrigatório reler os slides do módulo para liberar novo envio.'
        } else if (fixacaoAprovada) {
          descricao = `Aprovado com ${tentativaAprovadaFix.acertos}/${tentativaAprovadaFix.total_questoes} acertos (${tentativaAprovadaFix.percentual}%).`
        }

        itens.push({
          id: `fixacao-${qFixacao.id}`,
          tipo: 'FIXACAO' as const,
          titulo: qFixacao.titulo,
          modulo: `Atividade Avaliativa • Módulo ${aula.ordem}`,
          descricao,
          liberada: fixacaoLiberada,
          concluida: fixacaoAprovada,
          esgotada: esgotouFixacao,
          tentativa: ultimaTentativaFix,
          totalTentativas: totalTentativasFix,
          acaoLabel: esgotouFixacao
            ? 'Reler Slides'
            : !fixacaoLiberada
            ? 'Bloqueado'
            : fixacaoAprovada
            ? 'Refazer Atividade'
            : 'Responder Atividade',
          onAcao: () => {
            if (esgotouFixacao) {
              onAcessarAula(aula.id)
            } else {
              onAbrirQuestionario(qFixacao)
            }
          },
        })
      }

      moduloAnteriorConcluido = fixacaoAprovada
    }

    // 3. Item da Avaliação Final de Certificação
    if (avaliacaoFinal) {
      const todosModulosConcluidos = moduloAnteriorConcluido
      const listaTentativasFinal = mapaTentativas.get(avaliacaoFinal.id) || []
      const ultimaTentativaFinal = listaTentativasFinal[0] || null
      const totalTentativasFinal = listaTentativasFinal.length

      const tentativaAprovadaFinal = listaTentativasFinal.find(
        (tentativa) => tentativa.aprovado === true || tentativa.percentual >= 70
      )
      const aprovadoFinal = !!tentativaAprovadaFinal
      const esgotouFinal = totalTentativasFinal >= 2 && !aprovadoFinal

      let descricaoFinal = 'Avaliação abrangente de 5 questões. Exige mínimo de 70% de acertos para emissão de Certificado (máximo de 2 tentativas).'
      if (!todosModulosConcluidos) {
        descricaoFinal = 'Bloqueado. Requer conclusão das atividades de fixação de todos os módulos anteriores.'
      } else if (esgotouFinal) {
        descricaoFinal = 'Limite de 2 tentativas esgotado sem atingir 70%. Conforme o regulamento, é obrigatório reiniciar a trilha de estudos.'
      } else if (aprovadoFinal) {
        descricaoFinal = `Aprovado com ${tentativaAprovadaFinal.percentual}% de aproveitamento. Certificado emitido com sucesso!`
      } else if (totalTentativasFinal === 1) {
        descricaoFinal = `Tentativa 1 com ${ultimaTentativaFinal.percentual}%. Você possui 1 tentativa restante.`
      }

      itens.push({
        id: `final-${avaliacaoFinal.id}`,
        tipo: 'FINAL' as const,
        titulo: avaliacaoFinal.titulo,
        modulo: 'Etapa Final de Certificação IFSP',
        descricao: descricaoFinal,
        liberada: todosModulosConcluidos && !esgotouFinal,
        concluida: aprovadoFinal,
        esgotada: esgotouFinal,
        tentativa: ultimaTentativaFinal,
        totalTentativas: totalTentativasFinal,
        acaoLabel: esgotouFinal
          ? 'Reiniciar Curso'
          : !todosModulosConcluidos
          ? 'Bloqueado'
          : aprovadoFinal
          ? 'Visualizar / Refazer Prova'
          : 'Iniciar Prova Final',
        onAcao: () => {
          if (esgotouFinal && onReiniciarCurso) {
            onReiniciarCurso()
          } else {
            onAbrirQuestionario(avaliacaoFinal)
          }
        },
      })
    }

    return itens
  }, [
    aulas,
    avaliacaoFinal,
    mapaTentativas,
    materiaisLidos,
    onAcessarAula,
    onAbrirQuestionario,
    onReiniciarCurso,
  ])

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
      {/* BARRA DE PROGRESSO INSTITUCIONAL SUAP / FIAP */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600"></span>
              <h2 className="text-base font-extrabold text-zinc-100 uppercase tracking-wider">
                Progresso na Trilha Técnica
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {concluidos} de {totalItens} etapas obrigatórias concluídas com aproveitamento
            </p>
          </div>
          <span className="text-3xl font-extrabold text-red-500 font-mono">{progressoPercent}%</span>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-red-600 transition-all duration-500 shadow-sm shadow-red-500/50"
            style={{ width: `${progressoPercent}%` }}
          />
        </div>
      </div>

      {/* PAINEL TIMELINE ESTILO MOODLE / SUAP */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden">
        {/* Cabeçalho de Filtros */}
        <div className="border-b border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Linha do Tempo de Atividades</h3>
              <p className="text-xs text-zinc-400">
                Siga a ordem sequencial dos módulos para liberar as avaliações.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as FiltroStatus)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-200 shadow-xs focus:border-red-500 focus:outline-none"
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
                  placeholder="Buscar por módulo ou atividade..."
                  className="w-full sm:w-64 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 shadow-xs focus:border-red-500 focus:outline-none pl-8"
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
                      ? 'bg-zinc-950/40 opacity-50'
                      : item.esgotada
                      ? 'bg-red-950/15 border-l-4 border-red-600'
                      : 'hover:bg-zinc-800/40 bg-zinc-900'
                  }`}
                >
                  {/* Lado Esquerdo: Ícone + Título + Status */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        item.concluida
                          ? 'border-emerald-800/60 bg-emerald-950/50 text-emerald-400'
                          : item.esgotada
                          ? 'border-red-800/60 bg-red-950/50 text-red-400'
                          : item.liberada
                          ? 'border-red-800/60 bg-red-950/40 text-red-500'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-600'
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
                            className="text-left text-sm font-bold text-zinc-100 hover:text-red-500 transition"
                          >
                            {item.titulo}
                          </button>
                        ) : (
                          <span className="text-sm font-bold text-zinc-500">{item.titulo}</span>
                        )}

                        {/* Badges de Status Sem Emojis */}
                        {item.concluida ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                            <IconCheckCircle className="w-3 h-3" />
                            <span>Concluído</span>
                          </span>
                        ) : item.esgotada ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 border border-red-800 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
                            <IconAlertCircle className="w-3 h-3" />
                            <span>Tentativas Esgotadas</span>
                          </span>
                        ) : item.liberada ? (
                          <span className="rounded-full bg-red-950/40 border border-red-900/60 px-2.5 py-0.5 text-[11px] font-bold text-red-400">
                            Disponível
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-bold text-zinc-500">
                            <IconLock className="w-3 h-3" />
                            <span>Bloqueado</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400">
                        <strong className="text-zinc-300">{item.modulo}</strong> • Minicurso IFSP / Microsoft
                      </p>

                      <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                        {item.descricao}
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: Botão de Ação */}
                  <div className="shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={!item.liberada && !item.esgotada}
                      onClick={item.onAcao}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                        item.esgotada
                          ? 'border border-red-700 bg-red-600 text-white hover:bg-red-700'
                          : !item.liberada
                          ? 'border border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed'
                          : item.concluida
                          ? 'border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
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
