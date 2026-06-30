import { getLoginVideoSrc } from '@/lib/login-assets'

export const LOGIN_VIDEO = {
  poster: '/login/slide-1.svg',
  get src() {
    return getLoginVideoSrc()
  },
} as const
