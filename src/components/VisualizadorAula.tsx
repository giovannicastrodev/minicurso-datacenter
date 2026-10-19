'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Aula, Questionario, Tentativa, MaterialComplementar } from '../types/database'
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconMaximize,
  IconFileText,
  IconCheckCircle,
  IconLock,
  IconPlay,
  IconRefresh,
  IconDownload,
  IconExternalLink,
  IconChevronUp,
  IconChevronDown,
} from './ui/Icons'

interface VisualizadorAulaProps {
  aula: Aula
  todasAulas: Aula[]
  materiaisLidos: string[]
  tentativaFixacao: Tentativa | null
  totalTentativasFixacao: number
  onMarcarMaterialLido: (materialId: string) => void
  onAbrirQuestionario: (questionario: Questionario) => void
  onSelecionarAula: (aulaId: string) => void
  onVoltarTimeline: () => void
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

export default function VisualizadorAula({
  aula,
  todasAulas,
  materiaisLidos,
  tentativaFixacao,
  totalTentativasFixacao,
  onMarcarMaterialLido,
  onAbrirQuestionario,
  onSelecionarAula,
  onVoltarTimeline,
}: VisualizadorAulaProps) {
  const materiais = aula.materiais || []
  const [materialAtivoId, setMaterialAtivoId] = useState<string>(materiais[0]?.id || '')
  const [numPages, setNumPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [carregandoPdf, setCarregandoPdf] = useState<boolean>(true)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [videoExpandido, setVideoExpandido] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pdfDocRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)

  const questionarioFixacao = Array.isArray(aula.questionarios)
    ? aula.questionarios[0]
    : (aula.questionarios as unknown as Questionario)

  // Material selecionado no player de slides
  const materialAtual = materiais.find((m) => m.id === materialAtivoId) || materiais[0] || null

  const todosMateriaisLidos =
    materiais.length === 0 || materiais.every((m) => materiaisLidos.includes(m.id))

  const tentativaAprovada = tentativaFixacao && (tentativaFixacao.percentual >= 50)
  const esgotouTentativasFixacao = totalTentativasFixacao >= 2 && !tentativaAprovada

  // Navegação entre módulos
  const indexAtual = todasAulas.findIndex((a) => a.id === aula.id)
  const aulaAnterior = indexAtual > 0 ? todasAulas[indexAtual - 1] : null
  const proximaAula = indexAtual < todasAulas.length - 1 ? todasAulas[indexAtual + 1] : null

  // Carregador de PDF.js
  const carregarPdfJs = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve(window.pdfjsLib)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.async = true
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          resolve(window.pdfjsLib)
        } else {
          reject(new Error('PDF.js não pôde ser inicializado.'))
        }
      }
      script.onerror = () => reject(new Error('Falha ao carregar script do PDF.js.'))
      document.head.appendChild(script)
    })
  }, [])

  // Renderiza página de slide no canvas
  const renderizarPagina = useCallback(async (num: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }

      const page = await pdfDocRef.current.getPage(num)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      const containerWidth = canvas.parentElement?.clientWidth || 960
      const standardViewport = page.getViewport({ scale: 1.0 })
      const scale = (containerWidth / standardViewport.width) * 1.5
      const viewport = page.getViewport({ scale })

      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: context,
        viewport,
      }

      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise
      setCarregandoPdf(false)
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Erro ao renderizar slide:', err)
      }
    }
  }, [])

  // Carrega o documento quando o material atual muda
  useEffect(() => {
    if (!materialAtual) return

    let isMounted = true
    setCarregandoPdf(true)
    setErroCarregamento(null)
    pdfDocRef.current = null
    setCurrentPage(1)

    carregarPdfJs()
      .then(async (pdfjs) => {
        try {
          const loadingTask = pdfjs.getDocument({
            url: materialAtual.url_arquivo,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
          })

          const doc = await loadingTask.promise
          if (!isMounted) return

          pdfDocRef.current = doc
          setNumPages(doc.numPages)
          setCurrentPage(1)
          await renderizarPagina(1)
        } catch (err: any) {
          if (!isMounted) return
          setErroCarregamento(
            'Arquivo externo com restrição de CORS. Utilize o visualizador nativo abaixo.'
          )
          setCarregandoPdf(false)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setErroCarregamento(err.message)
        setCarregandoPdf(false)
      })

    return () => {
      isMounted = false
    }
  }, [materialAtual, carregarPdfJs, renderizarPagina])

  // Muda de página
  useEffect(() => {
    if (pdfDocRef.current && !erroCarregamento) {
      renderizarPagina(currentPage)
    }
  }, [currentPage, erroCarregamento, renderizarPagina])

  const proximoSlide = useCallback(() => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1)
      if (currentPage + 1 === numPages && materialAtual) {
        onMarcarMaterialLido(materialAtual.id)
      }
    }
  }, [currentPage, numPages, materialAtual, onMarcarMaterialLido])

  const slideAnterior = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [currentPage])

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO DA AULA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg">
        <button
          onClick={onVoltarTimeline}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-red-500 transition"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Voltar para a Linha do Tempo</span>
        </button>

        <div className="flex items-center gap-2">
          {aulaAnterior && (
            <button
              onClick={() => onSelecionarAula(aulaAnterior.id)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              Aula {aulaAnterior.ordem}
            </button>
          )}

          <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Módulo {aula.ordem} de {todasAulas.length}
          </span>

          {proximaAula && tentativaAprovada && (
            <button
              onClick={() => onSelecionarAula(proximaAula.id)}
              className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/60 transition"
            >
              Aula {proximaAula.ordem}
            </button>
          )}
        </div>
      </div>

      {/* BLOCO PRINCIPAL: SLIDES DO MÓDULO (FOCO CENTRAL) */}
      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Cabeçalho do Módulo */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-red-600 px-3 py-0.5 text-[11px] font-extrabold text-white uppercase tracking-wider">
              Módulo {aula.ordem} • Material Principal
            </span>

            {tentativaAprovada ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 text-xs font-bold text-emerald-400">
                <IconCheckCircle className="w-4 h-4" />
                <span>Fixação Concluída ({tentativaFixacao.acertos}/{tentativaFixacao.total_questoes} acertos)</span>
              </span>
            ) : esgotouTentativasFixacao ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-950/60 border border-red-800/60 px-3 py-1 text-xs font-bold text-red-400">
                <IconLock className="w-4 h-4" />
                <span>Tentativas Esgotadas (2/2) • Releitura Obrigatória</span>
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-xl sm:text-2xl font-bold text-zinc-100">{aula.titulo}</h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">{aula.descricao}</p>
        </div>

        {/* SELETOR DE MATERIAIS / SLIDES (SE HOUVER MAIS DE UM) */}
        {materiais.length > 1 && (
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/40 px-6 py-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
              Apresentações:
            </span>
            {materiais.map((mat) => {
              const ativo = mat.id === materialAtual?.id
              const lido = materiaisLidos.includes(mat.id)
              return (
                <button
                  key={mat.id}
                  onClick={() => setMaterialAtivoId(mat.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                    ativo
                      ? 'bg-red-600 text-white shadow-md'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <IconFileText className="w-3.5 h-3.5" />
                  <span>{mat.titulo}</span>
                  {lido && <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              )
            })}
          </div>
        )}

        {/* PLAYER HERO DE SLIDES 16:9 */}
        <div className="relative bg-black p-4 sm:p-8 flex flex-col items-center justify-center min-h-[400px] sm:min-h-[560px]">
          {materialAtual ? (
            erroCarregamento ? (
              <div className="max-w-md p-6 text-center bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 space-y-4">
                <IconFileText className="w-12 h-12 mx-auto text-red-500" />
                <h4 className="text-base font-bold text-white">Visualização de Slides</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Para visualizar a apresentação em tela cheia e concluir a etapa:
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2">
                  <a
                    href={materialAtual.url_arquivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onMarcarMaterialLido(materialAtual.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition"
                  >
                    <span>Abrir Apresentação PDF</span>
                    <IconExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => onMarcarMaterialLido(materialAtual.id)}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    Confirmar Leitura Realizada
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-4xl aspect-[16/9] flex items-center justify-center bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
                {carregandoPdf && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-xs">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-red-500 border-t-transparent"></div>
                    <p className="mt-3 text-xs text-zinc-400 font-medium">Carregando slide {currentPage}...</p>
                  </div>
                )}

                <canvas ref={canvasRef} className="h-full w-full object-contain" />

                {/* Botões Laterais Flutuantes de Slide */}
                {currentPage > 1 && (
                  <button
                    onClick={slideAnterior}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950/80 text-white shadow-lg border border-zinc-700/60 hover:bg-red-600 transition"
                    title="Slide anterior"
                  >
                    <IconChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {currentPage < numPages && (
                  <button
                    onClick={proximoSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950/80 text-white shadow-lg border border-zinc-700/60 hover:bg-red-600 transition"
                    title="Próximo slide"
                  >
                    <IconChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )
          ) : (
            <p className="text-xs text-zinc-500">Nenhum material de apresentação anexado.</p>
          )}

          {/* BARRA DE CONTROLE INFERIOR DO SLIDE */}
          {materialAtual && !erroCarregamento && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 w-full max-w-4xl px-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={slideAnterior}
                  disabled={currentPage <= 1 || carregandoPdf}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition"
                >
                  Anterior
                </button>
                <span className="text-xs font-mono font-bold text-zinc-400 px-2">
                  <strong className="text-white">{currentPage}</strong> / {numPages}
                </span>
                <button
                  onClick={proximoSlide}
                  disabled={currentPage >= numPages || carregandoPdf}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition"
                >
                  Próximo
                </button>
              </div>

              {/* Status de Leitura / Ação */}
              <div className="flex items-center gap-2">
                <a
                  href={materialAtual.url_arquivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>

                <button
                  onClick={() => onMarcarMaterialLido(materialAtual.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                    materiaisLidos.includes(materialAtual.id)
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <IconCheckCircle className="w-3.5 h-3.5" />
                  <span>
                    {materiaisLidos.includes(materialAtual.id)
                      ? 'Leitura Concluída'
                      : 'Marcar como Concluído'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ATIVIDADE DE FIXAÇÃO DO MÓDULO */}
        {questionarioFixacao && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-950/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Etapa Avaliativa
                  </span>
                  <span className="text-xs text-zinc-500">
                    Tentativas: {totalTentativasFixacao} de 2
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {questionarioFixacao.titulo}
                </h3>
                <p className="text-xs text-zinc-400">
                  Responda o questionário em tela cheia para validar o aprendizado e liberar o próximo módulo.
                </p>

                {!todosMateriaisLidos && (
                  <p className="mt-2 text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                    <IconLock className="w-3.5 h-3.5" />
                    <span>Conclua a leitura dos slides acima para desbloquear esta atividade.</span>
                  </p>
                )}

                {esgotouTentativasFixacao && (
                  <p className="mt-2 text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <IconLock className="w-3.5 h-3.5" />
                    <span>Suas 2 tentativas foram esgotadas. Releia os slides acima para liberar novas tentativas!</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={!todosMateriaisLidos || esgotouTentativasFixacao}
                onClick={() => onAbrirQuestionario(questionarioFixacao)}
                className={`rounded-xl px-6 py-3 text-xs sm:text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 shrink-0 ${
                  !todosMateriaisLidos || esgotouTentativasFixacao
                    ? 'border border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed shadow-none'
                    : tentativaAprovada
                    ? 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {!todosMateriaisLidos ? (
                  <>
                    <IconLock className="w-4 h-4" />
                    <span>Atividade Bloqueada</span>
                  </>
                ) : esgotouTentativasFixacao ? (
                  <>
                    <IconLock className="w-4 h-4" />
                    <span>Tentativas Esgotadas (Reler Slides)</span>
                  </>
                ) : tentativaAprovada ? (
                  <>
                    <IconRefresh className="w-4 h-4" />
                    <span>Refazer Atividade (Fixação)</span>
                  </>
                ) : (
                  <>
                    <IconPlay className="w-4 h-4" />
                    <span>Iniciar Atividade em Tela Cheia</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* VÍDEO DO YOUTUBE (COMPLEMENTAR / OPCIONAL) */}
        {aula.url_video && (
          <div className="border-t border-zinc-800 bg-zinc-900/60 p-6">
            <button
              onClick={() => setVideoExpandido(!videoExpandido)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2.5">
                <IconPlay className="w-4 h-4 text-zinc-400" />
                <span className="text-xs sm:text-sm font-bold text-zinc-300">
                  Vídeo da Aula (Material de Apoio Complementar)
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400">
                <span>{videoExpandido ? 'Ocultar Vídeo' : 'Assistir Vídeo'}</span>
                {videoExpandido ? (
                  <IconChevronUp className="w-4 h-4" />
                ) : (
                  <IconChevronDown className="w-4 h-4" />
                )}
              </span>
            </button>

            {videoExpandido && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-2xl bg-black border border-zinc-800 shadow-xl">
                  <iframe
                    src={aula.url_video}
                    title={aula.titulo}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
