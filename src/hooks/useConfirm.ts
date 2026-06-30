import { useCallback, useRef, useState } from 'react'
import type { ConfirmDialogProps } from '@/components/shared/ConfirmDialog'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export function useConfirm() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' })

  const confirm = useCallback((input: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof input === 'string' ? { message: input } : input

    return new Promise((resolve) => {
      resolveRef.current = resolve
      setOptions({
        title: 'Confirmar exclusão',
        confirmLabel: 'Excluir',
        cancelLabel: 'Cancelar',
        ...normalized,
      })
      setOpen(true)
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setOpen(false)
    setLoading(false)
    resolveRef.current?.(result)
    resolveRef.current = null
  }, [])

  const dialogProps: ConfirmDialogProps = {
    open,
    loading,
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    onConfirm: () => close(true),
    onCancel: () => close(false),
  }

  return { confirm, dialogProps, setConfirmLoading: setLoading }
}
