import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { MaterialCategoryOption } from '@/services/material-categories.service'

interface MaterialCategoriesSectionProps {
  title: string
  description?: string
  categories: MaterialCategoryOption[]
  canEdit: boolean
  newCategoryName: string
  onNewCategoryNameChange: (value: string) => void
  onAdd: () => void
  saving: boolean
  editingCategoryId: string | null
  editingCategoryLabel: string
  onEditingLabelChange: (value: string) => void
  onStartEdit: (id: string, label: string) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  deletingCategoryId: string | null
  onDelete: (id: string, value: string, label: string) => void
  addPlaceholder?: string
}

export function MaterialCategoriesSection({
  title,
  description,
  categories,
  canEdit,
  newCategoryName,
  onNewCategoryNameChange,
  onAdd,
  saving,
  editingCategoryId,
  editingCategoryLabel,
  onEditingLabelChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  deletingCategoryId,
  onDelete,
  addPlaceholder = 'Nova categoria',
}: MaterialCategoriesSectionProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg bg-surface-elevated p-2 text-sm">
              {editingCategoryId === c.id ? (
                <>
                  <Input
                    value={editingCategoryLabel}
                    onChange={(e) => onEditingLabelChange(e.target.value)}
                    className="h-8 flex-1"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={saving}
                    onClick={onSaveEdit}
                  >
                    <Check className="h-4 w-4 text-green-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {canEdit && (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onStartEdit(c.id, c.label)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={deletingCategoryId === c.id}
                        onClick={() => onDelete(c.id, c.value, c.label)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row sm:items-center">
            <Input
              value={newCategoryName}
              onChange={(e) => onNewCategoryNameChange(e.target.value)}
              placeholder={addPlaceholder}
              className="sm:flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAdd()
              }}
            />
            <Button disabled={saving || !newCategoryName.trim()} onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}