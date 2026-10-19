'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Questionario, Questao, Alternativa } from '../../types/database'
import { supabase } from '../../lib/supabase'

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

  // Carrega as questões completas com o gabarito (já que o gestor possui permissão)
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

  const questionarioAtual = questionarios.find((q) => q.id === questionarioIdAtivo)

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gerenciador de Atividades e Questionários</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Edite enunciados, alternativas e gabaritos das Atividades de Fixação e da Avaliação Final.
          </p>
        </div>

        <button
          onClick={handleAbrirNovaQuestao}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-purple-800 transition"
        >
          <span>➕</span>
          <span>Adicionar Questão</span>
        </button>
      </div>

      {mensagem && (
        <div
          className={`rounded-xl p-4 text-xs font-semibold ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Seletor de Questionário */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {questionarios.map((q) => {
          const ativo = q.id === questionarioIdAtivo
          return (
            <button
              key={q.id}
              onClick={() => setQuestionarioIdAtivo(q.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold shrink-0 transition ${
                ativo
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {q.tipo === 'FINAL' ? '🎓 Avaliação Final' : `📝 ${q.titulo}`}
            </button>
          )
        })}
      </div>

      {/* Listagem das Questões do Questionário Ativo */}
      <div className="space-y-4">
        {carregandoQuestoes ? (
          <div className="p-8 text-center text-xs text-gray-400">Carregando questões...</div>
        ) : questoesCompletas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
            Nenhuma questão cadastrada para este questionário. Clique em &quot;Adicionar Questão&quot; acima.
          </div>
        ) : (
          questoesCompletas.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 leading-snug">
                  <span className="text-indigo-600 font-extrabold mr-2">Questão {q.ordem}.</span>
                  {q.enunciado}
                </h3>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAbrirEditarQuestao(q)}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleExcluirQuestao(q)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Lista de Alternativas com o Gabarito em Destaque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.alternativas
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((alt) => (
                    <div
                      key={alt.id}
                      className={`flex items-start gap-2 rounded-xl border p-3 ${
                        alt.correta
                          ? 'border-green-300 bg-green-50/70 text-green-900 font-medium'
                          : 'border-gray-200 bg-gray-50/50 text-gray-700'
                      }`}
                    >
                      <span className="font-bold">{alt.correta ? '✅' : '⚪'}</span>
                      <span className="flex-1 leading-relaxed">{alt.texto}</span>
                      {alt.correta && (
                        <span className="text-[10px] font-bold uppercase text-green-700 bg-green-200/60 px-1.5 py-0.5 rounded">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3">
              {questaoEdicao ? `Editar Questão #${questaoEdicao.ordem}` : 'Nova Questão'}
            </h3>

            <form onSubmit={handleSalvarQuestao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Enunciado da Questão</label>
                <textarea
                  rows={3}
                  required
                  value={enunciado}
                  onChange={(e) => setEnunciado(e.target.value)}
                  placeholder="Escreva aqui a pergunta..."
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Ordem da Questão</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={ordemQuestao}
                  onChange={(e) => setOrdemQuestao(parseInt(e.target.value) || 1)}
                  className="mt-1 w-24 rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Alternativas */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-gray-700">
                  Alternativas (Marque o círculo da alternativa que é a resposta correta):
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
                      className="h-4 w-4 text-green-600 focus:ring-green-500 cursor-pointer"
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
                      className={`flex-1 rounded-lg border p-2 text-xs text-gray-900 focus:outline-none ${
                        alt.correta
                          ? 'border-green-400 bg-green-50/30'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setModalQuestaoAberto(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
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

