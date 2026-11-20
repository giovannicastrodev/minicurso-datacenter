'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LIMITE_PERGUNTA, type RespostaCurso } from '../lib/chatCurso'
import { supabase } from '../lib/supabase'

interface Turno extends RespostaCurso {
  id: number
  pergunta: string
}

export default function ChatCurso() {
  const [aberto, setAberto] = useState(false)
  const [pergunta, setPergunta] = useState('')
  const [historico, setHistorico] = useState<Turno[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const proximoId = useRef(0)
  const botao = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const mensagens = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto) campo.current?.focus()
  }, [aberto])

  useEffect(() => {
    const lista = mensagens.current
    if (aberto && lista) lista.scrollTop = lista.scrollHeight
  }, [aberto, historico])

  function fechar() {
    setAberto(false)
    botao.current?.focus()
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const texto = pergunta.trim()
    if (enviando || !texto) return
    setEnviando(true)
    setErro('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErro('Entre novamente para usar o chat.')
        return
      }

      const resposta = await fetch('/api/chat-curso', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pergunta: texto }),
        signal: AbortSignal.timeout(65_000),
      })
      const resultado = await resposta.json() as RespostaCurso & { erro?: string }
      if (!resposta.ok) {
        setErro(resultado.erro || 'Não foi possível consultar o material.')
        return
      }

      const turno = { ...resultado, id: proximoId.current++, pergunta: texto }
      setHistorico((anterior) => [...anterior.slice(-9), turno])
      setPergunta('')
    } catch {
      setErro('Não foi possível consultar o material. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
      <section
        id="chat-curso"
        aria-labelledby="chat-curso-titulo"
        hidden={!aberto}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.stopPropagation()
            fechar()
          }
        }}
        className="pointer-events-auto w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl sm:w-96"
      >
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2">
          <h2 id="chat-curso-titulo" className="text-sm font-bold text-zinc-100">Tire dúvidas do minicurso</h2>
          <button
            type="button"
            onClick={fechar}
            className="rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Fechar
          </button>
        </header>
        <div className="flex max-h-[min(32rem,calc(100dvh-9rem))] flex-col">
          <div ref={mensagens} role="log" aria-label="Perguntas e respostas" className="min-h-0 space-y-3 overflow-y-auto p-3 empty:hidden">
            {historico.map((turno) => (
              <article key={turno.id} className="space-y-3 rounded-sm bg-zinc-950 p-3 text-sm">
                <p className="break-words font-semibold text-zinc-100">{turno.pergunta}</p>
                {turno.trechos.length === 0 && (
                  <p className="text-zinc-300">Não encontrei uma resposta nos materiais consultados.</p>
                )}
                {turno.trechos.map((trecho, indice) => {
                  const fonte = trecho.pagina ? `${trecho.titulo} · p. ${trecho.pagina}` : trecho.titulo
                  return (
                    <figure key={indice} className="border-l-2 border-sky-600 pl-3">
                      <blockquote className="break-words text-zinc-200">{trecho.texto}</blockquote>
                      <figcaption className="mt-1 text-xs text-zinc-400">
                        {trecho.url ? (
                          <a
                            href={`${trecho.url}#page=${trecho.pagina}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-300 underline underline-offset-2"
                          >
                            {fonte}
                          </a>
                        ) : fonte}
                      </figcaption>
                    </figure>
                  )
                })}
                {turno.materiaisIndisponiveis && (
                  <p className="text-xs text-amber-300">Alguns PDFs ficaram fora desta consulta.</p>
                )}
              </article>
            ))}
          </div>
          <form onSubmit={enviar} className="flex shrink-0 items-end gap-2 border-t border-zinc-800 p-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-zinc-200">
              Sua pergunta
              <input
                ref={campo}
                value={pergunta}
                onChange={(evento) => setPergunta(evento.target.value)}
                maxLength={LIMITE_PERGUNTA}
                required
                readOnly={enviando}
                placeholder="O que é PUE?"
                className="rounded-sm border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>
            <button
              type="submit"
              disabled={enviando || !pergunta.trim()}
              className="rounded-sm bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
            >
              Perguntar
            </button>
          </form>
          {enviando && <p role="status" className="px-3 pb-3 text-sm text-zinc-300">Consultando materiais…</p>}
          {erro && <p role="alert" className="px-3 pb-3 text-sm text-rose-300">{erro}</p>}
        </div>
      </section>
      <button
        ref={botao}
        type="button"
        aria-controls="chat-curso"
        aria-expanded={aberto}
        onClick={() => aberto ? fechar() : setAberto(true)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-sky-600"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.4-3.3A7.5 7.5 0 1 1 20 11.5Z" />
        </svg>
        Chat do curso
      </button>
    </div>
  )
}
