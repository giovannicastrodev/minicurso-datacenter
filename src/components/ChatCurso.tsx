'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LIMITE_PERGUNTA, type RespostaCurso } from '../lib/chatCurso'
import { supabase } from '../lib/supabase'
import { IconArrowRight, IconBookOpen, IconX } from './ui/Icons'

const SUGESTOES = [
  'O que vou aprender neste minicurso?',
  'O que é um data center?',
  'Como o PUE é calculado?',
  'Como funciona a refrigeração?',
]

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
  const botaoFechar = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const mensagens = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto) botaoFechar.current?.focus()
  }, [aberto])

  useEffect(() => {
    const lista = mensagens.current
    const ultimoTurno = lista?.lastElementChild
    if (aberto && historico.length && lista && ultimoTurno) {
      lista.scrollTop += ultimoTurno.getBoundingClientRect().top - lista.getBoundingClientRect().top
    }
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
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-end">
      <section
        id="chat-curso"
        aria-labelledby="chat-curso-titulo"
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.stopPropagation()
            fechar()
          }
        }}
        className={aberto ? 'pointer-events-auto flex h-dvh w-full flex-col overflow-hidden bg-[#101923] text-slate-100 shadow-2xl sm:my-3 sm:mr-3 sm:h-[calc(100dvh-1.5rem)] sm:w-[26rem] sm:rounded-2xl sm:border sm:border-slate-700' : 'hidden'}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-700 bg-[#172534] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-300/15 text-teal-200">
            <IconBookOpen aria-hidden="true" />
          </span>
          <h2 id="chat-curso-titulo" className="flex-1 font-semibold">Assistente do minicurso</h2>
          <button
            ref={botaoFechar}
            type="button"
            onClick={fechar}
            aria-label="Fechar chat"
            className="grid size-10 place-items-center rounded-lg text-slate-300 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-teal-300"
          >
            <IconX aria-hidden="true" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <div ref={mensagens} role="log" aria-label="Perguntas e respostas" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-6">
            {historico.length === 0 && (
              <div className="space-y-4">
                <p className="rounded-2xl rounded-tl-sm bg-[#1d2c3b] px-4 py-3 text-sm leading-relaxed text-slate-200">
                  Olá! Posso ajudar você a encontrar respostas nas aulas e nos PDFs do minicurso.
                </p>
                <ul aria-label="Sugestões de perguntas" className="space-y-2">
                  {SUGESTOES.map((sugestao) => (
                    <li key={sugestao}>
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => {
                          setPergunta(sugestao)
                          campo.current?.focus()
                        }}
                        className="rounded-lg border border-slate-600 px-3 py-2 text-left text-sm text-teal-100 hover:border-teal-300 hover:bg-teal-300/10 focus-visible:outline-2 focus-visible:outline-teal-300 disabled:opacity-50"
                      >
                        {sugestao}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {historico.map((turno) => (
              <article key={turno.id} className="space-y-3 text-sm">
                <p className="ml-auto w-fit max-w-[90%] break-words rounded-2xl rounded-tr-sm bg-teal-950 px-4 py-2.5 text-teal-50">{turno.pergunta}</p>
                <div className="space-y-3 rounded-2xl rounded-tl-sm bg-[#1d2c3b] p-4">
                  {(turno.explicacao || !turno.complemento) && (
                    <p className="whitespace-pre-line break-words leading-relaxed text-slate-100">
                      {turno.explicacao || 'Posso ajudar com dúvidas sobre a trilha, data centers e temas técnicos relacionados.'}
                    </p>
                  )}
                  {turno.complemento && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-teal-200">Contexto complementar</p>
                      <p className="whitespace-pre-line break-words leading-relaxed text-slate-100">{turno.complemento}</p>
                    </div>
                  )}
                  {turno.trechos.length > 0 && (
                    <p className="text-xs font-semibold text-slate-300">
                      {turno.visaoGeral ? 'Temas da trilha' : 'Fontes do minicurso'}
                    </p>
                  )}
                  {turno.trechos.map((trecho, indice) => {
                    const fonte = trecho.pagina ? `${trecho.titulo} · p. ${trecho.pagina}` : trecho.titulo
                    if (turno.visaoGeral) {
                      return (
                        <div key={indice} className="border-l-2 border-teal-400/60 pl-3">
                          <h3 className="font-semibold text-teal-100">{trecho.titulo}</h3>
                          {trecho.texto !== trecho.titulo && <p className="mt-1 text-slate-200">{trecho.texto}</p>}
                        </div>
                      )
                    }
                    return (
                      <figure key={indice} className="border-l-2 border-teal-400/60 pl-3">
                        <blockquote className="break-words text-zinc-200">{trecho.texto}</blockquote>
                        <figcaption className="mt-1 text-xs text-zinc-400">
                          {trecho.url ? (
                            <a
                              href={`${trecho.url}#page=${trecho.pagina}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-words text-teal-200 underline underline-offset-2"
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
                </div>
              </article>
            ))}
          </div>
          {enviando && <p role="status" className="px-5 pb-3 text-sm text-slate-300">Consultando materiais…</p>}
          {erro && <p role="alert" className="px-5 pb-3 text-sm text-rose-300">{erro}</p>}
          <form onSubmit={enviar} className="shrink-0 border-t border-slate-700 bg-[#172534] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-600 bg-[#101923] p-1.5 focus-within:border-teal-300">
              <input
                ref={campo}
                aria-label="Sua pergunta"
                value={pergunta}
                onChange={(evento) => setPergunta(evento.target.value)}
                maxLength={LIMITE_PERGUNTA}
                required
                readOnly={enviando}
                placeholder="Digite sua pergunta"
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-slate-100 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={enviando || !pergunta.trim()}
                aria-label="Enviar pergunta"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-300 text-slate-950 hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 disabled:opacity-40"
              >
                <IconArrowRight aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </section>
      <button
        ref={botao}
        type="button"
        aria-controls="chat-curso"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
        className={aberto ? 'sr-only pointer-events-none' : 'pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 inline-flex items-center gap-2.5 rounded-2xl bg-teal-300 px-4 py-3 text-sm font-bold text-slate-950 shadow-xl hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 sm:bottom-6 sm:right-6'}
        tabIndex={aberto ? -1 : undefined}
      >
        <IconBookOpen aria-hidden="true" />
        Chat do curso
      </button>
    </div>
  )
}
