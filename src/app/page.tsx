'use client'

import { useState, useEffect } from 'react'
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

  // Garante que o botão nunca fique preso em "Autenticando..." ao retornar da dashboard ou logout
  useEffect(() => {
    setCarregando(false)
  }, [])

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
      setCarregando(false)
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090b10] px-4 sm:px-6 lg:px-8 text-zinc-100">
      {/* Logos de Identidade no Topo */}
      <div className="mb-8 flex items-center justify-center gap-6">
        <IfspLogo className="h-9 w-auto" />
        <div className="h-6 w-px bg-zinc-800" />
        <MicrosoftLogo className="h-6 w-auto" />
      </div>

      <div className="w-full max-w-md space-y-7 rounded-sm bg-[#11141c] p-8 shadow-2xl border border-zinc-800/80">
        <div className="border-b border-zinc-800/80 pb-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
            Ambiente de Aprendizado
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Portal do Minicurso
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Acesse a plataforma técnica de Operação em Data Centers
          </p>
        </div>

        {erro && (
          <div className="rounded-sm bg-red-950/60 p-3.5 text-xs font-medium text-red-300 border-l-2 border-red-500">
            {erro}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                E-mail Institucional / Pessoal
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-sm border border-zinc-800 bg-[#090b10] px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm transition-all"
                placeholder="aluno@ifsp.edu.br"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Senha de Acesso
              </label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1.5 block w-full rounded-sm border border-zinc-800 bg-[#090b10] px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={carregando}
              className="flex w-full justify-center rounded-sm bg-sky-500 px-4 py-3 text-xs sm:text-sm font-bold text-zinc-950 shadow-md shadow-sky-500/20 transition-all hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Autenticando...' : 'Entrar na Plataforma'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
          Ainda não tem acesso?{' '}
          <Link href="/cadastro" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            Cadastre-se aqui
          </Link>
        </p>
      </div>
    </div>
  )
}
