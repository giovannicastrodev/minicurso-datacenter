'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Questionario, ResultadoTentativa, Tentativa } from '../types/database'
import { supabase } from '../lib/supabase'
import {
  IconArrowLeft,
  IconClock,
  IconAlertCircle,
  IconCheckCircle,
  IconLock,
  IconGraduationCap,
  IconRefresh,
} from './ui/Icons'

interface ModalQuestionarioProps {
  questionario: Questionario
  isOpen: boolean
  onClose: () => void
  onSuccess: (resultado: ResultadoTentativa) => void
  tentativasAnteriores: Tentativa[]
  aulaId?: string
  onExigirReleitura?: (aulaId: string) => void
  onReiniciarCurso?: () => void
  onAbrirCertificado?: () => void
}

const TEMPO_PROVA_FINAL_MINUTOS = 50
const MAX_TENTATIVAS = 2

export default function ModalQuestionario({
  questionario,
  isOpen,
  onClose,
  onSuccess,
  tentativasAnteriores,
  aulaId,
  onExigirReleitura,
  onReiniciarCurso,
  onAbrirCertificado,
}: ModalQuestionarioProps) {
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<ResultadoTentativa | null>(null)
  const [infoSubmissao, setInfoSubmissao] = useState<{
    numeroTentativa: number
    esgotou: boolean
  } | null>(null)
  const [tentativasNaSessao, setTentativasNaSessao] = useState<number>(0)
  const [tempoRestanteSegundos, setTempoRestanteSegundos] = useState<number>(
    TEMPO_PROVA_FINAL_MINUTOS * 60
  )
  const [tempoEsgotado, setTempoEsgotado] = useState(false)

  const isProvaFinal = questionario.tipo === 'FINAL'

  // Contagem estrita de tentativas para este questionário
  const listaTentativas = useMemo(() => {
    return tentativasAnteriores.filter((t) => t.questionario_id === questionario.id)
  }, [tentativasAnteriores, questionario.id])

  const tentativasFeitas = listaTentativas.length
  const jaAprovadoAnteriormente = listaTentativas.some((t) => t.aprovado)

  // Bloqueio prévio caso já tenha estourado o limite sem passar
  const bloqueioEsgotado = tentativasFeitas >= MAX_TENTATIVAS && !jaAprovadoAnteriormente

  // Reinicia o estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setRespostas({})
      setResultado(null)
      setInfoSubmissao(null)
      setTentativasNaSessao(0)
      setErro('')
      setTempoEsgotado(false)
      setTempoRestanteSegundos(TEMPO_PROVA_FINAL_MINUTOS * 60)
    }
  }, [isOpen, questionario.id])

  // Timer decrescente de 50 minutos para a prova final
  useEffect(() => {
    if (!isOpen || !isProvaFinal || resultado || tempoEsgotado || bloqueioEsgotado) return

    const intervalo = setInterval(() => {
      setTempoRestanteSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(intervalo)
          setTempoEsgotado(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalo)
  }, [isOpen, isProvaFinal, resultado, tempoEsgotado, bloqueioEsgotado])

  const tempoFormatado = useMemo(() => {
    const minutos = Math.floor(tempoRestanteSegundos / 60)
    const segundos = tempoRestanteSegundos % 60
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
  }, [tempoRestanteSegundos])

  const totalQuestoes = questionario.questoes.length
  const respondidas = Object.keys(respostas).length
  const percentualProgresso = totalQuestoes > 0 ? Math.round((respondidas / totalQuestoes) * 100) : 0

  const handleSelectAlternativa = (questaoId: string, alternativaId: string) => {
    if (tempoEsgotado) return
    setRespostas((prev) => ({
      ...prev,
      [questaoId]: alternativaId,
    }))
  }

  const handleEnviar = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      setErro('')

      if (respondidas < totalQuestoes && !tempoEsgotado) {
        setErro(
          `Preenchimento obrigatório: restam ${totalQuestoes - respondidas} questão(ões) não respondida(s).`
        )
        return
      }

      setEnviando(true)

      const payloadRespostas = Object.entries(respostas).map(([questao_id, alternativa_id]) => ({
        questao_id,
        alternativa_id,
      }))

      const { data, error } = await supabase.rpc('enviar_tentativa', {
        p_questionario_id: questionario.id,
        p_respostas: payloadRespostas,
      })

      setEnviando(false)

      if (error) {
        setErro(`Erro ao submeter: ${error.message}`)
        return
      }

      const res = data as ResultadoTentativa
      setResultado(res)

      // Regra de contagem estrita de tentativas para esta sessão:
      const tentativaNumero = Math.max(tentativasFeitas, tentativasNaSessao) + 1
      const aprovado = isProvaFinal ? res.percentual >= 70 : res.percentual >= 50
      const esgotou = !aprovado && tentativaNumero >= MAX_TENTATIVAS

      setInfoSubmissao({
        numeroTentativa: tentativaNumero,
        esgotou,
      })
      setTentativasNaSessao(tentativaNumero)

      onSuccess(res)

      if (esgotou && !isProvaFinal && aulaId && onExigirReleitura) {
        onExigirReleitura(aulaId)
      }
    },
    [
      respondidas,
      totalQuestoes,
      tempoEsgotado,
      respostas,
      questionario.id,
      isProvaFinal,
      tentativasFeitas,
      tentativasNaSessao,
      aulaId,
      onExigirReleitura,
      onSuccess,
    ]
  )

  useEffect(() => {
    if (tempoEsgotado && !resultado && !enviando && !bloqueioEsgotado) {
      handleEnviar()
    }
  }, [tempoEsgotado, resultado, enviando, bloqueioEsgotado, handleEnviar])

  const handleTentarNovamente = () => {
    setRespostas({})
    setResultado(null)
    setInfoSubmissao(null)
    setErro('')
    setTempoEsgotado(false)
    setTempoRestanteSegundos(TEMPO_PROVA_FINAL_MINUTOS * 60)
  }

  const handleConfirmarVoltar = () => {
    if (respondidas > 0 && !resultado && !bloqueioEsgotado) {
      const confirmou = window.confirm(
        'Você já preencheu algumas questões. Deseja realmente sair? As respostas não enviadas serão descartadas.'
      )
      if (!confirmou) return
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#090b10] text-zinc-100 overflow-y-auto">
      {/* BARRA SUPERIOR EM TELA INTEIRA */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between border-b border-zinc-800 bg-[#0d1017] px-4 py-3 shadow-md sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirmarVoltar}
            className="flex items-center gap-1.5 rounded-sm border border-zinc-700 bg-[#11141c] px-3.5 py-1.5 text-xs font-bold text-zinc-300 hover:border-sky-400 hover:text-white transition"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Voltar ao Curso</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-xs px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                  isProvaFinal
                    ? 'bg-sky-950/80 border border-sky-800 text-sky-400'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                }`}
              >
                {isProvaFinal ? 'Avaliação Final de Certificação' : 'Atividade de Fixação'}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Tentativa {Math.min(Math.max(tentativasFeitas, tentativasNaSessao) + 1, MAX_TENTATIVAS)} de {MAX_TENTATIVAS}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white line-clamp-1">
              {questionario.titulo}
            </h1>
          </div>
        </div>

        {/* LADO DIREITO: TIMER E PROGRESSO */}
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          {isProvaFinal && !resultado && !bloqueioEsgotado && (
            <div
              className={`flex items-center gap-2 rounded-sm border px-3.5 py-1.5 font-mono text-xs sm:text-sm font-bold ${
                tempoRestanteSegundos <= 300
                  ? 'border-red-600 bg-red-950/80 text-red-400 animate-pulse'
                  : tempoRestanteSegundos <= 600
                  ? 'border-amber-600 bg-amber-950/80 text-amber-400'
                  : 'border-zinc-800 bg-[#11141c] text-zinc-300'
              }`}
            >
              <IconClock className="w-4 h-4 text-sky-400" />
              <span>{tempoFormatado}</span>
              <span className="text-[11px] font-mono text-zinc-400 hidden md:inline">
                restantes
              </span>
            </div>
          )}

          {!resultado && !bloqueioEsgotado && (
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-sky-400">
                {respondidas} de {totalQuestoes}
              </span>
              <span className="text-xs text-zinc-400 hidden sm:inline"> respondidas</span>
            </div>
          )}
        </div>
      </header>

      {/* BARRA DE PROGRESSO DE RESPOSTAS */}
      {!resultado && !bloqueioEsgotado && (
        <div className="sticky top-[57px] sm:top-[61px] z-10 h-1.5 w-full bg-zinc-900">
          <div
            className="h-full bg-sky-500 transition-all duration-300 shadow-sm shadow-sky-500/50"
            style={{ width: `${percentualProgresso}%` }}
          />
        </div>
      )}

      {/* ÁREA CENTRAL */}
      <main className="mx-auto flex-1 w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* BLOQUEIO ESTRITO: TENTATIVAS ESGOTADAS ANTES DO ENVIO */}
        {bloqueioEsgotado && !resultado ? (
          <div className="rounded-sm border border-red-900/60 bg-[#11141c] p-8 sm:p-12 text-center shadow-2xl space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xs bg-red-950/80 border border-red-800 text-red-500">
              <IconLock className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-400">
                Acesso Interrompido
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">
                Limite de 2 Tentativas Esgotado
              </h2>
              <p className="mt-2 max-w-xl mx-auto text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {isProvaFinal
                  ? 'Você utilizou as suas 2 tentativas na Avaliação Final sem atingir a nota mínima de 70%. Conforme o regulamento pedagógico, é obrigatório reiniciar a trilha de estudos do início para desbloquear uma nova oportunidade de certificação.'
                  : 'Você utilizou suas 2 tentativas nesta atividade de fixação sem atingir a nota mínima. Para desbloquear uma nova oportunidade, você deve reler a apresentação de slides do módulo.'}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              {isProvaFinal && onReiniciarCurso && (
                <button
                  onClick={() => {
                    onReiniciarCurso()
                    onClose()
                  }}
                  className="rounded-sm bg-red-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-xl hover:bg-red-700 transition"
                >
                  Reiniciar Trilha de Estudos do Zero
                </button>
              )}

              {!isProvaFinal && aulaId && onExigirReleitura && (
                <button
                  onClick={() => {
                    onExigirReleitura(aulaId)
                    onClose()
                  }}
                  className="rounded-sm bg-sky-500 px-6 py-3 text-xs sm:text-sm font-bold text-zinc-950 shadow-xl hover:bg-sky-400 transition"
                >
                  Reler Slides do Módulo
                </button>
              )}

              <button
                onClick={onClose}
                className="rounded-sm border border-zinc-700 bg-zinc-800 px-5 py-3 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        ) : resultado ? (
          /* ======================================================== */
          /* TELA DE RESULTADO / FEEDBACK COMPLETO                     */
          /* ======================================================== */
          <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-8 sm:p-12 text-center shadow-2xl space-y-6">
            {(() => {
              const aprovado = isProvaFinal
                ? resultado.percentual >= 70
                : resultado.percentual >= 50

              const esgotouDepoisDesteEnvio =
                infoSubmissao !== null
                  ? infoSubmissao.esgotou
                  : !aprovado && (tentativasFeitas >= MAX_TENTATIVAS)

              return (
                <>
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-xs border ${
                      aprovado
                        ? 'border-emerald-800 bg-emerald-950/80 text-emerald-400'
                        : 'border-red-800 bg-red-950/80 text-red-500'
                    }`}
                  >
                    {aprovado ? (
                      <IconCheckCircle className="w-9 h-9" />
                    ) : (
                      <IconAlertCircle className="w-9 h-9" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                      {aprovado
                        ? isProvaFinal
                          ? 'Aprovação Conquistada com Êxito'
                          : 'Atividade de Fixação Concluída'
                        : 'Aproveitamento Insuficiente'}
                    </h2>

                    <p className="mt-2 text-xs sm:text-sm text-zinc-400">
                      Você acertou <strong className="text-white">{resultado.acertos}</strong> de{' '}
                      <strong className="text-white">{resultado.total_questoes}</strong> questões
                      (aproveitamento de{' '}
                      <strong
                        className={`text-base font-bold font-mono ${
                          aprovado ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {resultado.percentual}%
                      </strong>
                      ).
                    </p>
                  </div>

                  <div
                    className={`rounded-sm p-5 text-xs sm:text-sm max-w-xl mx-auto border ${
                      aprovado
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-red-950/40 border-red-800/60 text-red-300'
                    }`}
                  >
                    {aprovado ? (
                      isProvaFinal ? (
                        <p className="leading-relaxed">
                          Parabéns! Você superou a nota de corte institucional de 70% na Avaliação
                          Final. O seu Certificado de Conclusão de 10 horas do IFSP Hortolândia foi
                          gerado e já está disponível para consulta e download.
                        </p>
                      ) : (
                        <p className="leading-relaxed">
                          Conhecimento validado com sucesso! A próxima etapa da trilha de estudos foi
                          desbloqueada automaticamente.
                        </p>
                      )
                    ) : (
                      <div className="space-y-2">
                        <p className="leading-relaxed">
                          A pontuação mínima exigida para aprovação é de{' '}
                          <strong>{isProvaFinal ? '70%' : '50%'}</strong>.
                        </p>
                        {!esgotouDepoisDesteEnvio ? (
                          <p className="font-semibold text-zinc-100">
                            {isProvaFinal
                              ? 'Você utilizou a 1ª tentativa e ainda possui 1 oportunidade restante para atingir a meta institucional de 70%.'
                              : 'Você utilizou a 1ª tentativa e ainda possui 1 tentativa restante.'}
                          </p>
                        ) : (
                          <p className="font-bold text-red-400">
                            {isProvaFinal
                              ? 'Limite de 2 tentativas esgotado sem atingir 70%. É necessário reiniciar o curso do início para tentar novamente.'
                              : 'Limite de 2 tentativas esgotado. É obrigatório reler os slides do módulo para liberar uma nova oportunidade!'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex flex-wrap justify-center gap-3">
                    {aprovado && isProvaFinal && onAbrirCertificado && (
                      <button
                        onClick={() => {
                          onClose()
                          onAbrirCertificado()
                        }}
                        className="inline-flex items-center gap-2 rounded-sm bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition"
                      >
                        <IconGraduationCap className="w-4 h-4" />
                        <span>Visualizar Certificado Oficial</span>
                      </button>
                    )}

                    {!aprovado && !esgotouDepoisDesteEnvio && (
                      <button
                        onClick={handleTentarNovamente}
                        className="inline-flex items-center gap-2 rounded-sm bg-sky-500 px-6 py-3 text-xs sm:text-sm font-bold text-zinc-950 shadow-md hover:bg-sky-400 transition"
                      >
                        <IconRefresh className="w-4 h-4" />
                        <span>Tentar Novamente (2ª Tentativa)</span>
                      </button>
                    )}

                    {esgotouDepoisDesteEnvio && isProvaFinal && onReiniciarCurso && (
                      <button
                        onClick={() => {
                          onReiniciarCurso()
                          onClose()
                        }}
                        className="inline-flex items-center gap-2 rounded-sm bg-red-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-red-700 transition"
                      >
                        <IconRefresh className="w-4 h-4" />
                        <span>Reiniciar Trilha de Estudos</span>
                      </button>
                    )}

                    <button
                      onClick={onClose}
                      className="rounded-sm border border-zinc-700 bg-zinc-800 px-5 py-3 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                    >
                      Voltar ao Painel
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        ) : (
          /* ======================================================== */
          /* FORMULÁRIO DE QUESTÕES EM TELA CHEIA                     */
          /* ======================================================== */
          <form onSubmit={handleEnviar} className="space-y-6">
            {erro && (
              <div className="rounded-sm bg-red-950/80 border-l-4 border-red-500 p-4 text-xs font-semibold text-red-200">
                {erro}
              </div>
            )}

            {isProvaFinal && tempoRestanteSegundos <= 300 && (
              <div className="rounded-sm bg-amber-950/80 border-l-4 border-amber-500 p-4 text-xs text-amber-200 flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Faltam menos de 5 minutos para encerramento da prova. Se o
                  tempo expirar, o questionário será finalizado com as respostas preenchidas.
                </span>
              </div>
            )}

            <div className="space-y-6">
              {questionario.questoes
                .sort((a, b) => a.ordem - b.ordem)
                .map((questao, qIdx) => {
                  const questaoRespondida = !!respostas[questao.id]

                  return (
                    <div
                      key={questao.id}
                      className={`rounded-sm border p-6 transition bg-[#11141c] shadow-xl ${
                        questaoRespondida ? 'border-sky-800/80' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                          <span className="text-sky-400 font-extrabold mr-2 font-mono">
                            Questão {qIdx + 1}.
                          </span>
                          {questao.enunciado}
                        </h2>
                        {questaoRespondida && (
                          <span className="shrink-0 rounded-xs bg-sky-950/60 border border-sky-800 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                            Respondida
                          </span>
                        )}
                      </div>

                      <div className="mt-5 space-y-2.5">
                        {questao.alternativas
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((alt) => {
                            const selecionada = respostas[questao.id] === alt.id

                            return (
                              <label
                                key={alt.id}
                                className={`flex cursor-pointer items-start gap-3.5 rounded-sm border p-4 transition ${
                                  selecionada
                                    ? 'border-sky-400 bg-sky-950/40 ring-1 ring-sky-400 text-white'
                                    : 'border-zinc-800 bg-[#090b10] text-zinc-300 hover:border-zinc-700 hover:bg-[#0c0f17]'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`questao-${questao.id}`}
                                  value={alt.id}
                                  checked={selecionada}
                                  onChange={() => handleSelectAlternativa(questao.id, alt.id)}
                                  className="mt-1 h-4 w-4 text-sky-400 focus:ring-sky-400 accent-sky-400 cursor-pointer"
                                />
                                <span className="text-xs sm:text-sm font-medium leading-relaxed">
                                  {alt.texto}
                                </span>
                              </label>
                            )
                          })}
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* BARRA INFERIOR DE FINALIZAÇÃO */}
            <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 bg-[#0d1017]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
              <div className="text-xs text-zinc-400 font-mono">
                {respondidas < totalQuestoes ? (
                  <span>
                    Restam <strong className="text-white">{totalQuestoes - respondidas}</strong>{' '}
                    questões obrigatórias.
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <IconCheckCircle className="w-4 h-4" />
                    <span>Todas as {totalQuestoes} questões foram preenchidas.</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleConfirmarVoltar}
                  disabled={enviando}
                  className="flex-1 sm:flex-none rounded-sm border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || respondidas < totalQuestoes}
                  className="flex-1 sm:flex-none rounded-sm bg-sky-500 px-7 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 shadow-xl hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {enviando ? 'Submetendo...' : 'Finalizar e Enviar Avaliação'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
