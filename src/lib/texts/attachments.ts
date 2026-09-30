import type { TextAttachment, TextAttachmentKind, TextDocument } from '@/types/text'

export interface StoryAttachmentRef {
  kind: TextAttachmentKind
  label: string
  href: string
  resolvedUrl: string
  vaultPath?: string
  sources: Array<{ textId: string; textTitle: string }>
}

function attachmentKey(item: Pick<TextAttachment, 'kind' | 'resolvedUrl'>): string {
  return `${item.kind}|${item.resolvedUrl}`
}

/** Seskupí přílohy napříč texty; u každé je seznam zdrojových textů. */
export function collectStoryAttachments(
  documents: TextDocument[],
  kinds: TextAttachmentKind[],
): StoryAttachmentRef[] {
  const kindSet = new Set(kinds)
  const map = new Map<string, StoryAttachmentRef>()

  for (const document of documents) {
    for (const item of document.attachments ?? []) {
      if (!kindSet.has(item.kind)) continue
      const key = attachmentKey(item)
      const existing = map.get(key)
      if (existing) {
        if (!existing.sources.some((s) => s.textId === document.id)) {
          existing.sources.push({ textId: document.id, textTitle: document.title })
        }
        continue
      }
      map.set(key, {
        kind: item.kind,
        label: item.label,
        href: item.href,
        resolvedUrl: item.resolvedUrl,
        vaultPath: item.vaultPath,
        sources: [{ textId: document.id, textTitle: document.title }],
      })
    }
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'cs'))
}
