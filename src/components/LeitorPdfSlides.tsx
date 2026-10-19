'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

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
      // Cancela renderização anterior se estiver em andamento
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }

      const page = await pdfDocRef.current.getPage(num)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      // Obter dimensões do container
      const containerWidth = canvas.parentElement?.clientWidth || 960
      const standardViewport = page.getViewport({ scale: 1.0 })

      // Calcula a escala para caber na largura do slide 16:9
      const scale = (containerWidth / standardViewport.width) * 1.5 // 1.5x para nitidez
      const viewport = page.getViewport({ scale })

      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }

      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise
      setCarregando(false)
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Erro ao renderizar slide do PDF:', err)
      }
    }
  }, [])

  // Inicializa o documento PDF quando o modal abre
  useEffect(() => {
    if (!isOpen) {
      pdfDocRef.current = null
      setCurrentPage(1)
      setErroCarregamento(null)
      return
    }

    let isMounted = true
    setCarregando(true)
    setErroCarregamento(null)

    carregarPdfJs()
      .then(async (pdfjs) => {
        try {
          const loadingTask = pdfjs.getDocument({
            url,
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
          console.warn('Não foi possível carregar via PDF.js (possível CORS na URL externa):', err)
          setErroCarregamento(
            'Não foi possível renderizar diretamente os slides por restrição de segurança da URL (CORS). Você pode abrir o arquivo original ou testar com um PDF local.'
          )
          setCarregando(false)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setErroCarregamento(err.message)
        setCarregando(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, url, carregarPdfJs, renderizarPagina])

  // Muda de página
  useEffect(() => {
    if (pdfDocRef.current && isOpen && !erroCarregamento) {
      renderizarPagina(currentPage)
    }
  }, [currentPage, isOpen, erroCarregamento, renderizarPagina])

  const proximoSlide = useCallback(() => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1)
      if (currentPage + 1 === numPages) {
        onConcluirLeitura()
      }
    }
  }, [currentPage, numPages, onConcluirLeitura])

  const slideAnterior = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [currentPage])

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-2 sm:p-6">
      <div
        ref={containerRef}
        className={`relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl transition-all duration-300 ${
          modoTelaCheia ? 'h-full w-full rounded-none' : 'max-h-[95vh] w-full max-w-5xl'
        }`}
      >
        {/* BARRA SUPERIOR (HEADER DOS SLIDES) */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-sm">
              16:9
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-100 line-clamp-1">
                {titulo}
              </h3>
              <p className="text-xs text-zinc-400">
                Apresentação de Slides • Slide {currentPage} de {numPages}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status de Leitura */}
            {materialLido ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                Lido ✓
              </span>
            ) : (
              <button
                onClick={onConcluirLeitura}
                className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Marcar Lido ✓
              </button>
            )}

            {/* Alternar Tela Cheia */}
            <button
              onClick={() => setModoTelaCheia(!modoTelaCheia)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              title={modoTelaCheia ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {modoTelaCheia ? '🗗' : '⛶'}
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              title="Fechar apresentação"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ÁREA CENTRAL DO SLIDE (FORMATO 16:9) */}
        <div className="relative flex flex-1 items-center justify-center bg-black p-2 sm:p-6 min-h-[360px] sm:min-h-[500px]">
          {/* Alerta de Erro de CORS/URL externa */}
          {erroCarregamento ? (
            <div className="max-w-md p-6 text-center bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 space-y-4">
              <span className="text-4xl">📄</span>
              <h4 className="text-lg font-bold text-white">Visualização de Material</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Este documento está hospedado em um link externo ({url.slice(0, 45)}...). Para
                garantir a melhor experiência de leitura, abra-o no visualizador nativo ou faça o download:
              </p>
              <div className="flex justify-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onConcluirLeitura}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition"
                >
                  Abrir PDF em Nova Aba ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-4xl aspect-[16/9] flex items-center justify-center bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800/80">
              {carregando && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-xs">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
                  <p className="mt-3 text-xs text-zinc-400 font-medium">Carregando slide {currentPage}...</p>
                </div>
              )}

              <canvas ref={canvasRef} className="h-full w-full object-contain" />

              {/* Botão Flutuante Esquerdo (Anterior) */}
              {currentPage > 1 && (
                <button
                  onClick={slideAnterior}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-xs transition hover:bg-black/90 hover:scale-105"
                  title="Slide anterior (←)"
                >
                  ◀
                </button>
              )}

              {/* Botão Flutuante Direito (Próximo) */}
              {currentPage < numPages && (
                <button
                  onClick={proximoSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-xs transition hover:bg-black/90 hover:scale-105"
                  title="Próximo slide (→)"
                >
                  ▶
                </button>
              )}
            </div>
          )}
        </div>

        {/* BARRA INFERIOR (CONTROLES E PROGRESSO DE SLIDES) */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800 bg-zinc-900/90 px-4 py-3 sm:px-6 gap-3">
          {/* Navegação e Botões */}
          <div className="flex items-center gap-2">
            <button
              onClick={slideAnterior}
              disabled={currentPage <= 1 || carregando}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <span className="text-xs font-medium text-zinc-400 px-2">
              <strong className="text-zinc-100">{currentPage}</strong> / {numPages}
            </span>
            <button
              onClick={proximoSlide}
              disabled={currentPage >= numPages || carregando}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Próximo →
            </button>
          </div>

          {/* Barra de Progresso do Slide */}
          <div className="hidden md:flex items-center gap-1.5 max-w-xs flex-1 px-4">
            {Array.from({ length: Math.min(numPages, 20) }).map((_, idx) => {
              const slideNum = idx + 1
              return (
                <div
                  key={slideNum}
                  onClick={() => setCurrentPage(slideNum)}
                  className={`h-1.5 flex-1 rounded-full cursor-pointer transition ${
                    slideNum === currentPage
                      ? 'bg-indigo-500 scale-y-125'
                      : slideNum < currentPage
                      ? 'bg-emerald-500/80'
                      : 'bg-zinc-700'
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
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
            >
              Baixar PDF 📥
            </a>
            <button
              onClick={() => {
                onConcluirLeitura()
                onClose()
              }}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition"
            >
              {materialLido ? 'Fechar Apresentação' : 'Concluir Leitura ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

