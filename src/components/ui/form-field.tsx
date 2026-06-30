import * as React from 'react'
import { cn } from '@/lib/utils'

type FieldChildProps = {
  id?: string
  placeholder?: string
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactElement<FieldChildProps>
}

export function FormField({ label, error, hint, required, className, children }: FormFieldProps) {
  const id = React.useId()
  const fieldId = children.props.id ?? id
  const errorId = error ? `${fieldId}-error` : undefined
  const hintId = hint ? `${fieldId}-hint` : undefined

  return (
    <div className={cn('form-field-group', className)}>
      <div className={cn('form-field', error && 'form-field-error-state')}>
        {React.cloneElement(children, {
          id: fieldId,
          placeholder: ' ',
          'aria-invalid': !!error,
          'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
          className: cn('form-field-input peer', children.props.className),
        })}
        <label htmlFor={fieldId} className="form-field-label">
          {label}
          {required && <span className="text-gold"> *</span>}
        </label>
      </div>
      {error && (
        <p id={errorId} className="form-field-message form-field-message-error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="form-field-message text-gray-500">{hint}</p>
      )}
    </div>
  )
}
