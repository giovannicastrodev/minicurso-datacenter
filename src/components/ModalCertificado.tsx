'use client'

import React from 'react'
import { Certificado } from '../types/database'
import IfspLogo from './ui/IfspLogo'
import MicrosoftLogo from './ui/MicrosoftLogo'
import { IconPrinter, IconAward, IconCheckCircle } from './ui/Icons'

interface ModalCertificadoProps {
  certificado: Certificado
  nomeAluno: string
  isOpen: boolean
  onClose: () => void
}

export default function ModalCertificado({
  certificado,
  nomeAluno,
  isOpen,
  onClose,
}: ModalCertificadoProps) {
  if (!isOpen) return null

  const dataFormatada = new Date(certificado.emitido_em).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const handleImprimir = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
      <div className="relative max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl">
        {/* BARRA SUPERIOR DE AÇÕES */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <IconAward className="w-5 h-5 text-red-500" />
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Certificado Oficial de Conclusão
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-red-700 transition"
            >
              <IconPrinter className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* ÁREA DO CERTIFICADO OFICIAL INSTITUCIONAL */}
        <div className="mt-6 border-8 border-double border-zinc-900 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-8 sm:p-14 text-center text-zinc-100 shadow-2xl rounded-2xl relative overflow-hidden print:bg-white print:text-black print:border-black">
          {/* Cabeçalho com as marcas oficiais */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-zinc-800 pb-8 print:border-black">
            <IfspLogo textColor="light" className="h-12" />
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                Cooperação Técnica
              </span>
              <MicrosoftLogo textColor="light" className="h-6" />
            </div>
          </div>

          <div className="my-8 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-red-500 font-bold">
              República Federativa do Brasil • Ministério da Educação
            </span>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold text-white tracking-wide print:text-black">
              CERTIFICADO DE CONCLUSÃO
            </h1>
          </div>

          {/* Declaração Oficial */}
          <div className="my-10 space-y-5 max-w-2xl mx-auto">
            <p className="text-xs sm:text-sm text-zinc-300 print:text-zinc-700">
              Certificamos para os devidos fins de direito que
            </p>

            <p className="text-2xl sm:text-3xl font-serif font-bold text-red-400 underline decoration-red-700 underline-offset-8 print:text-black">
              {nomeAluno || 'Estudante'}
            </p>

            <p className="text-xs sm:text-sm leading-relaxed text-zinc-300 print:text-zinc-700">
              concluiu com aproveitamento todas as atividades teóricas e práticas, e obteve aprovação na
              Avaliação Final do minicurso{' '}
              <strong className="text-white print:text-black">
                Introdução à Operação de Data Centers
              </strong>
              , compreendendo os fundamentos de infraestrutura de missão crítica, climatização e PUE,
              redundância elétrica 2N, diretrizes EHS e procedimentos operacionais padronizados.
            </p>
          </div>

          {/* Metadados Técnicos de Rodapé */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-zinc-800 pt-8 text-left text-xs text-zinc-400 print:border-black print:text-black">
            <div>
              <p className="font-bold text-zinc-200 print:text-black uppercase tracking-wider text-[10px]">
                Carga Horária
              </p>
              <p className="mt-1 font-semibold text-zinc-300 print:text-black">
                10 Horas Complementares
              </p>
            </div>

            <div>
              <p className="font-bold text-zinc-200 print:text-black uppercase tracking-wider text-[10px]">
                Data de Emissão
              </p>
              <p className="mt-1 font-semibold text-zinc-300 print:text-black">{dataFormatada}</p>
            </div>

            <div>
              <p className="font-bold text-zinc-200 print:text-black uppercase tracking-wider text-[10px]">
                Código de Autenticidade
              </p>
              <p className="mt-1 font-mono font-bold text-red-400 print:text-black">
                {certificado.codigo}
              </p>
            </div>
          </div>

          {/* Assinatura Oficial */}
          <div className="mt-12 pt-6 flex justify-center">
            <div className="text-center">
              <div className="w-72 border-b border-zinc-700 pb-1 text-xs font-serif italic text-zinc-300 print:text-black print:border-black">
                Coordenação de Práticas em Sociedade
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 print:text-zinc-600">
                IFSP Câmpus Hortolândia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
