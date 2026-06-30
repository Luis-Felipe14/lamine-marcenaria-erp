import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NAV_ENTRIES } from '@/lib/navigation'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const recentPages = useUIStore((s) => s.recentPages)
  const addRecentPage = useUIStore((s) => s.addRecentPage)
  const role = useAuthStore((s) => s.profile?.role?.name) as UserRole | undefined
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const visibleEntries = useMemo(
    () => NAV_ENTRIES.filter((e) => !e.permission || hasPermission(role, e.permission)),
    [role]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return visibleEntries
    return visibleEntries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.group.toLowerCase().includes(q) ||
        e.keywords?.some((k) => k.includes(q))
    )
  }, [query, visibleEntries])

  const recentEntries = useMemo(
    () =>
      recentPages
        .map((path) => visibleEntries.find((e) => e.path === path))
        .filter(Boolean) as typeof visibleEntries,
    [recentPages, visibleEntries]
  )

  const displayList = query.trim() ? filtered : [...recentEntries, ...visibleEntries.filter((e) => !recentPages.includes(e.path))]

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  function goTo(path: string) {
    addRecentPage(path)
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, displayList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && displayList[activeIndex]) {
      e.preventDefault()
      goTo(displayList[activeIndex].path)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-modal max-w-xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border/60 px-4">
          <Search className="h-4 w-4 shrink-0 text-gray-500" />
          <Input
            autoFocus
            placeholder="Buscar módulos, páginas e ações..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden rounded-md border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] text-gray-500 sm:inline">ESC</kbd>
        </div>
        <div className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
          {!query.trim() && recentEntries.length > 0 && (
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Recentes</p>
          )}
          {displayList.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">Nenhum resultado encontrado</p>
          ) : (
            displayList.map((entry, i) => {
              const isRecent = !query.trim() && recentEntries.some((r) => r.id === entry.id)
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => goTo(entry.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
                    i === activeIndex ? 'bg-gold/10 text-gold' : 'text-gray-300 hover:bg-surface-elevated hover:text-white light:text-gray-700 light:hover:bg-gray-100 light:hover:text-gray-900'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    i === activeIndex ? 'bg-gold/15' : 'bg-surface-elevated'
                  )}>
                    {isRecent ? <Clock className="h-4 w-4" /> : <entry.icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.label}</p>
                    <p className="truncate text-xs text-gray-500">{entry.group}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-40" />
                </button>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-gray-500">
          <span>Navegue com ↑ ↓ · Enter para abrir</span>
          <span><kbd className="rounded border border-border px-1">Ctrl</kbd> + <kbd className="rounded border border-border px-1">K</kbd></span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
