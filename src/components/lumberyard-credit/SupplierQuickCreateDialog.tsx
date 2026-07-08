import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MaskedInput } from '@/components/ui/masked-input'
import { createSupplier, type Supplier } from '@/services/suppliers.service'

interface SupplierQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (supplier: Supplier) => void
}

export function SupplierQuickCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: SupplierQuickCreateDialogProps) {
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setDocument('')
    setPhone('')
    setEmail('')
    setNotes('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do fornecedor')
      return
    }

    setSubmitting(true)
    try {
      const supplier = await createSupplier({
        name,
        document,
        phone,
        email,
        notes,
      })
      toast.success('Fornecedor cadastrado!')
      onCreated(supplier)
      handleOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cadastrar fornecedor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[90] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo fornecedor</DialogTitle>
          <DialogDescription>
            Cadastre a madereira ou fornecedor para usar nas saídas de crédito e compras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Madereira Central"
              autoFocus
            />
          </div>
          <div>
            <Label>CNPJ / CPF</Label>
            <MaskedInput mask="cpfCnpj" value={document} onChange={setDocument} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <MaskedInput mask="phone" value={phone} onChange={setPhone} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Contato, endereço, combinados..."
            />
          </div>
        </div>

        <Button onClick={() => void onSubmit()} className="w-full" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Cadastrar fornecedor'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
