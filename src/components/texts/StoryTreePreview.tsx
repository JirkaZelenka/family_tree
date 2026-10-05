import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import { useLayoutStore } from '@/stores/layout-store'
import { computeForceVisibility } from '@/lib/layout/force-visibility'
import {
  buildForceEdgeSegments,
  historicalOffsetPathD,
  historicalPathD,
  segmentMidpoint,
  type ForceEdgeSegment,
} from '@/lib/layout/force-edges'
import {
  computeForceLayout,
  FORCE_NODE_HEIGHT,
  FORCE_NODE_WIDTH,
  FORCE_PADDING,
  FORCE_TIMELINE_WIDTH,
  type ForceNodePosition,
} from '@/lib/layout/force-layout'
import { enrichLineageColors, lineageColor, countLineageMembers } from '@/lib/vault/lineage-colors'
import { getLineages } from '@/lib/graph/queries'
import { resolveForceNodeFill, type ForceNodeFill } from '@/lib/layout/force-node-fill'
import {
  classifySegmentHighlight,
  computeLineagePathHighlight,
} from '@/lib/layout/force-lineage-highlight'
import { formatFamilyNameWithMaiden } from '@/lib/parser/markdown'
import { LifeSpanSvg } from '@/components/person/PersonDateDisplay'
import { PersonDetailPanel } from '@/components/person/PersonDetailPanel'
import { Button } from '@/components/ui/button'
import {
  animateViewTransform,
  transformToFocusPerson,
  type ViewTransform,
} from '@/lib/layout/story-tree-focus'
import { cn } from '@/lib/utils'
import type { PersonNode } from '@/types/person'

const FOCUS_ANIM_MS = 1000
const MIN_PAN_PX = 3

function useDoubleClickOpen(onOpen: () => void, onSelect: () => void) {
  const lastClickRef = useRef(0)
  return useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const now = Date.now()
      if (now - lastClickRef.current < 400) {
        lastClickRef.current = 0
        onOpen()
        return
      }
      lastClickRef.current = now
      onSelect()
    },
    [onOpen, onSelect],
  )
}

function PreviewNodeCard({
  person,
  pos,
  nodeFill,
  muted,
  selected,
  highlighted,
  onSelect,
  onOpenProfile,
}: {
  person: PersonNode
  pos: { x: number; y: number }
  nodeFill: ForceNodeFill
  muted: boolean
  selected: boolean
  highlighted: boolean
  onSelect: () => void
  onOpenProfile: () => void
}) {
  const handleClick = useDoubleClickOpen(onOpenProfile, onSelect)
  const accent = nodeFill.type === 'split' ? nodeFill.right : nodeFill.color
  const stroke = selected
    ? 'var(--force-selection-stroke)'
    : highlighted
      ? accent
      : muted
        ? 'rgba(120,96,72,0.38)'
        : 'rgba(64,44,28,0.55)'
  const gradientId = `story-force-split-${person.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      className="cursor-pointer"
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {nodeFill.type === 'split' && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor={nodeFill.left} />
            <stop offset="50%" stopColor={nodeFill.right} />
          </linearGradient>
        </defs>
      )}
      <rect
        width={FORCE_NODE_WIDTH}
        height={FORCE_NODE_HEIGHT}
        rx={8}
        fill={nodeFill.type === 'split' ? `url(#${gradientId})` : nodeFill.color}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : highlighted ? 2 : 1.35}
        filter="url(#story-force-node-shadow)"
      />
      <text
        x={FORCE_NODE_WIDTH / 2}
        y={22}
        textAnchor="middle"
        className="fill-slate-950 text-[14px] font-semibold font-heritage"
        style={{ pointerEvents: 'none' }}
      >
        {person.givenName}
      </text>
      <text
        x={FORCE_NODE_WIDTH / 2}
        y={40}
        textAnchor="middle"
        className="fill-slate-800 text-[12px] font-semibold font-serif-body"
        style={{ pointerEvents: 'none' }}
      >
        {formatFamilyNameWithMaiden(person)}
      </text>
      <LifeSpanSvg person={person} x={FORCE_NODE_WIDTH / 2} y={56} />
    </g>
  )
}

