'use client'

import React from 'react'
import IfspLogo from './ui/IfspLogo'
import MicrosoftLogo from './ui/MicrosoftLogo'
import {
  IconArrowRight,
  IconFileText,
  IconGraduationCap,
  IconCheckCircle,
  IconPlay,
} from './ui/Icons'

interface PrimeiroAcessoViewProps {
  nomeAluno: string
  onIniciarCurso: () => void
}

export default function PrimeiroAcessoView({
  nomeAluno,
  onIniciarCurso,
}: PrimeiroAcessoViewProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-12 py-6">
      {/* BANNER HERO INSTITUCIONAL */}
      <div className="relative overflow-hidden rounded-sm border border-zinc-800 bg-gradient-to-br from-[#0c0f17] via-[#11141c] to-[#090b10] p-8 sm:p-14 text-white shadow-2xl">
        <div className="relative z-10 space-y-6 max-w-3xl">
          {/* Header com os Logos Oficiais */}
          <div className="flex flex-wrap items-center gap-6 border-b border-zinc-800 pb-6">
            <IfspLogo textColor="light" className="h-10" />
            <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Em colaboração com
              </span>
              <MicrosoftLogo textColor="light" className="h-5" />
            </div>
          </div>

          <div className="space-y-3">
            <span className="inline-block rounded-xs bg-sky-950/80 border border-sky-800 px-3 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">
              Práticas em Sociedade 3 • IFSP Hortolândia
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Capacitação Profissional em <br />
              <span className="text-sky-400">Operação de Data Centers</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
              Bem-vindo(a), <strong className="text-white">{nomeAluno}</strong>. Este minicurso foi
              estruturado para conectar sua formação acadêmica às oportunidades reais de estágio,
              Jovem Aprendiz e carreiras técnicas geradas pela recente implantação do megacentro de
              dados da Microsoft na região de Hortolândia.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onIniciarCurso}
              className="inline-flex items-center justify-center gap-2.5 rounded-sm bg-sky-500 px-8 py-3.5 text-sm sm:text-base font-bold text-zinc-950 shadow-xl shadow-sky-500/20 hover:bg-sky-400 transition"
            >
              <span>Iniciar Trilha de Estudos</span>
              <IconArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Glow decorativo técnico de fundo */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* METODOLOGIA DE ENSINO E PROGRESSÃO */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
            Estrutura
          </span>
          <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-wide">
            Metodologia e Diretrizes da Trilha
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            O minicurso adota uma esteira pedagógica sequencial com pré-requisitos entre as etapas:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-sky-950/60 border border-sky-800 text-sky-400 font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-sm font-bold text-white">Leitura de Slides (16:9)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O conteúdo teórico principal é fornecido em apresentações de slides técnicos. A leitura completa é obrigatória.
            </p>
          </div>

          <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-sky-950/60 border border-sky-800 text-sky-400 font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-sm font-bold text-white">Vídeo Complementar</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cada módulo conta com vídeos complementares demonstrando procedimentos práticos e rotinas em salas de servidores.
            </p>
          </div>

          <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-sky-950/60 border border-sky-800 text-sky-400 font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-sm font-bold text-white">Atividades de Fixação</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Questionários objetivos em tela cheia com limite de 2 tentativas. Concluir a fixação libera o próximo módulo.
            </p>
          </div>

          <div className="rounded-sm border border-zinc-800 bg-[#11141c] p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-sky-950/60 border border-sky-800 text-sky-400 font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-sm font-bold text-white">Avaliação Final (70%)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Prova com cronômetro de 50 min. Ao atingir 70% de aproveitamento, o Certificado Oficial de 10h é emitido.
            </p>
          </div>
        </div>
      </section>

      {/* CONTEÚDO PROGRAMÁTICO DOS MÓDULOS */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
            Ementa
          </span>
          <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-wide">
            Grade Curricular do Minicurso
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-4 rounded-sm border border-zinc-800 bg-[#11141c] p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#090b10] border border-zinc-800 text-sky-400 font-mono font-bold text-sm">
              M1
            </span>
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">Módulo 1</span>
              <h3 className="text-sm font-bold text-white">
                Fundamentos de Infraestrutura de Centros de Dados e Missão Crítica
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Topologia de Data Centers Hyperscale e Enterprise, conceitos de disponibilidade contínua, zonas de acesso e perfil do técnico operacional.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-sm border border-zinc-800 bg-[#11141c] p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#090b10] border border-zinc-800 text-sky-400 font-mono font-bold text-sm">
              M2
            </span>
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">Módulo 2</span>
              <h3 className="text-sm font-bold text-white">
                Climatização de Precisão (HVAC), Confinamento e Métrica de Eficiência (PUE)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Gestão de corredores quentes e frios, medição de índice de eficiência PUE e sustentabilidade em operações de nuvem em larga escala.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-sm border border-zinc-800 bg-[#11141c] p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-[#090b10] border border-zinc-800 text-sky-400 font-mono font-bold text-sm">
              M3
            </span>
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">Módulo 3</span>
              <h3 className="text-sm font-bold text-white">
                Segurança Física, Diretrizes EHS e Rotinas de Checklist Operacional
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Normas de segurança do trabalho (EHS), proteção contra descarga eletrostática (ESD), controle de acesso por eclusa (Man-trap) e procedimentos de rondas (Roundings).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA INFERIOR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-sm border border-zinc-800 bg-[#11141c] p-7">
        <div>
          <h3 className="text-base font-bold text-white">Tudo pronto para começar?</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Seu progresso será registrado e persistido automaticamente a cada etapa concluída.
          </p>
        </div>

        <button
          onClick={onIniciarCurso}
          className="inline-flex items-center gap-2 rounded-sm bg-sky-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-zinc-950 hover:bg-sky-400 transition"
        >
          <span>Acessar Linha do Tempo</span>
          <IconArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
