import React from 'react'

interface IfspLogoProps {
  className?: string
  showText?: boolean
  textColor?: 'dark' | 'light'
}

export default function IfspLogo({
  className = 'h-10',
  showText = true,
  textColor = 'dark',
}: IfspLogoProps) {
  const isLight = textColor === 'light'

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Símbolo Oficial da Rede Federal de Educação Profissional e Tecnológica */}
      <svg
        viewBox="0 0 110 135"
        className="h-full w-auto shrink-0 select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Linha 1 */}
        {/* Círculo Vermelho Superior Esquerdo */}
        <circle cx="16" cy="16" r="16" fill="#C4161C" />
        {/* Retângulo Verde 1 */}
        <rect x="38" y="0" width="32" height="32" rx="4" fill="#009640" />
        {/* Retângulo Verde 2 */}
        <rect x="76" y="0" width="32" height="32" rx="4" fill="#009640" />

        {/* Linha 2 */}
        {/* Retângulo Verde 3 */}
        <rect x="0" y="38" width="32" height="32" rx="4" fill="#009640" />
        {/* Retângulo Verde 4 */}
        <rect x="38" y="38" width="32" height="32" rx="4" fill="#009640" />
        {/* Retângulo Verde 5 */}
        <rect x="76" y="38" width="32" height="32" rx="4" fill="#009640" />

        {/* Linha 3 */}
        {/* Retângulo Verde 6 */}
        <rect x="0" y="76" width="32" height="32" rx="4" fill="#009640" />
        {/* Retângulo Verde 7 */}
        <rect x="38" y="76" width="32" height="32" rx="4" fill="#009640" />

        {/* Haste inferior (identidade oficial dos Institutos Federais) */}
        <rect x="0" y="114" width="32" height="21" rx="4" fill="#009640" />
      </svg>

      {/* Tipografia Oficial do Câmpus Hortolândia */}
      {showText && (
        <div className="flex flex-col justify-center leading-tight select-none">
          <span
            className={`text-sm sm:text-base font-extrabold tracking-tight uppercase ${
              isLight ? 'text-white' : 'text-zinc-900'
            }`}
          >
            INSTITUTO FEDERAL
          </span>
          <span
            className={`text-xs sm:text-sm font-semibold tracking-wide ${
              isLight ? 'text-zinc-300' : 'text-zinc-700'
            }`}
          >
            São Paulo
          </span>
          <span
            className={`text-[11px] font-medium tracking-normal ${
              isLight ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            Câmpus Hortolândia
          </span>
        </div>
      )}
    </div>
  )
}

