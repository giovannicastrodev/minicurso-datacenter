'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    setCarregando(false)
  }, [])

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: { nome: nome.trim() },
      },
    })

    if (error) {
      console.error('Erro signUp:', error.status, error.code, error.message)

      const msg = error.message.toLowerCase()
      if (msg.includes('already registered')) {
        setErro('Este e-mail já possui cadastro. Faça login.')
      } else if (msg.includes('rate limit')) {
        setErro('Limite de envio de e-mails atingido. Aguarde um pouco e tente novamente.')
      } else if (msg.includes('password')) {
        setErro('Senha inválida: ' + error.message)
      } else if (msg.includes('database error')) {
        setErro('Erro no banco ao criar o perfil (verifique o trigger no Supabase).')
      } else {
        setErro(`Erro ao criar conta: ${error.message}`)
      }
      setCarregando(false)
      return
    }

    if (data.user && !data.session) {
      alert('Conta criada! Confirme seu e-mail (veja também o spam) e depois faça login.')
    } else {
      alert('Conta criada com sucesso! Faça login para acessar o minicurso.')
    }
    setCarregando(false)
    router.push('/')
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
            Novo Usuário
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Criar Nova Conta
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Cadastre-se para acessar as aulas e certificações do minicurso
          </p>
        </div>

        {erro && (
          <div className="rounded-sm bg-red-950/60 p-3.5 text-xs font-medium text-red-300 border-l-2 border-red-500">
            {erro}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleCadastro}>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1.5 block w-full rounded-sm border border-zinc-800 bg-[#090b10] px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm transition-all"
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                E-mail Institucional ou Pessoal
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
                Senha
              </label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1.5 block w-full rounded-sm border border-zinc-800 bg-[#090b10] px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 text-xs sm:text-sm transition-all"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={carregando}
              className="flex w-full justify-center rounded-sm bg-sky-500 px-4 py-3 text-xs sm:text-sm font-bold text-zinc-950 shadow-md shadow-sky-500/20 transition-all hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
          Já possui acesso?{' '}
          <Link href="/" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  )
}
