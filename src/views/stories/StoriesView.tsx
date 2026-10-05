import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  FileAudio,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InteractiveTextBody } from '@/components/texts/InteractiveTextBody'
import { StoryTreePreview } from '@/components/texts/StoryTreePreview'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVaultStore } from '@/stores/vault-store'
import { useViewStore } from '@/stores/view-store'
import { useGraphStore } from '@/stores/graph-store'
import { useStoriesStore, type StoriesSort } from '@/stores/stories-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  createTextComment,
  deleteTextComment,
  fetchTextCommentCounts,
  fetchTextComments,
  type TextCommentDto,
} from '@/lib/texts/comments-api'
import { collectCommentClientRects, findCommentAtPoint } from '@/lib/texts/comment-ranges'
import {
  formatStoryMetaLine,
  previewBody,
  sortTextDocuments,
} from '@/lib/texts/sort'
import { collectStoryAttachments } from '@/lib/texts/attachments'
import { extractTextBody } from '@/lib/texts/frontmatter'
import { youngestPersonIdInLineage } from '@/lib/graph/queries'
import { cn } from '@/lib/utils'
import type { TextDocument } from '@/types/text'
import type { ViewProps } from '../types'

interface TextSelectionRange {
  start: number
  end: number
  quote: string
  top: number
  left: number
}

function useLineageOptions(currentFamily?: string) {
  const people = useVaultStore((s) => s.vault?.people)
  return useMemo(() => {
    const keys = new Set<string>()
    for (const person of people ?? []) {
      const lineage = person.frontmatter.lineage?.trim()
      if (lineage) keys.add(lineage)
    }
    const list = [...keys].sort((a, b) => a.localeCompare(b, 'cs'))
    const current = (currentFamily ?? '').trim()
    if (current && !keys.has(current)) list.unshift(current)
    return list
  }, [people, currentFamily])
}

function FamilySelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const lineageOptions = useLineageOptions(value)
  return (
    <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('stories.noFamily')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{t('stories.noFamily')}</SelectItem>
        {lineageOptions.map((key) => (
          <SelectItem key={key} value={key}>
            {key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StoryTile({
  document,
  onOpen,
  commentCount = 0,
}: {
  document: TextDocument
  onOpen: () => void
  commentCount?: number
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full min-h-[220px] flex-col rounded-lg border border-border bg-card/60 p-5 text-left shadow-sm transition hover:border-primary/40 hover:bg-card"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 rounded-md border border-border bg-background/70 p-2 text-primary">
          <BookOpen className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heritage text-lg font-semibold leading-snug tracking-wide text-foreground">
            {document.title}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {formatStoryMetaLine(document, {
              noFamily: '—',
              noDate: t('stories.noDate'),
            })}
          </p>
        </div>
      </div>
      <p className="line-clamp-5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {previewBody(document.displayBody)}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-primary opacity-80 group-hover:opacity-100">
          {t('stories.openText')} →
        </span>
        {commentCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" aria-hidden />
            {t('stories.comments.count', { count: commentCount })}
          </span>
        )}
      </div>
    </button>
  )
}

function StoryEditorForm({
  title,
  setTitle,
  family,
  setFamily,
  date,
  setDate,
  body,
  setBody,
  error,
  onSave,
  onCancel,
  saveLabel,
}: {
  title: string
  setTitle: (v: string) => void
  family: string
  setFamily: (v: string) => void
  date: string
  setDate: (v: string) => void
  body: string
  setBody: (v: string) => void
  error: string | null
  onSave: () => void
  onCancel?: () => void
  saveLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 rounded-md border border-border bg-background/50 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="story-title">{t('stories.metaTitle')}</Label>
        <Input
          id="story-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <Label htmlFor="story-family">{t('stories.metaFamily')}</Label>
          <FamilySelect id="story-family" value={family} onChange={setFamily} />
        </div>
        <div className="min-w-[12rem] flex-[1.2] space-y-1.5">
          <Label htmlFor="story-date">{t('stories.metaDate')}</Label>
          <Input
            id="story-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder={t('stories.metaDatePlaceholder')}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="story-body">{t('stories.metaBody')}</Label>
        <p className="text-xs text-muted-foreground">{t('stories.metaBodyHint')}</p>
        <textarea
          id="story-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[280px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('stories.cancelEdit')}
          </Button>
        )}
        <Button type="button" size="sm" onClick={onSave} disabled={!title.trim()}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}

function NewTextDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const saveTextDocument = useVaultStore((s) => s.saveTextDocument)
  const setOpenTextId = useStoriesStore((s) => s.setOpenTextId)
  const [title, setTitle] = useState('')
  const [family, setFamily] = useState('')
  const [date, setDate] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setFamily('')
    setDate('')
    setBody('')
    setError(null)
  }, [open])

  const create = () => {
    const result = saveTextDocument({
      title,
      family: family.trim() || null,
      date: date.trim() || null,
      body,
    })
    if (!result.ok) {
      setError(result.error || t('stories.createError'))
      return
    }
    onOpenChange(false)
    setOpenTextId(result.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('stories.newTextTitle')}</DialogTitle>
        </DialogHeader>
        <StoryEditorForm
          title={title}
          setTitle={setTitle}
          family={family}
          setFamily={setFamily}
          date={date}
          setDate={setDate}
          body={body}
          setBody={setBody}
          error={error}
          onSave={create}
          onCancel={() => onOpenChange(false)}
          saveLabel={t('stories.create')}
        />
      </DialogContent>
    </Dialog>
  )
}

