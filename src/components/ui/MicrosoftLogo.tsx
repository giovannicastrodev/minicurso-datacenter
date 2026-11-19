import React from 'react'

interface MicrosoftLogoProps {
  className?: string
  showText?: boolean
  textColor?: 'dark' | 'light'
}

export default function MicrosoftLogo({
  className = 'h-7',
  showText = true,
  textColor = 'dark',
}: MicrosoftLogoProps) {
  const isLight = textColor === 'light'

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* 4 Quadrados Coloridos Oficiais da Microsoft */}
      <svg
        viewBox="0 0 23 23"
        className="h-full w-auto shrink-0 select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="11" height="11" fill="#F25022" />
        <rect x="12" width="11" height="11" fill="#7FBA00" />
        <rect y="12" width="11" height="11" fill="#00A4EF" />
        <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
      </svg>

      {showText && (
        <span
          className={`font-sans text-sm sm:text-base font-semibold tracking-tight select-none ${
            isLight ? 'text-white' : 'text-zinc-800'
          }`}
        >
          Microsoft
        </span>
      )}
    </div>
  )
}

