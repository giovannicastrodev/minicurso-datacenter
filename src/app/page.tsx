'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import IfspLogo from '../components/ui/IfspLogo'
import MicrosoftLogo from '../components/ui/MicrosoftLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('Não foi possível realizar a autenticação. Verifique suas credenciais.')
      setCarregando(false)
    } else {
      router.push('/dashboard')
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
            Portal do Minicurso
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Acesse a plataforma de estudo de Operação em Data Centers
          </p>
        </div>

        {erro && (
          <div className="rounded-lg bg-red-950/60 p-4 text-sm font-medium text-red-300 border border-red-800/50">
            {erro}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
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
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={carregando}
              className="flex w-full justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Autenticando...' : 'Entrar na Plataforma'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Ainda não tem acesso?{' '}
          <Link href="/cadastro" className="font-semibold text-red-500 hover:text-red-400 transition-colors">
            Crie sua conta aqui
          </Link>
        </p>
      </div>
    </div>
  )
}