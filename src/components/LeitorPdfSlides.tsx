'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  IconMaximize,
  IconMinimize,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconCheckCircle,
  IconExternalLink,
  IconFileText,
} from './ui/Icons'

interface LeitorPdfSlidesProps {
  url: string
  titulo: string
  isOpen: boolean
  onClose: () => void
  onConcluirLeitura: () => void
  materialLido: boolean
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

export default function LeitorPdfSlides({
  url,
  titulo,
  isOpen,
  onClose,
  onConcluirLeitura,
  materialLido,
}: LeitorPdfSlidesProps) {
  const [numPages, setNumPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [carregando, setCarregando] = useState<boolean>(true)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [modoTelaCheia, setModoTelaCheia] = useState<boolean>(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pdfDocRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)

  // Carrega a biblioteca PDF.js via CDN dinamicamente
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

  // Renderiza a página atual no canvas com proporção 16:9
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

      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const targetWidth = canvas.parentElement?.clientWidth || 960
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
  }, [])

  // Carrega o documento
  useEffect(() => {
    if (!isOpen || !url) return

    let isMounted = true
    setCarregando(true)
    setErroCarregamento(null)
    setCurrentPage(1)

    carregarPdfJs()
      .then((pdfjs) => {
        const loadingTask = pdfjs.getDocument({
          url,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        })
        return loadingTask.promise
      })
      .then((pdf: any) => {
        if (!isMounted) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        setCarregando(false)
        renderizarPagina(1)
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('PDF não pôde ser renderizado no Canvas:', err)
        setErroCarregamento('Apresentação hospedada externamente. Abra em tela cheia no navegador:')
        setCarregando(false)
      })

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [isOpen, url, carregarPdfJs, renderizarPagina])

  // Re-renderiza ao trocar de página
  useEffect(() => {
    if (pdfDocRef.current && !carregando) {
      renderizarPagina(currentPage)
    }
  }, [currentPage, carregando, renderizarPagina])

  // Navegação
  const proximoSlide = useCallback(() => {
    if (currentPage < numPages) {
      const proxima = currentPage + 1
      setCurrentPage(proxima)
      if (proxima === numPages) {
        onConcluirLeitura()
      }
    }
  }, [currentPage, numPages, onConcluirLeitura])

  const slideAnterior = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [currentPage])

