import type { BudgetProposalEnvironment } from '@/pdf/types'
import { formatCurrency } from '@/lib/utils'

interface EnvironmentBlockProps {
  environment: BudgetProposalEnvironment
  /** Quando false, omite valores individuais dos móveis (só totais por ambiente). */
  showItemPrices?: boolean
}

function EnvironmentPlaceholder() {
  return (
    <div className="proposal-env__placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </div>
  )
}

export function EnvironmentBlock({ environment, showItemPrices = true }: EnvironmentBlockProps) {
  const items = environment.items
    .map((item) => ({
      description: item.description.trim(),
      specifications: item.specifications?.trim(),
      value: item.value,
    }))
    .filter((item) => item.description)

  return (
    <article className="proposal-env">
      <div className="proposal-env__media">
        {environment.imageUrl ? (
          <img src={environment.imageUrl} alt={environment.name} className="proposal-env__image" />
        ) : (
          <EnvironmentPlaceholder />
        )}
      </div>
      <div className="proposal-env__content">
        <div className="proposal-env__title-row">
          <span className="proposal-env__icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
          <h3 className="proposal-env__name">{environment.name}</h3>
        </div>
        {environment.description ? (
          <p className="proposal-env__description">{environment.description}</p>
        ) : null}
        {items.length > 0 ? (
          <ul className="proposal-checklist">
            {items.map((item, index) => (
              <li key={`${environment.name}-${index}`} className="proposal-checklist__row">
                <span className="proposal-checklist__mark" aria-hidden>✓</span>
                <span className="proposal-checklist__label">
                  {item.description}
                  {item.specifications ? (
                    <span className="proposal-env__item-specs"> — {item.specifications}</span>
                  ) : null}
                </span>
                {showItemPrices ? (
                  <strong className="proposal-checklist__value">{formatCurrency(item.value)}</strong>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="proposal-env__price-bar">
          <span>Valor do ambiente</span>
          <strong>{formatCurrency(environment.value)}</strong>
        </div>
      </div>
    </article>
  )
}