function PreviewEdge({
  segment,
  stroke,
  dimmed,
  emphasized,
}: {
  segment: ForceEdgeSegment
  stroke: string
  dimmed: boolean
  emphasized: boolean
}) {
  const d = historicalPathD(segment)
  const isSpouse = segment.kind === 'spouse'
  const opacity = dimmed ? 0.14 : emphasized ? 0.98 : isSpouse ? 0.95 : 0.88
  const width = emphasized ? 3.4 : isSpouse ? 2.05 : segment.kind === 'descent' ? 2.8 : 2.15
  const mid = isSpouse ? segmentMidpoint(segment) : null

  return (
    <g opacity={opacity}>
      {isSpouse ? (
        <>
          <path
            d={historicalOffsetPathD(segment, 2.35)}
            fill="none"
            stroke={stroke}
            strokeWidth={emphasized ? 2.2 : 1.7}
            strokeLinecap="round"
          />
          <path
            d={historicalOffsetPathD(segment, -2.35)}
            fill="none"
            stroke={stroke}
            strokeWidth={emphasized ? 2.2 : 1.7}
            strokeLinecap="round"
          />
          {mid && (
            <g transform={`translate(${mid.x}, ${mid.y})`}>
              <polygon
                points="0,-5.5 5.5,0 0,5.5 -5.5,0"
                fill="var(--marriage-knot)"
                stroke={stroke}
                strokeWidth={0.9}
              />
            </g>
          )}
        </>
      ) : (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  )
}

export interface StoryTreePreviewProps {
  focusPersonId: string | null
  className?: string
}

export function StoryTreePreview({ focusPersonId, className }: StoryTreePreviewProps) {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graph = useGraphStore((s) => s.graph)
  const persons = useGraphStore((s) => s.persons)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setHoveredId = useGraphStore((s) => s.setHoveredId)
  const setHighlightedIds = useGraphStore((s) => s.setHighlightedIds)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)
  const currentYear = useTimeStore((s) => s.currentYear)
  const showAllPeople = useTimeStore((s) => s.showAllPeople)
  const vaultColors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const expandedLineages = useLayoutStore((s) => s.expandedLineages)
  const sessionForceNodes = useLayoutStore((s) => s.sessionForceNodes)
  const forceAutoLayout = useLayoutStore((s) => s.forceAutoLayout)
  const forceLayoutRevision = useLayoutStore((s) => s.forceLayoutRevision)
  const forceCanvasWidthLock = useLayoutStore((s) => s.forceCanvasWidthLock)
  const initForceLineages = useLayoutStore((s) => s.initForceLineages)

  const [transform, setTransform] = useState<ViewTransform>({ x: 40, y: 40, k: 0.85 })
  const transformRef = useRef(transform)
  transformRef.current = transform
  const [isPanning, setIsPanning] = useState(false)
  const [detailPersonId, setDetailPersonId] = useState<string | null>(null)
  const [selectedId, setLocalSelectedId] = useState<string | null>(null)
  const panRef = useRef<{
    x: number
    y: number
    pointerId: number | null
    moved: boolean
  }>({ x: 0, y: 0, pointerId: null, moved: false })
  const cancelAnimRef = useRef<(() => void) | null>(null)
  const lastFocusedRef = useRef<string | null>(null)
  const fittedRef = useRef(false)

  const lineages = useMemo(() => (graph ? getLineages(graph) : []), [graph])

  useEffect(() => {
    if (!graph || lineages.length === 0) return
    if (expandedLineages.size === 0) initForceLineages(lineages)
  }, [graph, lineages, expandedLineages.size, initForceLineages])

  useEffect(() => {
    if (!focusPersonId) return
    const person = persons.get(focusPersonId)
    if (!person) return
    const affiliations = [person.lineage].filter(Boolean)
    const expanded = useLayoutStore.getState().expandedLineages
    const missing = affiliations.filter((l) => !expanded.has(l))
    if (missing.length === 0) return
    useLayoutStore.setState({
      expandedLineages: new Set([...expanded, ...missing]),
    })
  }, [focusPersonId, persons])

  const { visibleIds, boundaryIds } = useMemo(() => {
    if (!graph) {
      return { visibleIds: new Set<string>(), boundaryIds: new Set<string>() }
    }
    return computeForceVisibility(graph, {
      expandedLineages,
      timeVisible: (id) => {
        const p = persons.get(id)
        return p ? isPersonVisible(p.birthYear, p.deathYear, p.death?.date) : false
      },
    })
  }, [graph, persons, expandedLineages, isPersonVisible, currentYear, showAllPeople])

  const layout = useMemo(() => {
    if (!graph) return null
    return computeForceLayout(
      graph,
      visibleIds,
      sessionForceNodes,
      forceAutoLayout,
      forceCanvasWidthLock,
    )
  }, [
    graph,
    visibleIds,
    sessionForceNodes,
    forceAutoLayout,
    forceLayoutRevision,
    forceCanvasWidthLock,
  ])

  const displayPositions = useMemo(() => {
    if (!layout) return new Map<string, ForceNodePosition>()
    return layout.positions
  }, [layout])

  const colors = useMemo(() => {
    const memberCounts = graph
      ? countLineageMembers(graph.nodes().map((id) => graph.getNodeAttributes(id).lineage))
      : undefined
    return enrichLineageColors(lineages, vaultColors, memberCounts)
  }, [lineages, vaultColors, graph])

  const nodeFills = useMemo(() => {
    const map = new Map<string, ForceNodeFill>()
    if (!graph) return map
    for (const id of visibleIds) {
      const person = persons.get(id)
      if (!person) continue
      map.set(
        id,
        resolveForceNodeFill(
          graph,
          person,
          visibleIds,
          displayPositions,
          colors,
          boundaryIds.has(id),
        ),
      )
    }
    return map
  }, [graph, visibleIds, boundaryIds, displayPositions, colors, persons])

  const edgeSegments = useMemo(() => {
    if (!graph) return []
    return buildForceEdgeSegments(graph, visibleIds, displayPositions, {
      currentYear,
      showAll: showAllPeople,
    })
  }, [graph, visibleIds, displayPositions, currentYear, showAllPeople])

  const activeSelectedId = detailPersonId ?? selectedId ?? focusPersonId
  const lineageHighlight = useMemo(() => {
    if (!graph || !activeSelectedId) return null
    return computeLineagePathHighlight(graph, activeSelectedId, colors)
  }, [graph, activeSelectedId, colors])

  const fitToView = useCallback(() => {
    if (!svgRef.current || !layout) return
    const viewW = svgRef.current.clientWidth || 800
    const viewH = svgRef.current.clientHeight || 600
    const padding = 40
    const k = Math.min((viewW - padding * 2) / layout.width, (viewH - padding * 2) / layout.height, 1.1)
    setTransform({
      x: (viewW - layout.width * k) / 2,
      y: (viewH - layout.height * k) / 2,
      k,
    })
  }, [layout])

  useEffect(() => {
    if (!layout || fittedRef.current) return
    fitToView()
    fittedRef.current = true
  }, [layout, fitToView])

  useEffect(() => {
    if (!focusPersonId || !layout || !svgRef.current) return
    if (focusPersonId === lastFocusedRef.current) return
    const viewW = svgRef.current.clientWidth || 800
    const viewH = svgRef.current.clientHeight || 600
    const target = transformToFocusPerson(
      focusPersonId,
      displayPositions,
      persons,
      viewW,
      viewH,
    )
    if (!target) return

    lastFocusedRef.current = focusPersonId
    setLocalSelectedId(focusPersonId)
    setSelectedId(focusPersonId)
    setHighlightedIds(new Set())

    cancelAnimRef.current?.()
    const from = transformRef.current
    cancelAnimRef.current = animateViewTransform(
      from,
      target,
      FOCUS_ANIM_MS,
      setTransform,
      () => {
        cancelAnimRef.current = null
      },
    )
  }, [
    focusPersonId,
    displayPositions,
    layout,
    persons,
    setHighlightedIds,
    setSelectedId,
  ])

  useEffect(
    () => () => {
      cancelAnimRef.current?.()
      cancelAnimRef.current = null
    },
    [],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      cancelAnimRef.current?.()
      cancelAnimRef.current = null
      setTransform((prev) => {
        const k = Math.min(2.5, Math.max(0.25, prev.k * delta))
        const ratio = k / prev.k
        return {
          k,
          x: mx - (mx - prev.x) * ratio,
          y: my - (my - prev.y) * ratio,
        }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return
    e.preventDefault()
    cancelAnimRef.current?.()
    cancelAnimRef.current = null
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      moved: false,
    }
    setIsPanning(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (panRef.current.pointerId !== e.pointerId) return
    const dx = e.clientX - panRef.current.x
    const dy = e.clientY - panRef.current.y
    if (!panRef.current.moved && Math.hypot(dx, dy) < MIN_PAN_PX) return
    panRef.current.moved = true
    panRef.current.x = e.clientX
    panRef.current.y = e.clientY
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const onPointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (panRef.current.pointerId !== e.pointerId) return
    panRef.current.pointerId = null
    setIsPanning(false)
  }, [])

  if (!graph || !layout) {
    return (
      <div className={cn('flex h-full items-center justify-center text-sm text-muted-foreground', className)}>
        {t('app.loading')}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full select-none overscroll-contain touch-none heritage-canvas',
        isPanning ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
    >
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none bg-transparent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <filter id="story-force-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#4a3426" floodOpacity="0.28" />
          </filter>
          <filter id="story-heritage-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.08" />
            </feComponentTransfer>
          </filter>
          <pattern id="story-heritage-vines" width="140" height="140" patternUnits="userSpaceOnUse">
            <path
              d="M 12 128 C 38 96, 52 108, 70 78 C 88 48, 104 58, 128 18"
              fill="none"
              stroke="rgba(90,58,36,0.22)"
              strokeWidth="1.35"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#story-heritage-vines)" />
        <rect width="100%" height="100%" fill="var(--background)" filter="url(#story-heritage-grain)" opacity="0.22" />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          <rect x={0} y={0} width={layout.width} height={layout.height} fill="transparent" />

          {layout.timelineTicks.map((tick) => (
            <g key={tick.year}>
              <line
                x1={FORCE_TIMELINE_WIDTH}
                y1={tick.y}
                x2={layout.rightTimelineX}
                y2={tick.y}
                stroke="rgba(90,58,36,0.28)"
                strokeWidth={1}
                strokeDasharray="3 7"
              />
              <text
                x={FORCE_TIMELINE_WIDTH - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-[color:var(--muted-foreground)] text-[11px] font-medium tabular-nums font-serif-body"
              >
                {tick.label}
              </text>
            </g>
          ))}

          <line
            x1={FORCE_TIMELINE_WIDTH}
            y1={FORCE_PADDING - 8}
            x2={FORCE_TIMELINE_WIDTH}
            y2={layout.height - FORCE_PADDING}
            stroke="rgba(90,58,36,0.55)"
            strokeWidth={1.8}
          />

          <g>
            {edgeSegments.map((segment) => {
              const dir = lineageHighlight
                ? classifySegmentHighlight(segment, lineageHighlight)
                : null
              const baseStroke = segment.kind === 'spouse' ? 'var(--spouse-line)' : 'var(--ink-line)'
              const stroke =
                dir === 'up'
                  ? lineageHighlight!.upColor
                  : dir === 'down'
                    ? lineageHighlight!.downColor
                    : baseStroke
              return (
                <PreviewEdge
                  key={segment.id}
                  segment={segment}
                  stroke={stroke}
                  dimmed={lineageHighlight !== null && dir === null}
                  emphasized={Boolean(dir)}
                />
              )
            })}
          </g>

          {[...visibleIds].map((id) => {
            const person = persons.get(id)
            const pos = displayPositions.get(id)
            if (!person || !pos) return null
            const isSelected = id === activeSelectedId
            const onLineagePath =
              lineageHighlight !== null &&
              (id === activeSelectedId ||
                lineageHighlight.ancestorIds.has(id) ||
                lineageHighlight.descendantIds.has(id))
            const muted = lineageHighlight !== null && !onLineagePath && !isSelected

            return (
              <g
                key={id}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <PreviewNodeCard
                  person={person}
                  pos={pos}
                  nodeFill={nodeFills.get(id) ?? {
                    type: 'solid',
                    color: lineageColor(person.lineage, colors),
                  }}
                  muted={muted}
                  selected={isSelected}
                  highlighted={onLineagePath}
                  onSelect={() => {
                    setLocalSelectedId(id)
                    setSelectedId(id)
                    setHighlightedIds(new Set())
                  }}
                  onOpenProfile={() => {
                    setDetailPersonId(id)
                    setLocalSelectedId(id)
                    setSelectedId(id)
                    setHighlightedIds(new Set())
                  }}
                />
              </g>
            )
          })}
        </g>
      </svg>

      {detailPersonId && (
        <div className="absolute inset-0 z-20 flex flex-col border-l border-border bg-background shadow-lg">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1">
            <span className="truncate px-2 text-sm font-medium">{t('person.profileTitle')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDetailPersonId(null)}
              aria-label={t('person.closeProfile')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <PersonDetailPanel variant="sidebar" personId={detailPersonId} />
          </div>
        </div>
      )}
    </div>
  )
}
