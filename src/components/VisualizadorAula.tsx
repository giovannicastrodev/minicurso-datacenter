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

  const materialAtual: MaterialComplementar | undefined =
    materiais.find((m) => m.id === materialAtivoId) || materiais[0]

  // Estado de aprovação na fixação deste módulo
  const tentativaAprovada = tentativaFixacao?.aprovado || false
  const esgotouTentativasFixacao = totalTentativasFixacao >= 2 && !tentativaAprovada
  const todosMateriaisLidos =
    materiais.length === 0 ||
    materiais.every((m) => materiaisLidos.includes(m.id))

  const questionarioFixacao: Questionario | undefined = Array.isArray(aula.questionarios)
    ? aula.questionarios[0]
    : (aula.questionarios as unknown as Questionario)

  // Encontra a aula anterior e próxima para navegação rápida
  const indexAtual = todasAulas.findIndex((a) => a.id === aula.id)
  const aulaAnterior = indexAtual > 0 ? todasAulas[indexAtual - 1] : null
  const proximaAula = indexAtual < todasAulas.length - 1 ? todasAulas[indexAtual + 1] : null

  // Carrega PDF.js
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

  // Renderiza a página no Canvas 16:9
  const renderizarPagina = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }

        const page = await pdfDocRef.current.getPage(pageNumber)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const targetWidth = canvas.parentElement?.clientWidth || 1024
        const scale = targetWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale: Math.max(scale, 1.2) })

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Erro ao renderizar slide:', err)
        }
      }
    },
    []
  )

  // Carrega o documento PDF
  useEffect(() => {
    if (!materialAtual?.url_arquivo) {
      setCarregandoPdf(false)
      return
    }

    let isMounted = true
    setCarregandoPdf(true)
    setErroCarregamento(null)
    setCurrentPage(1)

    carregarPdfJs()
      .then((pdfjs) => {
        const loadingTask = pdfjs.getDocument({
          url: materialAtual.url_arquivo,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        })

        return loadingTask.promise
      })
      .then((pdf: any) => {
        if (!isMounted) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setCarregandoPdf(false)
        renderizarPagina(1)
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('PDF não pôde ser carregado via Canvas (CORS/URL externa):', err)
        setErroCarregamento('Apresentação hospedada em link externo ou requer visualizador nativo.')
        setCarregandoPdf(false)
      })

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [materialAtual?.url_arquivo, carregarPdfJs, renderizarPagina])

  // Re-renderiza na troca de página
  useEffect(() => {
    if (pdfDocRef.current && !carregandoPdf) {
      renderizarPagina(currentPage)
    }
  }, [currentPage, carregandoPdf, renderizarPagina])

  // Controles de Navegação de Slides
  const proximoSlide = useCallback(() => {
    if (currentPage < numPages) {
      const proxima = currentPage + 1
      setCurrentPage(proxima)
      if (proxima === numPages && materialAtual) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-zinc-800 bg-[#11141c] p-4 shadow-lg">
        <button
          onClick={onVoltarTimeline}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-sky-400 transition"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Voltar para a Linha do Tempo</span>
        </button>

        <div className="flex items-center gap-2">
          {aulaAnterior && (
            <button
              onClick={() => onSelecionarAula(aulaAnterior.id)}
              className="rounded-sm border border-zinc-800 bg-[#090b10] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              Aula {aulaAnterior.ordem}
            </button>
          )}

          <span className="rounded-xs bg-[#090b10] border border-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
            Módulo {aula.ordem} de {todasAulas.length}
          </span>

          {proximaAula && tentativaAprovada && (
            <button
              onClick={() => onSelecionarAula(proximaAula.id)}
              className="rounded-sm border border-sky-800/60 bg-sky-950/40 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-900/60 transition"
            >
              Aula {proximaAula.ordem}
            </button>
          )}
        </div>
      </div>

      {/* BLOCO PRINCIPAL: SLIDES DO MÓDULO (FOCO CENTRAL) */}
      <div className="overflow-hidden rounded-sm border border-zinc-800 bg-[#11141c] shadow-2xl">
        {/* Cabeçalho do Módulo */}
        <div className="p-6 border-b border-zinc-800 bg-[#0d1017]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-xs bg-sky-950/70 border border-sky-800 px-2.5 py-0.5 text-[11px] font-mono font-bold text-sky-400 uppercase tracking-wider">
              Módulo {aula.ordem} • Material Principal
            </span>

            {tentativaAprovada && tentativaFixacao ? (
              <span className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
                <IconCheckCircle className="w-3.5 h-3.5" />
                <span>Fixação Concluída ({tentativaFixacao.acertos}/{tentativaFixacao.total_questoes} acertos)</span>
              </span>
            ) : esgotouTentativasFixacao ? (
              <span className="inline-flex items-center gap-1.5 rounded-xs bg-red-950/60 border border-red-800 px-2.5 py-0.5 text-xs font-mono font-bold text-red-400">
                <IconLock className="w-3.5 h-3.5" />
                <span>Tentativas Esgotadas (2/2) • Releitura Obrigatória</span>
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-xl sm:text-2xl font-bold text-zinc-100">{aula.titulo}</h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">{aula.descricao}</p>
        </div>

        {/* SELETOR DE MATERIAIS / SLIDES (SE HOUVER MAIS DE UM) */}
        {materiais.length > 1 && (
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-[#090b10] px-6 py-2 overflow-x-auto">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0">
              Apresentações:
            </span>
            {materiais.map((mat) => {
              const ativo = mat.id === materialAtual?.id
              const lido = materiaisLidos.includes(mat.id)
              return (
                <button
                  key={mat.id}
                  onClick={() => setMaterialAtivoId(mat.id)}
                  className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                    ativo
                      ? 'bg-sky-500 text-zinc-950 font-bold shadow-md'
                      : 'border border-zinc-800 bg-[#11141c] text-zinc-400 hover:text-zinc-200'
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
              <div className="max-w-md p-6 text-center bg-[#11141c] border border-zinc-800 rounded-sm text-zinc-300 space-y-4">
                <IconFileText className="w-12 h-12 mx-auto text-sky-400" />
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
                    className="inline-flex items-center gap-1.5 rounded-sm bg-sky-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-sky-400 transition"
                  >
                    <span>Abrir Apresentação PDF</span>
                    <IconExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => onMarcarMaterialLido(materialAtual.id)}
                    className="rounded-sm border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    Confirmar Leitura Realizada
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-4xl aspect-[16/9] flex items-center justify-center bg-[#090b10] rounded-sm overflow-hidden shadow-2xl border border-zinc-800">
                {carregandoPdf && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#090b10]/90 backdrop-blur-xs">
                    <div className="h-8 w-8 animate-spin rounded-xs border-2 border-sky-400 border-t-transparent"></div>
                    <p className="mt-3 text-xs text-zinc-400 font-mono">Carregando slide {currentPage}...</p>
                  </div>
                )}

                <canvas ref={canvasRef} className="h-full w-full object-contain" />

                {/* Botões Laterais Flutuantes de Slide */}
                {currentPage > 1 && (
                  <button
                    onClick={slideAnterior}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xs bg-[#090b10]/90 text-white shadow-lg border border-zinc-700 hover:bg-sky-500 hover:text-zinc-950 transition"
                    title="Slide anterior"
                  >
                    <IconChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {currentPage < numPages && (
                  <button
                    onClick={proximoSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xs bg-[#090b10]/90 text-white shadow-lg border border-zinc-700 hover:bg-sky-500 hover:text-zinc-950 transition"
                    title="Próximo slide"
                  >
                    <IconChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )
          ) : (
            <p className="text-xs text-zinc-500 font-mono">Nenhum material de apresentação anexado.</p>
          )}

          {/* BARRA DE CONTROLE INFERIOR DO SLIDE */}
          {materialAtual && !erroCarregamento && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 w-full max-w-4xl px-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={slideAnterior}
                  disabled={currentPage <= 1 || carregandoPdf}
                  className="rounded-sm border border-zinc-800 bg-[#11141c] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition"
                >
                  Anterior
                </button>
                <span className="text-xs font-mono font-bold text-zinc-400 px-2">
                  <strong className="text-sky-400">{currentPage}</strong> / {numPages}
                </span>
                <button
                  onClick={proximoSlide}
                  disabled={currentPage >= numPages || carregandoPdf}
                  className="rounded-sm border border-zinc-800 bg-[#11141c] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition"
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
                  className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 bg-[#11141c] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>

                <button
                  onClick={() => onMarcarMaterialLido(materialAtual.id)}
                  className={`inline-flex items-center gap-1.5 rounded-sm px-4 py-1.5 text-xs font-bold transition ${
                    materiaisLidos.includes(materialAtual.id)
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                      : 'bg-sky-500 text-zinc-950 font-bold hover:bg-sky-400'
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
          <div className="p-6 border-t border-zinc-800 bg-[#0d1017]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                    Etapa Avaliativa
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
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
                className={`rounded-sm px-6 py-3 text-xs sm:text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 shrink-0 ${
                  !todosMateriaisLidos || esgotouTentativasFixacao
                    ? 'border border-zinc-800 bg-[#090b10] text-zinc-500 cursor-not-allowed shadow-none'
                    : tentativaAprovada
                    ? 'border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    : 'bg-sky-500 text-zinc-950 font-bold hover:bg-sky-400'
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
          <div className="border-t border-zinc-800 bg-[#090b10] p-6">
            <button
              onClick={() => setVideoExpandido(!videoExpandido)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2.5">
                <IconPlay className="w-4 h-4 text-sky-400" />
                <span className="text-xs sm:text-sm font-bold text-zinc-300">
                  Vídeo da Aula (Material de Apoio Complementar)
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300">
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
                <div className="aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-sm bg-black border border-zinc-800 shadow-xl">
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
