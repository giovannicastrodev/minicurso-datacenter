'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

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

    // Envia o nome nos metadados para que o gatilho crie o registro na tabela "perfis"
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
      alert('Conta criada com sucesso! Verifique seu e-mail se necessário ou faça login.')
      router.push('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Cadastro de Aluno
        </h2>

        {erro && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleCadastro}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none sm:text-sm"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none sm:text-sm"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {carregando ? 'Cadastrando...' : 'Criar Conta'}
          </button>

          <div className="text-center text-sm text-gray-600">
            Já tem uma conta?{' '}
            <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
              Faça login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}