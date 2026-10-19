'use client'

import React, { useState } from 'react'
import { Aula, MaterialComplementar } from '../../types/database'
import { supabase } from '../../lib/supabase'

interface GerenciadorAulasProps {
  aulas: Aula[]
  onAtualizar: () => void
}

export default function GerenciadorAulas({ aulas, onAtualizar }: GerenciadorAulasProps) {
  // Estado para Criar / Editar Aula
  const [modalAulaAberto, setModalAulaAberto] = useState(false)
  const [aulaEdicao, setAulaEdicao] = useState<Aula | null>(null)
  const [tituloAula, setTituloAula] = useState('')
  const [descricaoAula, setDescricaoAula] = useState('')
  const [urlVideo, setUrlVideo] = useState('')
  const [ordemAula, setOrdemAula] = useState(1)
  const [salvandoAula, setSalvandoAula] = useState(false)

  // Estado para Adicionar Material
  const [aulaAdicionarMaterial, setAulaAdicionarMaterial] = useState<Aula | null>(null)
  const [tituloMaterial, setTituloMaterial] = useState('')
  const [urlMaterial, setUrlMaterial] = useState('')
  const [salvandoMaterial, setSalvandoMaterial] = useState(false)

  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  )

  const handleAbrirNovaAula = () => {
    setAulaEdicao(null)
    setTituloAula('')
    setDescricaoAula('')
    setUrlVideo('')
    setOrdemAula((aulas.length > 0 ? Math.max(...aulas.map((a) => a.ordem)) : 0) + 1)
    setModalAulaAberto(true)
  }

  const handleAbrirEditarAula = (aula: Aula) => {
    setAulaEdicao(aula)
    setTituloAula(aula.titulo)
    setDescricaoAula(aula.descricao)
    setUrlVideo(aula.url_video)
    setOrdemAula(aula.ordem)
    setModalAulaAberto(true)
  }

  const handleSalvarAula = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoAula(true)
    setMensagem(null)

    // Formata o URL do YouTube se for link comum
    let urlFinal = urlVideo.trim()
    if (urlFinal.includes('watch?v=')) {
      urlFinal = urlFinal.replace('watch?v=', 'embed/')
    } else if (urlFinal.includes('youtu.be/')) {
      urlFinal = urlFinal.replace('youtu.be/', 'www.youtube.com/embed/')
    }

    try {
      if (aulaEdicao) {
        // Atualização
        const { error } = await supabase
          .from('aulas')
          .update({
            titulo: tituloAula,
            descricao: descricaoAula,
            url_video: urlFinal,
            ordem: ordemAula,
          })
          .eq('id', aulaEdicao.id)

        if (error) throw error
        setMensagem({ tipo: 'sucesso', texto: 'Módulo/Aula atualizado com sucesso!' })
      } else {
        // Inserção
        const { error } = await supabase.from('aulas').insert([
          {
            titulo: tituloAula,
            descricao: descricaoAula,
            url_video: urlFinal,
            ordem: ordemAula,
          },
        ])

        if (error) throw error
        setMensagem({ tipo: 'sucesso', texto: 'Novo módulo/aula criado com sucesso!' })
      }

      setModalAulaAberto(false)
      onAtualizar()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar aula: ${err.message}` })
    } finally {
      setSalvandoAula(false)
    }
  }

  const handleExcluirAula = async (aula: Aula) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir a "Aula ${aula.ordem}: ${aula.titulo}"? Todas as atividades e materiais associados serão excluídos permanentemente.`
    )
    if (!confirmou) return

    try {
      const { error } = await supabase.from('aulas').delete().eq('id', aula.id)
      if (error) throw error
      setMensagem({ tipo: 'sucesso', texto: 'Aula excluída com sucesso.' })
      onAtualizar()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir aula: ${err.message}` })
    }
  }

  // --- MATERIAIS COMPLEMENTARES ---
  const handleSalvarMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aulaAdicionarMaterial) return

    setSalvandoMaterial(true)
    setMensagem(null)

    try {
      const { error } = await supabase.from('materiais').insert([
        {
          aula_id: aulaAdicionarMaterial.id,
          titulo: tituloMaterial,
          url_arquivo: urlMaterial,
        },
      ])

      if (error) throw error
      setMensagem({ tipo: 'sucesso', texto: 'Material anexado com sucesso!' })
      setAulaAdicionarMaterial(null)
      setTituloMaterial('')
      setUrlMaterial('')
      onAtualizar()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao anexar material: ${err.message}` })
    } finally {
      setSalvandoMaterial(false)
    }
  }

  const handleExcluirMaterial = async (matId: string, titulo: string) => {
    const confirmou = window.confirm(`Deseja remover o material "${titulo}"?`)
    if (!confirmou) return

    try {
      const { error } = await supabase.from('materiais').delete().eq('id', matId)
      if (error) throw error
      setMensagem({ tipo: 'sucesso', texto: 'Material removido com sucesso.' })
      onAtualizar()
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao remover material: ${err.message}` })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gerenciador de Módulos e Videoaulas</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cadastre, renomeie e edite as aulas, vídeos do YouTube e arquivos em PDF/Slides do minicurso.
          </p>
        </div>

        <button
          onClick={handleAbrirNovaAula}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition"
        >
          <span>➕</span>
          <span>Adicionar Novo Módulo</span>
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

      {/* Lista de Aulas */}
      <div className="space-y-6">
        {aulas
          .sort((a, b) => a.ordem - b.ordem)
          .map((aula) => (
            <div
              key={aula.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4"
            >
              {/* Linha Superior: Ordem, Título e Ações */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-sm">
                    {aula.ordem}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{aula.titulo}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{aula.descricao}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleAbrirEditarAula(aula)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    ✏️ Editar Aula
                  </button>
                  <button
                    onClick={() => handleExcluirAula(aula)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>

              {/* Informações de Mídia e Vídeo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                    Player de Vídeo Configurado
                  </h4>
                  <div className="aspect-video w-full max-w-sm rounded-xl overflow-hidden bg-black shadow-inner">
                    <iframe
                      src={aula.url_video}
                      title={aula.titulo}
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-mono text-gray-400 truncate">
                    {aula.url_video}
                  </p>
                </div>

                {/* Materiais Complementares da Aula */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase text-gray-500">
                      Materiais em PDF / Slides ({aula.materiais?.length || 0})
                    </h4>
                    <button
                      onClick={() => {
                        setAulaAdicionarMaterial(aula)
                        setTituloMaterial('')
                        setUrlMaterial('')
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      + Anexar PDF/Slide
                    </button>
                  </div>

                  {aula.materiais && aula.materiais.length > 0 ? (
                    <div className="space-y-2">
                      {aula.materiais.map((mat) => (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span>📄</span>
                            <a
                              href={mat.url_arquivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-gray-800 hover:text-indigo-600 truncate"
                            >
                              {mat.titulo}
                            </a>
                          </div>
                          <button
                            onClick={() => handleExcluirMaterial(mat.id, mat.titulo)}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5"
                            title="Remover este material"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                      Nenhum arquivo PDF ou apresentação vinculado a esta aula.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE AULA */}
      {modalAulaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-3">
              {aulaEdicao ? `Editar Módulo ${aulaEdicao.ordem}` : 'Adicionar Novo Módulo'}
            </h3>

            <form onSubmit={handleSalvarAula} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Título do Módulo</label>
                <input
                  type="text"
                  required
                  value={tituloAula}
                  onChange={(e) => setTituloAula(e.target.value)}
                  placeholder="Ex: Introdução aos Centros de Dados"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Descrição / Ementa</label>
                <textarea
                  rows={3}
                  required
                  value={descricaoAula}
                  onChange={(e) => setDescricaoAula(e.target.value)}
                  placeholder="Resumo dos tópicos abordados nesta aula..."
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700">
                    URL do Vídeo (YouTube)
                  </label>
                  <input
                    type="url"
                    required
                    value={urlVideo}
                    onChange={(e) => setUrlVideo(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">Ordem na Trilha</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={ordemAula}
                    onChange={(e) => setOrdemAula(parseInt(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setModalAulaAberto(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAula}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {salvandoAula ? 'Salvando...' : 'Salvar Módulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ADICIONAR MATERIAL COMPLEMENTAR */}
      {aulaAdicionarMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 border-b pb-3">
              Anexar Arquivo PDF / Apresentação
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Vinculando à <strong>Aula {aulaAdicionarMaterial.ordem}: {aulaAdicionarMaterial.titulo}</strong>
            </p>

            <form onSubmit={handleSalvarMaterial} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700">Título do Material</label>
                <input
                  type="text"
                  required
                  value={tituloMaterial}
                  onChange={(e) => setTituloMaterial(e.target.value)}
                  placeholder="Ex: Apostila de Operações Térmicas (PDF)"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Link / URL do Arquivo PDF ou Slides (Canva/Gamma)
                </label>
                <input
                  type="url"
                  required
                  value={urlMaterial}
                  onChange={(e) => setUrlMaterial(e.target.value)}
                  placeholder="https://.../meu-arquivo.pdf"
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setAulaAdicionarMaterial(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoMaterial}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {salvandoMaterial ? 'Anexando...' : 'Salvar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

