import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'

export interface EmployeePayrollOption {
  id: string
  name: string
  salary: number | null
  position: string | null
  is_active: boolean
}

interface EmployeeSelectProps {
  employees: EmployeePayrollOption[]
  value: string
  onSelect: (employee: EmployeePayrollOption) => void
  placeholder?: string
}

export function EmployeeSelect({ employees, value, onSelect, placeholder = 'Buscar colaborador...' }: EmployeeSelectProps) {
  const [search, setSearch] = useState('')

  const selected = employees.find((e) => e.id === value)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = employees.filter((e) => e.is_active || e.id === value)
    if (!term) return list
    return list.filter((e) =>
      e.name.toLowerCase().includes(term)
      || (e.position?.toLowerCase().includes(term) ?? false),
    )
  }, [employees, search, value])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {selected && (
        <p className="text-xs text-gray-400">
          Selecionado: <span className="text-white">{selected.name}</span>
          {selected.position ? ` · ${selected.position}` : ''}
        </p>
      )}

      <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-elevated">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-gray-500">Nenhum colaborador encontrado</p>
        ) : (
          filtered.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => {
                onSelect(employee)
                setSearch('')
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 border-b border-white/5 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-white/5',
                value === employee.id && 'bg-gold/10',
              )}
            >
              <span>
                <span className="font-medium text-white">{employee.name}</span>
                {employee.position && (
                  <span className="mt-0.5 block text-xs text-gray-500">{employee.position}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-gold">
                {employee.salary != null && employee.salary > 0
                  ? formatCurrency(employee.salary)
                  : 'Sem salário'}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
