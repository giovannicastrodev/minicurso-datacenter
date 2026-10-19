'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import IfspLogo from '../../components/ui/IfspLogo'
import MicrosoftLogo from '../../components/ui/MicrosoftLogo'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: nome,
        },
      },
    })

    if (error) {
      setErro('Erro ao criar conta. Verifique os dados informados.')
      setCarregando(false)
    } else {
      alert('Conta criada com sucesso! Faça login para acessar o minicurso.')
      router.push('/')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0e12] px-4 sm:px-6 lg:px-8 text-zinc-100">
      {/* Logos de Identidade no Topo */}
      <div className="mb-8 flex items-center justify-center gap-6">
        <IfspLogo className="h-9 w-auto" />
        <div className="h-6 w-px bg-zinc-800" />
        <MicrosoftLogo className="h-6 w-auto" />
      </div>

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#16181e] p-8 shadow-2xl border border-zinc-800/80">
        <div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-white">
            Criar Nova Conta
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Cadastre-se para acessar as aulas e certificações
          </p>
        </div>

        {erro && (
          <div className="rounded-lg bg-red-950/60 p-4 text-sm font-medium text-red-300 border border-red-800/50">
            {erro}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleCadastro}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-800 bg-[#0c0d10] px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm transition-all"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-800 bg-[#0c0d10] px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm transition-all"
                placeholder="aluno@ifsp.edu.br"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Senha
              </label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-zinc-800 bg-[#0c0d10] px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={carregando}
              className="flex w-full justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Já possui acesso?{' '}
          <Link href="/" className="font-semibold text-red-500 hover:text-red-400 transition-colors">
            Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  )
}