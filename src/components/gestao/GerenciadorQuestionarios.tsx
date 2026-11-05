'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Questionario, Questao, Alternativa } from '../../types/database'
import { supabase } from '../../lib/supabase'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconGraduationCap,
  IconFileText,
  IconCheckCircle,
  IconCheck,
} from '../ui/Icons'

interface GerenciadorQuestionariosProps {
  questionarios: Questionario[]
  onAtualizar: () => void
}

export default function GerenciadorQuestionarios({
  questionarios,
  onAtualizar,
}: GerenciadorQuestionariosProps) {
  const [questionarioIdAtivo, setQuestionarioIdAtivo] = useState<string>(
    questionarios[0]?.id || ''
  )
  const [questoesCompletas, setQuestoesCompletas] = useState<Questao[]>([])
  const [carregandoQuestoes, setCarregandoQuestoes] = useState(false)

  // Modais de Criação/Edição de Questão
  const [modalQuestaoAberto, setModalQuestaoAberto] = useState(false)
  const [questaoEdicao, setQuestaoEdicao] = useState<Questao | null>(null)
  const [enunciado, setEnunciado] = useState('')
  const [ordemQuestao, setOrdemQuestao] = useState(1)
  const [alternativasForm, setAlternativasForm] = useState<
    { id?: string; texto: string; correta: boolean; ordem: number }[]
  >([
    { texto: '', correta: true, ordem: 1 },
    { texto: '', correta: false, ordem: 2 },
    { texto: '', correta: false, ordem: 3 },
    { texto: '', correta: false, ordem: 4 },
  ])
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  )

  // Carrega as questões completas com o gabarito
  const carregarQuestoesComGabarito = useCallback(async (qId: string) => {
    if (!qId) return
    setCarregandoQuestoes(true)

    const { data, error } = await supabase
      .from('questoes')
      .select(`
        id,
        questionario_id,
        enunciado,
        ordem,
        alternativas (id, questao_id, texto, ordem, correta)
      `)
      .eq('questionario_id', qId)
      .order('ordem')

    if (!error && data) {
      setQuestoesCompletas(data as unknown as Questao[])
    }
    setCarregandoQuestoes(false)
  }, [])

  useEffect(() => {
    if (questionarioIdAtivo) {
      carregarQuestoesComGabarito(questionarioIdAtivo)
    }
  }, [questionarioIdAtivo, carregarQuestoesComGabarito])

  const handleAbrirNovaQuestao = () => {
    setQuestaoEdicao(null)
    setEnunciado('')
    setOrdemQuestao(
      (questoesCompletas.length > 0 ? Math.max(...questoesCompletas.map((q) => q.ordem)) : 0) + 1
    )
    setAlternativasForm([
      { texto: '', correta: true, ordem: 1 },
      { texto: '', correta: false, ordem: 2 },
      { texto: '', correta: false, ordem: 3 },
      { texto: '', correta: false, ordem: 4 },
    ])
    setModalQuestaoAberto(true)
  }

  const handleAbrirEditarQuestao = (q: Questao) => {
    setQuestaoEdicao(q)
    setEnunciado(q.enunciado)
    setOrdemQuestao(q.ordem)

    const alts = q.alternativas.sort((a, b) => a.ordem - b.ordem)
    setAlternativasForm(
      alts.map((a) => ({
        id: a.id,
        texto: a.texto,
        correta: !!a.correta,
        ordem: a.ordem,
      }))
    )
    setModalQuestaoAberto(true)
  }

  const handleSalvarQuestao = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setMensagem(null)

    // Valida se há pelo menos uma correta
    if (!alternativasForm.some((a) => a.correta)) {
      setMensagem({ tipo: 'erro', texto: 'Selecione qual das alternativas é a resposta correta (gabarito).' })
      setSalvando(false)
      return
    }

    try {
      let questaoId = questaoEdicao?.id

      if (questaoEdicao) {
        // Atualiza a Questão
        const { error: errQ } = await supabase
          .from('questoes')
          .update({
            enunciado,
            ordem: ordemQuestao,
          })
          .eq('id', questaoId)

        if (errQ) throw errQ

        // Atualiza as Alternativas
        for (const alt of alternativasForm) {
          if (alt.id) {
            await supabase
              .from('alternativas')
              .update({
                texto: alt.texto,
                correta: alt.correta,
                ordem: alt.ordem,
              })
              .eq('id', alt.id)
          } else {
            await supabase.from('alternativas').insert([
              {
                questao_id: questaoId,
                texto: alt.texto,
                correta: alt.correta,
                ordem: alt.ordem,
              },
            ])
          }
        }
      } else {
        // Insere nova Questão
        const { data: novaQ, error: errNovaQ } = await supabase
          .from('questoes')
          .insert([
            {
              questionario_id: questionarioIdAtivo,
              enunciado,
              ordem: ordemQuestao,
            },
          ])
          .select('id')
          .single()

        if (errNovaQ) throw errNovaQ
        questaoId = novaQ.id

        // Insere as alternativas
        const payloadAlts = alternativasForm.map((a, idx) => ({
          questao_id: questaoId,
          texto: a.texto,
          correta: a.correta,
          ordem: idx + 1,
        }))

        const { error: errAlts } = await supabase.from('alternativas').insert(payloadAlts)
        if (errAlts) throw errAlts
      }

      setMensagem({ tipo: 'sucesso', texto: 'Questão e alternativas salvas com sucesso!' })
      setModalQuestaoAberto(false)
      carregarQuestoesComGabarito(questionarioIdAtivo)
      onAtualizar()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar questão: ${err.message}` })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirQuestao = async (q: Questao) => {
    const confirmou = window.confirm(`Excluir a questão #${q.ordem} permanentemente?`)
    if (!confirmou) return

    try {
      const { error } = await supabase.from('questoes').delete().eq('id', q.id)
      if (error) throw error
      setMensagem({ tipo: 'sucesso', texto: 'Questão excluída com sucesso.' })
      carregarQuestoesComGabarito(questionarioIdAtivo)
      onAtualizar()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir questão: ${err.message}` })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
            Banco de Avaliações
          </span>
          <h2 className="text-lg font-bold text-white">Gerenciador de Atividades e Questionários</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Edite enunciados, alternativas e gabaritos das Atividades de Fixação e da Avaliação Final.
          </p>
        </div>

        <button
          onClick={handleAbrirNovaQuestao}
          className="inline-flex items-center gap-2 rounded-sm bg-sky-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 shadow-sm hover:bg-sky-400 transition"
        >
          <IconPlus className="w-4 h-4" />
          <span>Nova Questão</span>
        </button>
      </div>

      {mensagem && (
        <div
          className={`rounded-sm p-4 text-xs font-semibold border-l-4 ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500'
              : 'bg-red-950/60 text-red-300 border-red-500'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Seletor de Questionário com Arestas Retangulares */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
        {questionarios.map((q) => {
          const ativo = q.id === questionarioIdAtivo
          return (
            <button
              key={q.id}
              onClick={() => setQuestionarioIdAtivo(q.id)}
              className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-bold shrink-0 transition ${
                ativo
                  ? 'bg-sky-500 text-zinc-950 shadow-sm'
                  : 'border border-zinc-800 bg-[#11141c] text-zinc-400 hover:text-white'
              }`}
            >
              {q.tipo === 'FINAL' ? (
                <IconGraduationCap className="w-4 h-4" />
              ) : (
                <IconFileText className="w-4 h-4" />
              )}
              <span>{q.tipo === 'FINAL' ? 'Avaliação Final' : q.titulo}</span>
            </button>
          )
        })}
      </div>

      {/* Listagem das Questões do Questionário Ativo */}
      <div className="space-y-4">
        {carregandoQuestoes ? (
          <div className="p-8 text-center text-xs font-mono text-zinc-500">Carregando questões...</div>
        ) : questoesCompletas.length === 0 ? (
          <div className="rounded-sm border border-dashed border-zinc-800 bg-[#11141c] p-8 text-center text-xs text-zinc-500 font-mono">
            Nenhuma questão cadastrada para este questionário. Clique em &quot;Nova Questão&quot; acima.
          </div>
        ) : (
          questoesCompletas.map((q) => (
            <div
              key={q.id}
              className="rounded-sm border border-zinc-800 bg-[#11141c] p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white leading-snug">
                  <span className="text-sky-400 font-mono font-extrabold mr-2">Questão {q.ordem}.</span>
                  {q.enunciado}
                </h3>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAbrirEditarQuestao(q)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition"
                  >
                    <IconEdit className="w-3.5 h-3.5 text-sky-400" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleExcluirQuestao(q)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/60 transition"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lista de Alternativas com Gabarito em Destaque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.alternativas
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((alt) => (
                    <div
                      key={alt.id}
                      className={`flex items-start gap-2.5 rounded-sm border p-3 ${
                        alt.correta
                          ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300 font-medium'
                          : 'border-zinc-800 bg-[#090b10] text-zinc-300'
                      }`}
                    >
                      <span className="font-bold shrink-0 mt-0.5">
                        {alt.correta ? (
                          <IconCheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="inline-block w-4 h-4 rounded-full border border-zinc-700" />
                        )}
                      </span>
                      <span className="flex-1 leading-relaxed">{alt.texto}</span>
                      {alt.correta && (
                        <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded-xs border border-emerald-800/80">
                          Gabarito
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE QUESTÃO */}
      {modalQuestaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm bg-[#11141c] border border-zinc-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-3">
              {questaoEdicao ? `Editar Questão #${questaoEdicao.ordem}` : 'Nova Questão'}
            </h3>

            <form onSubmit={handleSalvarQuestao} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400">Enunciado da Questão</label>
                <textarea
                  rows={3}
                  required
                  value={enunciado}
                  onChange={(e) => setEnunciado(e.target.value)}
                  placeholder="Escreva aqui a pergunta..."
                  className="mt-1 w-full rounded-sm border border-zinc-700 bg-[#090b10] p-2.5 text-xs text-zinc-100 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400">Ordem da Questão</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={ordemQuestao}
                  onChange={(e) => setOrdemQuestao(parseInt(e.target.value) || 1)}
                  className="mt-1 w-24 rounded-sm border border-zinc-700 bg-[#090b10] p-2 text-xs text-zinc-100 focus:border-sky-400 focus:outline-none"
                />
              </div>

              {/* Alternativas */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-mono font-bold text-zinc-300">
                  Alternativas (Marque o seletor correspondente ao gabarito correto):
                </p>

                {alternativasForm.map((alt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="gabarito"
                      checked={alt.correta}
                      onChange={() => {
                        setAlternativasForm((prev) =>
                          prev.map((item, i) => ({
                            ...item,
                            correta: i === idx,
                          }))
                        )
                      }}
                      className="h-4 w-4 text-sky-400 focus:ring-sky-400 accent-sky-400 cursor-pointer"
                      title="Definir como resposta correta"
                    />

                    <input
                      type="text"
                      required
                      value={alt.texto}
                      onChange={(e) => {
                        const val = e.target.value
                        setAlternativasForm((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, texto: val } : item))
                        )
                      }}
                      placeholder={`Texto da alternativa ${idx + 1}...`}
                      className={`flex-1 rounded-sm border p-2 text-xs text-zinc-100 focus:outline-none ${
                        alt.correta
                          ? 'border-emerald-700 bg-emerald-950/20'
                          : 'border-zinc-700 bg-[#090b10]'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalQuestaoAberto(false)}
                  className="rounded-sm border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-sm bg-sky-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar Questão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