  // Atalhos de Teclado
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        proximoSlide()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        slideAnterior()
      } else if (e.key === 'Escape') {
        if (modoTelaCheia) {
          setModoTelaCheia(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, modoTelaCheia, proximoSlide, slideAnterior, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-6">
      <div
        ref={containerRef}
        className={`relative flex flex-col overflow-hidden rounded-sm bg-[#11141c] border border-zinc-800 shadow-2xl transition-all duration-300 ${
          modoTelaCheia ? 'h-full w-full rounded-none' : 'max-h-[95vh] w-full max-w-5xl'
        }`}
      >
        {/* BARRA SUPERIOR (HEADER DOS SLIDES) */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-[#0d1017] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-sky-950/70 border border-sky-800 text-sky-400 font-mono font-bold text-xs">
              16:9
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                {titulo}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Slide {currentPage} de {numPages}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status de Leitura */}
            {materialLido ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-xs bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400">
                <IconCheckCircle className="w-3.5 h-3.5" />
                <span>LIDO</span>
              </span>
            ) : (
              <button
                onClick={onConcluirLeitura}
                className="hidden sm:inline-flex items-center gap-1 rounded-sm bg-sky-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-sky-400"
              >
                <span>Concluir Leitura</span>
              </button>
            )}

            {/* Alternar Tela Cheia */}
            <button
              onClick={() => setModoTelaCheia(!modoTelaCheia)}
              className="rounded-sm p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title={modoTelaCheia ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {modoTelaCheia ? <IconMinimize className="w-4 h-4" /> : <IconMaximize className="w-4 h-4" />}
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="rounded-sm p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Fechar apresentação"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL DO SLIDE (FORMATO 16:9) */}
        <div className="relative flex flex-1 items-center justify-center bg-black p-2 sm:p-6 min-h-[360px] sm:min-h-[500px]">
          {/* Alerta de Erro de CORS/URL externa */}
          {erroCarregamento ? (
            <div className="max-w-md p-6 text-center bg-[#11141c] border border-zinc-800 rounded-sm text-zinc-300 space-y-4">
              <IconFileText className="w-12 h-12 mx-auto text-sky-400" />
              <h4 className="text-base font-bold text-white">Visualização de Material</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Este documento está hospedado em um link externo. Para garantir a melhor leitura, abra-o no visualizador:
              </p>
              <div className="flex justify-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onConcluirLeitura}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-sky-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-sky-400 transition"
                >
                  <span>Abrir PDF em Nova Aba</span>
                  <IconExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-4xl aspect-[16/9] flex items-center justify-center bg-[#090b10] rounded-sm overflow-hidden shadow-2xl border border-zinc-800">
              {carregando && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#090b10]/90 backdrop-blur-xs">
                  <div className="h-8 w-8 animate-spin rounded-xs border-2 border-sky-400 border-t-transparent" />
                  <p className="mt-3 text-xs text-zinc-400 font-mono">Carregando slide {currentPage}...</p>
                </div>
              )}

              <canvas ref={canvasRef} className="h-full w-full object-contain" />

              {/* Botão Flutuante Esquerdo */}
              {currentPage > 1 && (
                <button
                  onClick={slideAnterior}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xs bg-[#090b10]/90 text-white shadow-lg border border-zinc-700 hover:bg-sky-500 hover:text-zinc-950 transition"
                  title="Slide anterior (←)"
                >
                  <IconChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Botão Flutuante Direito */}
              {currentPage < numPages && (
                <button
                  onClick={proximoSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xs bg-[#090b10]/90 text-white shadow-lg border border-zinc-700 hover:bg-sky-500 hover:text-zinc-950 transition"
                  title="Próximo slide (→)"
                >
                  <IconChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* BARRA INFERIOR (CONTROLES E PROGRESSO DE SLIDES) */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800 bg-[#0d1017] px-4 py-3 sm:px-6 gap-3">
          {/* Navegação e Botões */}
          <div className="flex items-center gap-2">
            <button
              onClick={slideAnterior}
              disabled={currentPage <= 1 || carregando}
              className="rounded-sm border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 transition"
            >
              Anterior
            </button>
            <span className="text-xs font-mono font-bold text-zinc-400 px-2">
              <strong className="text-sky-400">{currentPage}</strong> / {numPages}
            </span>
            <button
              onClick={proximoSlide}
              disabled={currentPage >= numPages || carregando}
              className="rounded-sm border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 transition"
            >
              Próximo
            </button>
          </div>

          {/* Barra de Progresso do Slide */}
          <div className="hidden md:flex items-center gap-1 max-w-xs flex-1 px-4">
            {Array.from({ length: Math.min(numPages, 20) }).map((_, idx) => {
              const slideNum = idx + 1
              return (
                <div
                  key={slideNum}
                  onClick={() => setCurrentPage(slideNum)}
                  className={`h-1.5 flex-1 rounded-xs cursor-pointer transition ${
                    slideNum === currentPage
                      ? 'bg-sky-400'
                      : slideNum < currentPage
                      ? 'bg-emerald-500/80'
                      : 'bg-zinc-800'
                  }`}
                  title={`Ir para slide ${slideNum}`}
                />
              )
            })}
          </div>

          {/* Ações Finais */}
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              <IconDownload className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </a>
            <button
              onClick={() => {
                onConcluirLeitura()
                onClose()
              }}
              className="rounded-sm bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition"
            >
              {materialLido ? 'Fechar Apresentação' : 'Concluir Leitura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
