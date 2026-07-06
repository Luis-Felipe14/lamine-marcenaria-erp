import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { APP_MONOGRAM } from '@/lib/branding'
import { cn } from '@/lib/utils'

export function PwaInstallBanner() {
  const { visible, isIos, canInstall, install, dismiss } = usePwaInstall()

  if (!visible) return null

  return (
    <div
      className={cn(
        'pwa-install-banner animate-slide-up',
        'fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2',
      )}
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
    >
      <div className="glass-modal mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-gold/15 p-4 shadow-2xl">
        <img
          src={APP_MONOGRAM.primary}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl bg-black/40 object-contain p-1"
          onError={(e) => {
            e.currentTarget.src = APP_MONOGRAM.fallback
          }}
        />

        <div className="min-w-0 flex-1">
          <p id="pwa-install-title" className="text-sm font-semibold text-gray-100">
            Instalar Laminê ERP
          </p>
          <p id="pwa-install-desc" className="mt-0.5 text-xs leading-relaxed text-gray-400">
            {isIos ? (
              <>
                Toque em <Share className="inline h-3.5 w-3.5 align-text-bottom text-gold" aria-hidden />{' '}
                <strong className="font-medium text-gray-300">Compartilhar</strong> e depois em{' '}
                <strong className="font-medium text-gray-300">Adicionar à Tela de Início</strong>.
              </>
            ) : (
              'Acesse o sistema como app: mais rápido, em tela cheia e com ícone na tela inicial.'
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {!isIos && canInstall && (
              <Button type="button" size="sm" className="h-8 gap-1.5 rounded-full px-3" onClick={() => void install()}>
                <Download className="h-3.5 w-3.5" />
                Instalar app
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3 text-gray-400"
              onClick={dismiss}
            >
              Agora não
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
