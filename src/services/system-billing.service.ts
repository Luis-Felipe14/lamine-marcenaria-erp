import { supabase } from '@/lib/supabase'
import { DEFAULT_BILLING_LOCK_MESSAGE } from '@/lib/system-admin'

export interface SystemBillingStatus {
  locked: boolean
  message: string
  updated_at?: string
}

function isLockedValue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1
}

function parseStatus(value: unknown): SystemBillingStatus {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    locked: isLockedValue(record.locked),
    message: typeof record.message === 'string' && record.message.trim()
      ? record.message.trim()
      : DEFAULT_BILLING_LOCK_MESSAGE,
    updated_at: typeof record.updated_at === 'string' ? record.updated_at : undefined,
  }
}

export async function fetchSystemBillingStatus(): Promise<SystemBillingStatus> {
  const { data, error } = await supabase.rpc('get_system_billing_status')
  if (error) throw new Error(error.message)
  return parseStatus(data)
}

export async function setSystemBillingLock(locked: boolean, message?: string): Promise<SystemBillingStatus> {
  const { data, error } = await supabase.rpc('set_system_billing_lock', {
    p_locked: locked,
    p_message: message ?? null,
  })
  if (error) throw new Error(error.message)
  return parseStatus(data)
}
