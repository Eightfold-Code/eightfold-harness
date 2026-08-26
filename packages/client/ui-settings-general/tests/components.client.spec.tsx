// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import type { GeneralSectionComponentProps } from '../src/client/GeneralSection.tsx'
import { GeneralSection } from '../src/client/GeneralSection.tsx'
import { CloseLabel, HeaderContent, TriggerContent } from '../src/client/chrome.tsx'
import type { TriggerContentProps } from '../src/client/chrome.tsx'
import { SettingsDocumentAction } from '../src/client/SettingsDocumentAction.tsx'
import { EightfoldMarketplace } from '../src/client/EightfoldMarketplace.tsx'
import { SettingsDescribeMirror } from '@deepseek-ai/dsh-client-ui-settings/src/client/settings-mirror.ts'
import { SettingsDocumentStore } from '../src/client/settings-document-store.ts'

/** Store over a real mirror derived from the same fake wire. */
function derivedDocumentStore(api: object) {
  const wire = api as never
  return new SettingsDocumentStore(wire, new SettingsDescribeMirror(wire))
}
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

// The seat's key domain is settings ∪ common; the stub answers from the
// package dictionary and falls back to the key like the real chain.
const t: TriggerContentProps['t'] = key => (en as Record<string, string>)[key] ?? key

// Global standard kit stubs: none of these components consume the hooks.
const unusedHook = (() => { throw new Error('unused by settings-general components') }) as never
const kit = { useSessions: unusedHook, useWorkspaces: unusedHook }

describe('chrome content', () => {
  it('TriggerContent renders the icon with the label in the wide column', () => {
    const { container } = render(<TriggerContent {...kit} wide t={t} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('TriggerContent drops the label in the rail state', () => {
    const { container } = render(<TriggerContent {...kit} wide={false} t={t} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('HeaderContent and CloseLabel render their translated text', () => {
    render(<HeaderContent {...kit} t={t} />)
    render(<CloseLabel {...kit} t={t} />)
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('Close')).toBeTruthy()
  })
})

describe('GeneralSection', () => {
  function mount() {
    const renderSlot = vi.fn(
      ((key: string) => <div data-testid={`slot-${key}`} />) as GeneralSectionComponentProps['renderSlot'],
    )
    const props: GeneralSectionComponentProps = { ...kit, renderSlot, close: vi.fn() }
    const view = render(<GeneralSection {...props} />)
    return { view, renderSlot }
  }

  it('renders the item slot as the section body', () => {
    const { renderSlot } = mount()
    expect(renderSlot).toHaveBeenCalledWith('settings.general.item', {})
    expect(screen.getByTestId('slot-settings.general.item')).toBeTruthy()
  })
})

describe('SettingsDocumentAction', () => {
  it('appears only for a file-backed provider and requests its Host-owned document', async () => {
    const openDocument = vi.fn(() => Promise.resolve({
      rpcId: 'document-open' as never,
      result: { ok: true as const, value: { opened: true as const } },
    }))
    const controller = derivedDocumentStore({
      settings: {
        describe: vi.fn(() => Promise.resolve({
          rpcId: 'document-action' as never,
          result: {
            ok: true as const,
            value: { writable: true, hasDocument: true, namespaces: [] },
          },
        })),
        openDocument,
      },
    })
    render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    const action = await screen.findByRole('button', { name: 'Open configuration file' })
    fireEvent.click(action)
    await waitFor(() => { expect(openDocument).toHaveBeenCalledWith({}) })
  })

  it('stays absent without a document and follows a mirror refresh to available', async () => {
    const describe = vi.fn()
      .mockResolvedValueOnce({
        rpcId: 'document-action-absent' as never,
        result: { ok: true as const, value: { writable: true, hasDocument: false, namespaces: [] } },
      })
      .mockResolvedValueOnce({
        rpcId: 'document-action-ready' as never,
        result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [] } },
      })
    const wire = { settings: { describe, openDocument: vi.fn() } } as never
    const mirror = new SettingsDescribeMirror(wire)
    const controller = new SettingsDocumentStore(wire, mirror)
    const first = render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    await waitFor(() => { expect(controller.store.getSnapshot().status).toBe('unavailable') })
    expect(screen.queryByRole('button', { name: 'Open configuration file' })).toBeNull()
    first.unmount()
    render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    // A remount alone re-reads nothing; availability moves with the mirror's
    // own refresh (a document commit or reconnect in production).
    await waitFor(() => { expect(controller.store.getSnapshot().status).toBe('unavailable') })
    expect(describe).toHaveBeenCalledTimes(1)
    await mirror.load()
    expect(await screen.findByRole('button', { name: 'Open configuration file' })).toBeTruthy()
    expect(describe).toHaveBeenCalledTimes(2)
  })

  it('keeps the action available and reports a native-open failure', async () => {
    const controller = derivedDocumentStore({
      settings: {
        describe: vi.fn(() => Promise.resolve({
          rpcId: 'document-action' as never,
          result: {
            ok: true as const,
            value: { writable: true, hasDocument: true, namespaces: [] },
          },
        })),
        openDocument: vi.fn(() => Promise.resolve({
          rpcId: 'document-open-failed' as never,
          result: { ok: false as const, error: { code: 'internal' as const, message: 'xdg-open missing', details: {} } },
        })),
      },
    })
    render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open configuration file' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Could not open configuration file')
    expect(screen.getByRole('button', { name: 'Open configuration file' })).toBeTruthy()
  })
})

describe('EightfoldMarketplace', () => {
  it('shows Set as theme after an Armoury skin is installed', async () => {
    const card = (installed: boolean) => ({
      id: 'obsidian',
      kind: 'armoury' as const,
      name: 'Obsidian',
      description: 'A test skin',
      version: '0.1.0',
      repository: 'Eightfold-Code/eightfold-armoury',
      branch: 'skin/obsidian',
      commit: '0000000000000000000000000000000000000000',
      tags: [],
      installed,
      updateAvailable: false,
    })
    const catalog = vi.fn()
      .mockResolvedValueOnce({
        rpcId: 'catalog-1' as never,
        result: { ok: true as const, value: { items: [card(false)] } },
      })
      .mockResolvedValue({
        rpcId: 'catalog-2' as never,
        result: { ok: true as const, value: { items: [card(true)] } },
      })
    const install = vi.fn(() => Promise.resolve({
      rpcId: 'install-1' as never,
      result: {
        ok: true as const,
        value: {
          id: 'obsidian',
          version: '0.1.0',
          commit: '0000000000000000000000000000000000000000',
        },
      },
    }))
    const setAsTheme = vi.fn(() => Promise.resolve())
    const getActiveThemeId = vi.fn(() => 'system')
    render(<EightfoldMarketplace
      {...kit}
      wide
      t={t as never}
      connection={{
        api: { host: { eightfoldCatalog: catalog, eightfoldInstall: install } },
        isLoopback: true,
      } as never}
      kind="armoury"
      setAsTheme={setAsTheme}
      getActiveThemeId={getActiveThemeId}
    />)
    fireEvent.click(screen.getByRole('button', { name: 'Armoury' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }))
    await waitFor(() => {
      expect(install).toHaveBeenCalledWith({ kind: 'armoury', id: 'obsidian' })
    })
    const themeButton = await screen.findByRole('button', { name: 'Set as theme' })
    fireEvent.click(themeButton)
    await waitFor(() => {
      expect(setAsTheme).toHaveBeenCalledWith('obsidian')
    })
  })
})
