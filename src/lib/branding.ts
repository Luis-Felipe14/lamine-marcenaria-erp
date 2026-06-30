/** Coloque o arquivo em public/lamine-logo.png */
export const APP_LOGO = {
  primary: '/lamine-logo.png',
  fallback: '/lamine-logo.svg',
} as const

/** Coloque o arquivo em public/lamine-monogram.png (sidebar minimizada e favicon) */
export const APP_MONOGRAM = {
  primary: '/lamine-monogram.png',
  fallback: '/lamine-monogram.svg',
} as const

/** Favicon da aba — usa o mesmo monograma */
export const APP_FAVICON = APP_MONOGRAM

/** Coloque public/lamine-background.png — quando existir, será a camada principal do fundo */
export const APP_BACKGROUND = {
  optionalPhoto: '/lamine-background.png',
} as const