function CommentsSidebar({
  comments,
  loading,
  error,
  onDelete,
  onClose,
  activeCommentId,
  compact = false,
}: {
  comments: TextCommentDto[]
  loading: boolean
  error: string | null
  onDelete: (id: number) => void
  onClose: () => void
  activeCommentId: number | null
  compact?: boolean
}) {
  const { t } = useTranslation()
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeCommentId == null) return
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeCommentId])

  return (
    <aside
      className={cn(
        'flex w-full flex-col border-l border-border bg-card/40',
        compact ? 'lg:w-52 xl:w-56' : 'lg:w-80',
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between gap-2 border-b border-border',
          compact ? 'px-3 py-2' : 'px-4 py-3',
        )}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{t('stories.comments.title')}</h3>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground">{t('stories.comments.selectHint')}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label={t('stories.comments.hide')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className={cn('space-y-3', compact ? 'p-2.5' : 'p-4')}>
          {loading && (
            <p className="text-xs text-muted-foreground">{t('stories.comments.loading')}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!loading && !error && comments.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('stories.comments.empty')}</p>
          )}
          {comments.map((comment) => {
            const active = comment.id === activeCommentId
            return (
              <div
                key={comment.id}
                ref={active ? activeRef : undefined}
                className={cn(
                  'rounded-md border bg-background/70',
                  compact ? 'p-2' : 'p-3',
                  active ? 'border-amber-500/70 ring-1 ring-amber-500/40' : 'border-border',
                )}
              >
                <blockquote className="mb-2 border-l-2 border-amber-500/50 pl-2 text-xs italic text-muted-foreground">
                  {comment.quote}
                </blockquote>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {t('stories.comments.by', { user: comment.authorUsername })}
                  </span>
                  {comment.canDelete && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      {t('stories.comments.delete')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}

function CommentHighlightOverlays({
  rootRef,
  comments,
  activeCommentId,
  revision,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  comments: TextCommentDto[]
  activeCommentId: number | null
  revision: string
}) {
  const [rects, setRects] = useState<
    Array<{ commentId: number; top: number; left: number; width: number; height: number }>
  >([])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || comments.length === 0) {
      setRects([])
      return
    }
    setRects(collectCommentClientRects(root, comments))
  }, [rootRef, comments, revision])

  if (rects.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {rects.map((rect, index) => {
        const active = rect.commentId === activeCommentId
        return (
          <div
            key={`${rect.commentId}-${index}`}
            className={cn(
              'absolute rounded-sm',
              active
                ? 'bg-amber-400/40 ring-1 ring-amber-600/40'
                : 'bg-amber-300/30',
            )}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        )
      })}
    </div>
  )
}

function StoryReader({ document }: { document: TextDocument }) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isAdmin = Boolean(user?.isAdmin)
  const saveTextDocument = useVaultStore((s) => s.saveTextDocument)
  const setOpenTextId = useStoriesStore((s) => s.setOpenTextId)
  const leaveForTree = useStoriesStore((s) => s.leaveForTree)
  const pendingScrollTop = useStoriesStore((s) => s.pendingScrollTop)
  const pendingMentionStart = useStoriesStore((s) => s.pendingMentionStart)
  const setPendingScroll = useStoriesStore((s) => s.setPendingScroll)
  const setActiveView = useViewStore((s) => s.setActiveView)
  const setSelectedLineage = useViewStore((s) => s.setSelectedLineage)
  const setProfilePersonId = useViewStore((s) => s.setProfilePersonId)
  const setPersonSidebarOpen = useViewStore((s) => s.setPersonSidebarOpen)
  const setPendingFocusPersonId = useViewStore((s) => s.setPendingFocusPersonId)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setHighlightedIds = useGraphStore((s) => s.setHighlightedIds)
  const persons = useGraphStore((s) => s.persons)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<TextSelectionRange | null>(null)
  const [draft, setDraft] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [comments, setComments] = useState<TextCommentDto[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(document.title)
  const [editFamily, setEditFamily] = useState(document.family ?? '')
  const [editDate, setEditDate] = useState(document.date ?? '')
  const [editBody, setEditBody] = useState(() => extractTextBody(document.rawContent))
  const [editError, setEditError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [readerMode, setReaderMode] = useState<'text' | 'tree'>('text')
  const [treeFocusPersonId, setTreeFocusPersonId] = useState<string | null>(null)
  const withTree = readerMode === 'tree' && !editing

  useEffect(() => {
    if (editing) return
    setEditTitle(document.title)
    setEditFamily(document.family ?? '')
    setEditDate(document.date ?? '')
    setEditBody(extractTextBody(document.rawContent))
    setEditError(null)
  }, [document, editing])

  const reloadComments = useCallback(async () => {
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const list = await fetchTextComments(document.id)
      setComments(list)
    } catch {
      setCommentsError(t('stories.comments.error'))
    } finally {
      setCommentsLoading(false)
    }
  }, [document.id, t])

  useEffect(() => {
    void reloadComments()
    setCommentsOpen(false)
    setActiveCommentId(null)
  }, [reloadComments])

  const highlightRevision = useMemo(
    () =>
      `${document.id}:${document.displayBody.length}:${comments.map((c) => c.id).join(',')}:${readerMode}`,
    [document.id, document.displayBody.length, comments, readerMode],
  )

  const openCommentsPanel = useCallback((commentId?: number | null) => {
    setCommentsOpen(true)
    if (commentId != null) setActiveCommentId(commentId)
  }, [])

  const closeCommentsPanel = useCallback(() => {
    setCommentsOpen(false)
    setActiveCommentId(null)
  }, [])

  const handleBodyClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (editing || composerOpen) return
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed) return
      const root = bodyRef.current
      if (!root) return
      const commentId = findCommentAtPoint(root, comments, event.clientX, event.clientY)
      if (commentId != null) openCommentsPanel(commentId)
    },
    [comments, composerOpen, editing, openCommentsPanel],
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (pendingScrollTop != null) {
      el.scrollTop = pendingScrollTop
      setPendingScroll(null, null)
      return
    }
    if (pendingMentionStart != null && bodyRef.current) {
      const mark = bodyRef.current.querySelector(
        `[data-mention-start="${pendingMentionStart}"]`,
      ) as HTMLElement | null
      mark?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setPendingScroll(null, null)
    }
  }, [document.id, pendingScrollTop, pendingMentionStart, setPendingScroll])

  const navigateToTree = useCallback(
    (opts: { personId?: string; lineage?: string; mentionStart: number }) => {
      const scrollTop = scrollRef.current?.scrollTop ?? 0
      leaveForTree({
        textId: document.id,
        scrollTop,
        mentionStart: opts.mentionStart,
      })
      if (opts.personId) {
        setSelectedId(opts.personId)
        setHighlightedIds(new Set())
        setProfilePersonId(opts.personId)
        setPersonSidebarOpen(true)
        setPendingFocusPersonId(opts.personId)
        setSelectedLineage(null)
      } else if (opts.lineage) {
        const focusId = youngestPersonIdInLineage(persons, opts.lineage)
        setSelectedLineage(opts.lineage)
        setSelectedId(null)
        setHighlightedIds(new Set())
        setProfilePersonId(null)
        setPendingFocusPersonId(focusId)
      }
      setActiveView('tree')
    },
    [
      document.id,
      leaveForTree,
      persons,
      setActiveView,
      setHighlightedIds,
      setPendingFocusPersonId,
      setPersonSidebarOpen,
      setProfilePersonId,
      setSelectedId,
      setSelectedLineage,
    ],
  )

  const captureSelection = useCallback(() => {
    if (editing) return
    const root = bodyRef.current
    if (!root || !user) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null)
      return
    }
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) {
      setSelection(null)
      return
    }

    const preRange = range.cloneRange()
    preRange.selectNodeContents(root)
    preRange.setEnd(range.startContainer, range.startOffset)
    const start = preRange.toString().length
    const quote = range.toString()
    const end = start + quote.length
    if (!quote.trim() || end <= start) {
      setSelection(null)
      return
    }

    const rect = range.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    setSelection({
      start,
      end,
      quote: quote.trim(),
      top: rect.bottom - rootRect.top + 8,
      left: Math.max(0, rect.left - rootRect.left),
    })
    setComposerOpen(false)
    setDraft('')
    setSaveError(null)
  }, [editing, user])

  const submitComment = useCallback(async () => {
    if (!selection || !draft.trim()) return
    setSaveError(null)
    const result = await createTextComment(document.id, {
      start: selection.start,
      end: selection.end,
      quote: selection.quote,
      body: draft.trim(),
    })
    if (!result.ok) {
      setSaveError(result.error || t('stories.comments.saveError'))
      return
    }
    setComments((prev) => [...prev, result.comment].sort((a, b) => a.start - b.start))
    setActiveCommentId(result.comment.id)
    setCommentsOpen(true)
    setSelection(null)
    setComposerOpen(false)
    setDraft('')
    window.getSelection()?.removeAllRanges()
  }, [document.id, draft, selection, t])

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm(t('stories.comments.deleteConfirm'))) return
    const result = await deleteTextComment(id)
    if (result.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id))
      setActiveCommentId((current) => (current === id ? null : current))
    }
  }, [t])

  const saveEdit = () => {
    setEditError(null)
    const result = saveTextDocument({
      id: document.id,
      title: editTitle,
      family: editFamily.trim() || null,
      date: editDate.trim() || null,
      body: editBody,
    })
    if (!result.ok) {
      setEditError(result.error || t('stories.saveError'))
      return
    }
    setEditing(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpenTextId(null)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t('stories.backToList')}
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-heritage text-xl font-semibold tracking-wide">
              {document.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatStoryMetaLine(document, {
                noFamily: '—',
                noDate: t('stories.noDate'),
              })}
              {!editing && (
                <>
                  {' · '}
                  {withTree ? t('stories.readerHoverTreeHint') : t('stories.ctrlClickHint')}
                </>
              )}
              {savedFlash && !editing && (
                <>
                  {' · '}
                  <span className="text-primary">{t('stories.metaSaved')}</span>
                </>
              )}
            </p>
          </div>
          {!editing && (
            <Tabs
              value={readerMode}
              onValueChange={(v) => setReaderMode(v === 'tree' ? 'tree' : 'text')}
            >
              <TabsList className="h-8">
                <TabsTrigger value="text" className="px-2.5 text-xs">
                  {t('stories.readerModeTextOnly')}
                </TabsTrigger>
                <TabsTrigger value="tree" className="px-2.5 text-xs">
                  {t('stories.readerModeWithTree')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {!editing && (
            <Button
              variant={commentsOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => (commentsOpen ? closeCommentsPanel() : openCommentsPanel())}
              title={t('stories.comments.title')}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {t('stories.comments.title')}
              {comments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-[11px] font-medium text-amber-900 dark:text-amber-100">
                  {comments.length}
                </span>
              )}
            </Button>
          )}
          {isAdmin && !editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTitle(document.title)
                setEditFamily(document.family ?? '')
                setEditDate(document.date ?? '')
                setEditBody(extractTextBody(document.rawContent))
                setEditError(null)
                setEditing(true)
                setSelection(null)
              }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {t('stories.editText')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-col',
            withTree ? 'w-full lg:w-1/2' : 'min-h-0 flex-1',
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
              <div
                className={cn(
                  'relative mx-auto px-4 py-6 sm:px-8',
                  withTree ? 'max-w-none' : 'max-w-3xl',
                )}
              >
                {editing ? (
                  <StoryEditorForm
                    title={editTitle}
                    setTitle={setEditTitle}
                    family={editFamily}
                    setFamily={setEditFamily}
                    date={editDate}
                    setDate={setEditDate}
                    body={editBody}
                    setBody={setEditBody}
                    error={editError}
                    onSave={saveEdit}
                    onCancel={() => setEditing(false)}
                    saveLabel={t('stories.metaSave')}
                  />
                ) : (
                  <>
                    <div className="relative">
                      <div
                        ref={bodyRef}
                        onMouseUp={captureSelection}
                        onKeyUp={captureSelection}
                        onClick={handleBodyClick}
                      >
                        <InteractiveTextBody
                          body={document.displayBody}
                          mentions={document.mentions}
                          attachments={document.attachments}
                          className="stories-body"
                          onClickPerson={
                            withTree
                              ? undefined
                              : (personId, mentionStart) =>
                                  navigateToTree({ personId, mentionStart })
                          }
                          onClickLineage={
                            withTree
                              ? undefined
                              : (lineage, mentionStart) =>
                                  navigateToTree({ lineage, mentionStart })
                          }
                          onHoverPerson={
                            withTree
                              ? (personId) => {
                                  if (personId) setTreeFocusPersonId(personId)
                                }
                              : undefined
                          }
                        />
                      </div>
                      <CommentHighlightOverlays
                        rootRef={bodyRef}
                        comments={comments}
                        activeCommentId={activeCommentId}
                        revision={highlightRevision}
                      />

                      {selection && !composerOpen && (
                        <div
                          className="absolute z-20"
                          style={{ top: selection.top, left: selection.left }}
                        >
                          <Button
                            size="sm"
                            className="shadow-md"
                            onClick={() => {
                              setComposerOpen(true)
                              setCommentsOpen(true)
                            }}
                          >
                            <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                            {t('stories.comments.add')}
                          </Button>
                        </div>
                      )}

                      {selection && composerOpen && (
                        <div
                          className="absolute z-20 w-[min(100%,20rem)] rounded-md border border-border bg-popover p-3 shadow-lg"
                          style={{ top: selection.top, left: selection.left }}
                        >
                          <p className="mb-2 line-clamp-2 border-l-2 border-primary/40 pl-2 text-xs italic text-muted-foreground">
                            {selection.quote}
                          </p>
                          <textarea
                            className="min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder={t('stories.comments.placeholder')}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            autoFocus
                          />
                          {saveError && <p className="mt-1 text-xs text-destructive">{saveError}</p>}
                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setComposerOpen(false)
                                setSelection(null)
                                setDraft('')
                              }}
                            >
                              {t('stories.comments.cancel')}
                            </Button>
                            <Button
                              size="sm"
                              disabled={!draft.trim()}
                              onClick={() => void submitComment()}
                            >
                              {t('stories.comments.submit')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {!editing && commentsOpen && (
              <CommentsSidebar
                comments={comments}
                loading={commentsLoading}
                error={commentsError}
                onDelete={(id) => void handleDelete(id)}
                onClose={closeCommentsPanel}
                activeCommentId={activeCommentId}
                compact={withTree}
              />
            )}
          </div>
        </div>

        {withTree && (
          <div className="min-h-[280px] w-full border-t border-border lg:min-h-0 lg:w-1/2 lg:border-l lg:border-t-0">
            <StoryTreePreview focusPersonId={treeFocusPersonId} />
          </div>
        )}
      </div>
    </div>
  )
}

export function StoriesView({ className }: ViewProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isAdmin = Boolean(user?.isAdmin)
  const displayTexts = useVaultStore((s) => s.displayTexts)
  const sort = useStoriesStore((s) => s.sort)
  const setSort = useStoriesStore((s) => s.setSort)
  const openTextId = useStoriesStore((s) => s.openTextId)
  const setOpenTextId = useStoriesStore((s) => s.setOpenTextId)
  const [newOpen, setNewOpen] = useState(false)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  const sorted = useMemo(
    () => sortTextDocuments(displayTexts, sort),
    [displayTexts, sort],
  )

  useEffect(() => {
    if (openTextId) return
    let cancelled = false
    void fetchTextCommentCounts().then((counts) => {
      if (!cancelled) setCommentCounts(counts)
    })
    return () => {
      cancelled = true
    }
  }, [openTextId, displayTexts])

  const fileAttachments = useMemo(
    () => collectStoryAttachments(displayTexts, ['audio', 'pdf']),
    [displayTexts],
  )
  const linkAttachments = useMemo(
    () => collectStoryAttachments(displayTexts, ['link']),
    [displayTexts],
  )

  const openDocument = useMemo(
    () => (openTextId ? sorted.find((doc) => doc.id === openTextId) ?? null : null),
    [openTextId, sorted],
  )

  if (openDocument) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col heritage-canvas', className)}>
        <StoryReader document={openDocument} />
      </div>
    )
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col heritage-canvas', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-heritage text-2xl font-semibold tracking-wide">{t('stories.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('stories.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('stories.newText')}
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{t('stories.sortBy')}</span>
          <Select value={sort} onValueChange={(value) => setSort(value as StoriesSort)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t('stories.sortDate')}</SelectItem>
              <SelectItem value="family">{t('stories.sortFamily')}</SelectItem>
              <SelectItem value="title">{t('stories.sortTitle')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-8 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">{t('stories.empty')}</p>
            )}
            {sorted.map((document) => (
              <StoryTile
                key={document.id}
                document={document}
                commentCount={commentCounts[document.id] ?? 0}
                onOpen={() => setOpenTextId(document.id)}
              />
            ))}
          </div>

          <AttachmentCatalog
            title={t('stories.filesSection')}
            empty={t('stories.filesEmpty')}
            items={fileAttachments}
            onOpenText={setOpenTextId}
          />

          <AttachmentCatalog
            title={t('stories.linksSection')}
            empty={t('stories.linksEmpty')}
            items={linkAttachments}
            onOpenText={setOpenTextId}
          />
        </div>
      </ScrollArea>

      {isAdmin && <NewTextDialog open={newOpen} onOpenChange={setNewOpen} />}
    </div>
  )
}

function AttachmentCatalog({
  title,
  empty,
  items,
  onOpenText,
}: {
  title: string
  empty: string
  items: ReturnType<typeof collectStoryAttachments>
  onOpenText: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <section className="border-t border-border pt-6">
      <h3 className="font-heritage text-lg font-semibold tracking-wide">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li
              key={`${item.kind}:${item.resolvedUrl}`}
              className="rounded-md border border-border bg-card/50 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kind === 'audio' ? (
                      <FileAudio className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    ) : item.kind === 'pdf' ? (
                      <Download className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
                    ) : (
                      <ExternalLink className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                    )}
                    <a
                      href={item.resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground hover:underline"
                      {...(item.kind === 'pdf' ? { download: true } : {})}
                    >
                      {item.label}
                    </a>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.kind === 'audio'
                        ? t('stories.kindAudio')
                        : item.kind === 'pdf'
                          ? t('stories.kindPdf')
                          : t('stories.kindLink')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('stories.attachmentSource')}:{' '}
                    {item.sources.map((source, index) => (
                      <span key={source.textId}>
                        {index > 0 && ', '}
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => onOpenText(source.textId)}
                        >
                          {source.textTitle}
                        </button>
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              {item.kind === 'audio' && (
                <audio
                  controls
                  preload="metadata"
                  className="mt-3 w-full max-w-xl"
                  src={item.resolvedUrl}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
