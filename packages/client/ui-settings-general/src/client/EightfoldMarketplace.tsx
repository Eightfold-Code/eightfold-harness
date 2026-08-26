/** Obsidian-style Eightfold Armoury/Treasury browser mounted above Settings. */

import { useEffect, useMemo, useState } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsKey } from './locales.ts'
import css from './EightfoldMarketplace.module.css'

type MarketKind = 'armoury' | 'treasury'

interface CatalogItem {
  readonly id: string
  readonly kind: MarketKind
  readonly name: string
  readonly description: string
  readonly version: string
  readonly repository: string
  readonly branch: string
  readonly commit: string
  readonly tags: readonly string[]
  readonly coverUrl?: string
  readonly installed: boolean
  readonly updateAvailable: boolean
  readonly installedVersion?: string
}

/** Dependencies injected by the settings shell registration. */
export interface EightfoldMarketplaceInjected {
  connection: ConnectionHandle
  kind: MarketKind
}

/** Sidebar runtime props plus marketplace dependencies and settings copy. */
export type EightfoldMarketplaceProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsLocale<'settings'>
  & InjectFace<EightfoldMarketplaceInjected>

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function copyFor(kind: MarketKind): {
  title: SettingsKey
  subtitle: SettingsKey
  mark: string
} {
  return kind === 'armoury'
    ? { title: 'market.armoury', subtitle: 'market.armourySubtitle', mark: 'A' }
    : { title: 'market.treasury', subtitle: 'market.treasurySubtitle', mark: 'T' }
}

/** Render one catalog trigger and its searchable install surface. */
export function EightfoldMarketplace({
  wide, connection, kind, t,
}: EightfoldMarketplaceProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<readonly CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [actionErrors, setActionErrors] = useState<ReadonlyMap<string, string>>(new Map())
  const [revision, setRevision] = useState(0)
  const copy = copyFor(kind)

  useEffect(() => {
    if (!open) return
    let current = true
    setLoading(true)
    setLoadError(null)
    void connection.api.host.eightfoldCatalog({ kind })
      .then((response) => {
        if (!current) return
        if (!response.result.ok) throw new Error(response.result.error.message)
        setItems(response.result.value.items)
      })
      .catch((error: unknown) => {
        if (!current) return
        setLoadError(messageOf(error))
      })
      .finally(() => {
        if (current) setLoading(false)
      })
    return () => { current = false }
  }, [connection, kind, open, revision])

  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('keydown', close) }
  }, [open])

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (needle === '') return items
    return items.filter(item => [
      item.name,
      item.description,
      item.id,
      item.branch,
      ...item.tags,
    ].some(value => value.toLocaleLowerCase().includes(needle)))
  }, [items, query])

  const install = async (item: CatalogItem): Promise<void> => {
    if (pending.has(item.id)) return
    setPending(current => new Set([...current, item.id]))
    setActionErrors((current) => {
      const next = new Map(current)
      next.delete(item.id)
      return next
    })
    try {
      const response = await connection.api.host.eightfoldInstall({ kind, id: item.id })
      if (!response.result.ok) throw new Error(response.result.error.message)
      setRevision(value => value + 1)
    } catch (error: unknown) {
      setActionErrors((current) => {
        const next = new Map(current)
        next.set(item.id, messageOf(error))
        return next
      })
    } finally {
      setPending((current) => {
        const next = new Set(current)
        next.delete(item.id)
        return next
      })
    }
  }

  return (
    <div className={css.layer}>
      <button
        type="button"
        className={wide ? css.trigger : `${css.trigger} ${css.railTrigger}`}
        title={t(copy.title)}
        aria-label={t(copy.title)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-active={open || undefined}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className={css.mark} aria-hidden>{copy.mark}</span>
        {wide ? <span className={css.triggerLabel}>{t(copy.title)}</span> : null}
      </button>

      {open ? (
        <div
          className={css.backdrop}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <section
            className={css.panel}
            role="dialog"
            aria-modal="true"
            aria-label={t(copy.title)}
          >
            <header className={css.header}>
              <div className={css.heading}>
                <span className={css.heroMark} aria-hidden>{copy.mark}</span>
                <div>
                  <h2 className={css.title}>{t(copy.title)}</h2>
                  <p className={css.subtitle}>{t(copy.subtitle)}</p>
                </div>
              </div>
              <button
                type="button"
                className={css.closeButton}
                aria-label={t('market.close')}
                title={t('market.close')}
                onClick={() => { setOpen(false) }}
              >
                ×
              </button>
            </header>

            <div className={css.toolbar}>
              <input
                className={css.search}
                type="search"
                value={query}
                placeholder={t('market.search')}
                aria-label={t('market.search')}
                onChange={event => { setQuery(event.currentTarget.value) }}
              />
              <button
                type="button"
                className={css.refreshButton}
                disabled={loading}
                onClick={() => { setRevision(value => value + 1) }}
              >
                {t('market.refresh')}
              </button>
            </div>

            <div className={css.body}>
              {loadError === null ? null : (
                <div className={css.catalogError} role="alert">
                  <strong>{t('market.error')}</strong>
                  <span>{loadError}</span>
                </div>
              )}

              {loading && items.length === 0 ? (
                <div className={css.state}>{t('market.loading')}</div>
              ) : null}

              {!loading && loadError === null && visible.length === 0 ? (
                <div className={css.state}>{t('market.empty')}</div>
              ) : null}

              <div className={css.grid}>
                {visible.map((item) => {
                  const busy = pending.has(item.id)
                  const error = actionErrors.get(item.id)
                  const actionable = !item.installed || item.updateAvailable
                  return (
                    <article className={css.card} key={item.id}>
                      <div className={css.cover}>
                        <div className={css.coverFallback} aria-hidden>
                          {item.name.slice(0, 1).toLocaleUpperCase()}
                        </div>
                        {item.coverUrl === undefined ? null : (
                          <img
                            className={css.coverImage}
                            src={item.coverUrl}
                            alt=""
                            loading="lazy"
                            onError={(event) => { event.currentTarget.hidden = true }}
                          />
                        )}
                      </div>

                      <div className={css.cardBody}>
                        <div className={css.cardHeading}>
                          <div className={css.cardNameWrap}>
                            <h3 className={css.cardName}>{item.name}</h3>
                            <span className={css.version}>v{item.version}</span>
                          </div>
                          {item.updateAvailable ? (
                            <span className={css.updateBadge}>{t('market.updateAvailable')}</span>
                          ) : item.installed ? (
                            <span className={css.installedBadge}>{t('market.installed')}</span>
                          ) : null}
                        </div>

                        <p className={css.description}>{item.description}</p>

                        {item.tags.length === 0 ? null : (
                          <div className={css.tags}>
                            {item.tags.slice(0, 5).map(tag => (
                              <span className={css.tag} key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}

                        <div className={css.sourceRow}>
                          <span>{t('market.branch')}</span>
                          <code>{item.branch}</code>
                        </div>

                        {error === undefined ? null : (
                          <p className={css.actionError} role="alert">{error}</p>
                        )}

                        <div className={css.cardActions}>
                          <span className={css.source}>{item.repository}</span>
                          <button
                            type="button"
                            className={css.installButton}
                            disabled={busy || !actionable}
                            onClick={() => { void install(item) }}
                          >
                            {busy
                              ? t('market.installing')
                              : item.updateAvailable
                                ? t('market.update')
                                : item.installed
                                  ? t('market.installed')
                                  : t('market.install')}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
