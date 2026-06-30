import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title = 'Confirmar exclusão',
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onCancel()}>
      <DialogContent
        className={cn(
          'max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl',
          '[&>button]:hidden'
        )}
        aria-describedby="confirm-dialog-desc"
      >
        <div className="border-b border-white/5 bg-red-500/5 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription id="confirm-dialog-desc" className="text-gray-400">
                {message}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? 'Excluindo...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
