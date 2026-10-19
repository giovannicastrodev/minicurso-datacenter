'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

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

    // Executa a autenticação via Supabase Auth conforme especificado no UC02
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('Não foi possível realizar a autenticação. Verifique suas credenciais.')
      setCarregando(false)
    } else {
      // Redireciona para a dashboard do minicurso após o sucesso (UC02 / Sequência de Login)
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Minicurso de Data Center
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Entre com sua conta para acessar os conteúdos e avaliações.
          </p>
        </div>

        {erro && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="aluno@ifsp.edu.br"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {carregando ? 'Autenticando...' : 'Entrar na Plataforma'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Ainda não tem conta?{' '}
            <Link href="/cadastro" className="font-medium text-indigo-600 hover:text-indigo-500">
              Cadastre-se aqui
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}