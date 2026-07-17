import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BoxSelect, Maximize2, Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import { useLayoutStore } from '@/stores/layout-store'
import { useViewStore } from '@/stores/view-store'
import { computeForceVisibility } from '@/lib/layout/force-visibility'
import { buildForceEdgeSegments, segmentPathD } from '@/lib/layout/force-edges'
import {
  computeForceLayout,
  birthYearToCenterY,
  FORCE_NODE_HEIGHT,
  FORCE_NODE_WIDTH,
  FORCE_PADDING,
  FORCE_TIMELINE_WIDTH,
  type ForceNodePosition,
} from '@/lib/layout/force-layout'
import { enrichLineageColors, lineageColor, countLineageMembers } from '@/lib/vault/lineage-colors'
import { resolveForceNodeFill, type ForceNodeFill } from '@/lib/layout/force-node-fill'
import { graphRectFromClients, nodesInGraphRect } from '@/lib/layout/force-marquee'
import {
  classifySegmentHighlight,
  computeLineagePathHighlight,
} from '@/lib/layout/force-lineage-highlight'
import { formatFamilyNameWithMaiden } from '@/lib/parser/markdown'
import { LifeSpanSvg } from '@/components/person/PersonDateDisplay'
import { ForceTimelineEventsLayer } from '@/components/timeline/ForceTimelineEvents'
import { ForceViewPresets } from '@/components/layout/ForceViewPresets'
import type { ViewProps } from '../types'
import type { PersonNode } from '@/types/person'

interface ViewTransform {
  x: number
  y: number
  k: number
}

const MIN_DRAG_PX = 4

function useNodeClickHandler(
  onSelect: (additive: boolean) => void,
  onOpenProfile: () => void,
) {
  const lastClickRef = useRef(0)
  return useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const now = Date.now()
      if (now - lastClickRef.current < 400) {
        lastClickRef.current = 0
        onOpenProfile()
        return
      }
      lastClickRef.current = now
      onSelect(e.shiftKey)
    },
    [onSelect, onOpenProfile],
  )
}

function PersonNodeCard({
  person,
  pos,
  nodeFill,
  muted,
  boundary,
  selected,
  highlighted,
  dragging,
  onSelect,
  onOpenProfile,
  onDragStart,
}: {
  person: PersonNode
  pos: { x: number; y: number }
  nodeFill: ForceNodeFill
  muted: boolean
  boundary: boolean
  selected: boolean
  highlighted: boolean
  dragging: boolean
  onSelect: (additive: boolean) => void
  onOpenProfile: () => void
  onDragStart: (e: ReactPointerEvent<SVGGElement>) => void
}) {
  const handleClick = useNodeClickHandler(onSelect, onOpenProfile)

  const accent =
    nodeFill.type === 'split' ? nodeFill.right : nodeFill.color
  const stroke = boundary
    ? 'var(--force-selection-stroke)'
    : selected
      ? 'var(--force-selection-stroke)'
      : highlighted
        ? accent
        : muted
          ? 'rgba(148,163,184,0.45)'
          : 'rgba(15,23,42,0.35)'

  const gradientId = `force-split-${person.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
      onClick={handleClick}
      onPointerDown={onDragStart}
    >
      {boundary && (
        <rect
          x={-5}
          y={-5}
          width={FORCE_NODE_WIDTH + 10}
          height={FORCE_NODE_HEIGHT + 10}
          rx={18}
          fill="none"
          stroke="var(--force-selection-stroke)"
          strokeWidth={2.5}
          opacity={0.95}
          filter="url(#force-boundary-glow)"
        />
      )}
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
        rx={14}
        fill={nodeFill.type === 'split' ? `url(#${gradientId})` : nodeFill.color}
        stroke={stroke}
        strokeWidth={boundary ? 2.5 : selected ? 2.5 : highlighted ? 2 : 1.25}
        opacity={1}
        filter={dragging ? undefined : boundary ? 'url(#force-boundary-glow)' : 'url(#force-node-shadow)'}
      />
      <text
        x={FORCE_NODE_WIDTH / 2}
        y={20}
        textAnchor="middle"
        className="fill-slate-950 text-[12px] font-semibold"
        style={{ pointerEvents: 'none' }}
      >
        {person.givenName}
      </text>
      <text
        x={FORCE_NODE_WIDTH / 2}
        y={36}
        textAnchor="middle"
        className="fill-slate-800 text-[10px]"
        style={{ pointerEvents: 'none' }}
      >
        {formatFamilyNameWithMaiden(person)}
      </text>
      <LifeSpanSvg person={person} x={FORCE_NODE_WIDTH / 2} y={48} />
    </g>
  )
}

export function ForceView({ className }: ViewProps) {
  const { t } = useTranslation()
  const personSidebarOpen = useViewStore((s) => s.personSidebarOpen)
  const lineageSidebarOpen = useViewStore((s) => s.lineageSidebarOpen)
  const toggleTreeFullscreen = useViewStore((s) => s.toggleTreeFullscreen)
  const isTreeFullscreenActive = !personSidebarOpen && !lineageSidebarOpen
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graph = useGraphStore((s) => s.graph)
  const persons = useGraphStore((s) => s.persons)
  const selectedId = useGraphStore((s) => s.selectedId)
  const selectedIds = useGraphStore((s) => s.selectedIds)
  const highlightedIds = useGraphStore((s) => s.highlightedIds)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const setSelectedIds = useGraphStore((s) => s.setSelectedIds)
  const setHoveredId = useGraphStore((s) => s.setHoveredId)
  const setHighlightedIds = useGraphStore((s) => s.setHighlightedIds)
  const setProfilePersonId = useViewStore((s) => s.setProfilePersonId)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)
  const currentYear = useTimeStore((s) => s.currentYear)
  const showAllPeople = useTimeStore((s) => s.showAllPeople)

  const vaultColors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})
  const lineages = useMemo(
    () =>
      graph
        ? [...new Set(graph.nodes().map((id) => graph.getNodeAttributes(id).lineage))].sort()
        : [],
    [graph],
  )

  const expandedLineages = useLayoutStore((s) => s.expandedLineages)
  const sessionForceNodes = useLayoutStore((s) => s.sessionForceNodes)
  const forceAutoLayout = useLayoutStore((s) => s.forceAutoLayout)
  const forceLayoutRevision = useLayoutStore((s) => s.forceLayoutRevision)
  const pendingForceFit = useLayoutStore((s) => s.pendingForceFit)
  const initForceLineages = useLayoutStore((s) => s.initForceLineages)
  const ensureForceAutoBaseline = useLayoutStore((s) => s.ensureForceAutoBaseline)
  const updateForceNodesX = useLayoutStore((s) => s.updateForceNodesX)
  const resetForceLayout = useLayoutStore((s) => s.resetForceLayout)

  const [transform, setTransform] = useState<ViewTransform>({ x: 40, y: 40, k: 1 })
  const transformRef = useRef(transform)
  transformRef.current = transform

  const spaceHeldRef = useRef(false)
  const panRef = useRef<{
    x: number
    y: number
    panning: boolean
    pointerId: number | null
    moved: boolean
  }>({
    x: 0,
    y: 0,
    panning: false,
    pointerId: null,
    moved: false,
  })
  const marqueeRef = useRef<{
    startClientX: number
    startClientY: number
    pointerId: number
  } | null>(null)
  const [marqueeMode, setMarqueeMode] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [marqueeScreen, setMarqueeScreen] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const nodeDragRef = useRef<{
    ids: string[]
    startClientX: number
    origXs: Map<string, number>
    pointerId: number
    moved: boolean
  } | null>(null)
  const [liveDragXs, setLiveDragXs] = useState<Record<string, number> | null>(null)

  const colors = useMemo(() => {
    const memberCounts = graph
      ? countLineageMembers(graph.nodes().map((id) => graph.getNodeAttributes(id).lineage))
      : undefined
    return enrichLineageColors(lineages, vaultColors, memberCounts)
  }, [lineages, vaultColors, graph])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spaceHeldRef.current = true
        if (
          e.target instanceof HTMLElement &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
        ) {
          e.preventDefault()
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeldRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (!graph || lineages.length === 0) return
    if (expandedLineages.size === 0) initForceLineages(lineages)
  }, [graph, lineages, expandedLineages.size, initForceLineages])

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
    return computeForceLayout(graph, visibleIds, sessionForceNodes, forceAutoLayout)
  }, [graph, visibleIds, sessionForceNodes, forceAutoLayout, forceLayoutRevision])

  const displayPositions = useMemo(() => {
    if (!layout) return new Map<string, ForceNodePosition>()
    const map = new Map(layout.positions)
    if (liveDragXs) {
      for (const [id, x] of Object.entries(liveDragXs)) {
        const existing = map.get(id)
        if (existing) map.set(id, { ...existing, x })
      }
    }
    return map
  }, [layout, liveDragXs])

  const nodeFills = useMemo(() => {
    const map = new Map<string, ForceNodeFill>()
    if (!graph) return map
    for (const id of visibleIds) {
      const person = persons.get(id)
      if (!person) continue
      const boundary = boundaryIds.has(id)
      map.set(
        id,
        resolveForceNodeFill(
          graph,
          person,
          visibleIds,
          displayPositions,
          colors,
          boundary,
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

  const lineageHighlight = useMemo(() => {
    if (!graph || !selectedId) return null
    return computeLineagePathHighlight(graph, selectedId, colors)
  }, [graph, selectedId, colors])

  const fittedGraphRef = useRef<typeof graph>(null)

  const fitToView = useCallback(() => {
    if (!svgRef.current || !layout) return
    const { width, height } = layout
    const viewW = svgRef.current.clientWidth || 800
    const viewH = svgRef.current.clientHeight || 600
    const padding = 48
    const k = Math.min((viewW - padding * 2) / width, (viewH - padding * 2) / height, 1.2)
    setTransform({
      x: (viewW - width * k) / 2,
      y: (viewH - height * k) / 2,
      k,
    })
  }, [layout])

  useEffect(() => {
    if (!layout || (!pendingForceFit && graph === fittedGraphRef.current)) return
    fitToView()
    fittedGraphRef.current = graph
    if (pendingForceFit) {
      useLayoutStore.setState({ pendingForceFit: false })
    }
  }, [graph, layout, fitToView, pendingForceFit])

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

  const onSvgPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (nodeDragRef.current || marqueeRef.current) return
    const isPan =
      e.button === 1 ||
      e.button === 2 ||
      (e.button === 0 && (!marqueeMode || spaceHeldRef.current))
    if (isPan) {
      e.preventDefault()
      window.getSelection()?.removeAllRanges()
      panRef.current = {
        x: e.clientX,
        y: e.clientY,
        panning: true,
        pointerId: e.pointerId,
        moved: false,
      }
      setIsPanning(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0 || !marqueeMode) return
    marqueeRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      pointerId: e.pointerId,
    }
    setMarqueeScreen(null)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [marqueeMode])

  const clampDragX = useCallback((x: number) => {
    const minX = FORCE_TIMELINE_WIDTH + FORCE_PADDING
    if (!Number.isFinite(x)) return minX
    return Math.max(minX, x)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setHighlightedIds(new Set())
    setHoveredId(null)
  }, [setSelectedIds, setHighlightedIds, setHoveredId])

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (nodeDragRef.current && e.pointerId === nodeDragRef.current.pointerId) {
        const dx = (e.clientX - nodeDragRef.current.startClientX) / transformRef.current.k
        if (!nodeDragRef.current.moved && Math.abs(dx) > MIN_DRAG_PX) {
          nodeDragRef.current.moved = true
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
        }
        if (!nodeDragRef.current.moved) return
        const next: Record<string, number> = {}
        for (const id of nodeDragRef.current.ids) {
          const origX = nodeDragRef.current.origXs.get(id)
          if (origX === undefined) continue
          next[id] = clampDragX(origX + dx)
        }
        setLiveDragXs(next)
        return
      }
      if (marqueeRef.current && e.pointerId === marqueeRef.current.pointerId) {
        const svgRect = svgRef.current?.getBoundingClientRect()
        if (!svgRect) return
        const { startClientX, startClientY } = marqueeRef.current
        setMarqueeScreen({
          x: Math.min(startClientX, e.clientX) - svgRect.left,
          y: Math.min(startClientY, e.clientY) - svgRect.top,
          w: Math.abs(e.clientX - startClientX),
          h: Math.abs(e.clientY - startClientY),
        })
        return
      }
      if (!panRef.current.panning || panRef.current.pointerId !== e.pointerId) return
      const dx = e.clientX - panRef.current.x
      const dy = e.clientY - panRef.current.y
      if (Math.abs(dx) > MIN_DRAG_PX || Math.abs(dy) > MIN_DRAG_PX) {
        panRef.current.moved = true
      }
      panRef.current.x = e.clientX
      panRef.current.y = e.clientY
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
    },
    [clampDragX],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (nodeDragRef.current && e.pointerId === nodeDragRef.current.pointerId) {
        const { ids, moved, startClientX, origXs } = nodeDragRef.current
        if (ids.length === 1) setSelectedId(ids[0])
        else setSelectedIds(ids)
        if (moved) {
          const dx = (e.clientX - startClientX) / transformRef.current.k
          const updates: Record<string, number> = {}
          for (const id of ids) {
            const origX = origXs.get(id)
            if (origX === undefined) continue
            updates[id] = clampDragX(origX + dx)
          }
          updateForceNodesX(updates)
        }
      } else if (marqueeRef.current && e.pointerId === marqueeRef.current.pointerId) {
        const { startClientX, startClientY } = marqueeRef.current
        const dragW = Math.abs(e.clientX - startClientX)
        const dragH = Math.abs(e.clientY - startClientY)
        if (
          dragW < MIN_DRAG_PX &&
          dragH < MIN_DRAG_PX &&
          layout &&
          svgRef.current
        ) {
          clearSelection()
        } else if (layout && svgRef.current) {
          const svgRect = svgRef.current.getBoundingClientRect()
          const graphRect = graphRectFromClients(
            startClientX,
            startClientY,
            e.clientX,
            e.clientY,
            svgRect,
            transformRef.current,
          )
          const picked = nodesInGraphRect(visibleIds, layout.positions, graphRect)
          if (picked.length === 0) {
            clearSelection()
          } else if (e.shiftKey) {
            const next = new Set(selectedIds)
            for (const id of picked) {
              if (next.has(id)) next.delete(id)
              else next.add(id)
            }
            setSelectedIds(next)
          } else {
            setSelectedIds(picked)
          }
        }
      } else if (
        panRef.current.panning &&
        panRef.current.pointerId === e.pointerId &&
        !panRef.current.moved
      ) {
        clearSelection()
      }
      nodeDragRef.current = null
      setLiveDragXs(null)
      marqueeRef.current = null
      setMarqueeScreen(null)
      panRef.current = {
        x: 0,
        y: 0,
        panning: false,
        pointerId: null,
        moved: false,
      }
      setIsPanning(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* capture already released */
      }
    },
    [
      updateForceNodesX,
      clampDragX,
      setSelectedId,
      setSelectedIds,
      clearSelection,
      layout,
      visibleIds,
      selectedIds,
    ],
  )

  const onNodeDragStart = useCallback(
    (id: string, e: ReactPointerEvent<SVGGElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = displayPositions.get(id)
      if (!pos || !svgRef.current) return

      let dragIds: string[]
      if (e.shiftKey) {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
        dragIds = [...next]
        if (dragIds.length === 0) return
      } else if (selectedIds.has(id) && selectedIds.size > 1) {
        dragIds = [...selectedIds]
      } else {
        setSelectedId(id)
        dragIds = [id]
      }

      const baseline: Record<string, { x: number; pinned?: boolean }> = {}
      for (const [nodeId, nodePos] of displayPositions) {
        baseline[nodeId] = { x: nodePos.x }
      }
      ensureForceAutoBaseline(baseline)
      marqueeRef.current = null
      setMarqueeScreen(null)
      panRef.current = {
        x: 0,
        y: 0,
        panning: false,
        pointerId: null,
        moved: false,
      }
      setIsPanning(false)

      const origXs = new Map<string, number>()
      for (const dragId of dragIds) {
        const p = displayPositions.get(dragId)
        if (p) origXs.set(dragId, p.x)
      }
      if (origXs.size === 0) return

      nodeDragRef.current = {
        ids: [...origXs.keys()],
        startClientX: e.clientX,
        origXs,
        pointerId: e.pointerId,
        moved: false,
      }
    },
    [displayPositions, ensureForceAutoBaseline, selectedIds, setSelectedId, setSelectedIds],
  )

  const handleResetLayout = useCallback(() => {
    resetForceLayout()
    fittedGraphRef.current = null
  }, [resetForceLayout])

  const handlePresetLoaded = useCallback(() => {
    fittedGraphRef.current = null
    useLayoutStore.setState({ pendingForceFit: true })
  }, [])

  if (!graph || !layout) {
    return (
      <div className={`relative h-full w-full ${className ?? ''}`}>
        <svg ref={svgRef} className="h-full w-full bg-background" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full select-none overscroll-contain touch-none ${
        isPanning ? 'cursor-grabbing' : marqueeMode ? 'cursor-crosshair' : 'cursor-grab'
      } ${className ?? ''}`}
      onPointerDown={() => window.getSelection()?.removeAllRanges()}
    >
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMarqueeMode((on) => !on)
            marqueeRef.current = null
            setMarqueeScreen(null)
          }}
          title={t('layout.marqueeSelect')}
          aria-pressed={marqueeMode}
          className={`rounded-md border border-border bg-background/90 p-1.5 shadow-sm backdrop-blur hover:bg-accent ${
            marqueeMode ? 'bg-accent ring-1 ring-primary' : ''
          }`}
        >
          <BoxSelect className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleResetLayout}
          className="rounded-md border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-accent"
        >
          {t('layout.defaultView')}
        </button>
        <ForceViewPresets onLoaded={handlePresetLoaded} />
        <button
          type="button"
          onClick={toggleTreeFullscreen}
          title={isTreeFullscreenActive ? t('layout.exitFullscreen') : t('layout.enterFullscreen')}
          aria-pressed={isTreeFullscreenActive}
          className={`rounded-md border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur hover:bg-accent ${
            isTreeFullscreenActive ? 'bg-accent ring-1 ring-primary' : ''
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {isTreeFullscreenActive ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {t('layout.fullscreen')}
          </span>
        </button>
      </div>

      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none bg-background"
        onPointerDown={onSvgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <filter id="force-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.28" />
          </filter>
          <filter id="force-boundary-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="var(--force-glow-color)" floodOpacity="0.85" />
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#38bdf8" floodOpacity="0.45" />
          </filter>
          <pattern id="force-grid" width={32} height={32} patternUnits="userSpaceOnUse">
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="rgba(148,163,184,0.08)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#force-grid)" />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          <rect
            x={0}
            y={0}
            width={layout.contentWidth}
            height={layout.height}
            fill="transparent"
          />
          {layout.timelineTicks.map((tick) => (
            <g key={tick.year}>
              <line
                x1={FORCE_TIMELINE_WIDTH}
                y1={tick.y}
                x2={layout.contentWidth}
                y2={tick.y}
                stroke="rgba(148,163,184,0.2)"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
              <text
                x={FORCE_TIMELINE_WIDTH - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px] tabular-nums"
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
            stroke="rgba(148,163,184,0.45)"
            strokeWidth={1.5}
          />

          <g>
            {edgeSegments.map((segment) => {
              const dir = lineageHighlight
                ? classifySegmentHighlight(segment, lineageHighlight)
                : null
              const baseStroke = segment.kind === 'spouse' ? '#f472b6' : '#64748b'
              const stroke =
                dir === 'up'
                  ? lineageHighlight!.upColor
                  : dir === 'down'
                    ? lineageHighlight!.downColor
                    : baseStroke
              const dimmed = lineageHighlight !== null && dir === null
              return (
                <path
                  key={segment.id}
                  d={segmentPathD(segment)}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={dir ? 3 : segment.kind === 'spouse' ? 2 : 1.5}
                  strokeOpacity={dimmed ? 0.1 : dir ? 0.92 : segment.kind === 'spouse' ? 0.8 : 0.55}
                  strokeDasharray={segment.kind === 'spouse' && !dir ? '6 4' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}
          </g>

          {[...visibleIds].map((id) => {
            const person = persons.get(id)
            const pos = displayPositions.get(id)
            if (!person || !pos) return null

            const boundary = boundaryIds.has(id)
            const isSelected = selectedIds.has(id)
            const onLineagePath =
              lineageHighlight !== null &&
              (id === selectedId ||
                lineageHighlight.ancestorIds.has(id) ||
                lineageHighlight.descendantIds.has(id))
            const muted =
              boundary || (lineageHighlight !== null && !onLineagePath && !isSelected)

            return (
              <g
                key={id}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <PersonNodeCard
                  person={person}
                  pos={pos}
                  nodeFill={nodeFills.get(id) ?? {
                    type: 'solid',
                    color: lineageColor(person.lineage, colors),
                  }}
                  muted={muted}
                  boundary={boundary}
                  selected={isSelected}
                  highlighted={highlightedIds.has(id) || onLineagePath}
                  dragging={liveDragXs !== null && id in liveDragXs}
                  onSelect={(additive) => {
                    if (additive) {
                      const next = new Set(selectedIds)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      setSelectedIds(next)
                    } else {
                      setSelectedId(id)
                      setHighlightedIds(new Set())
                    }
                  }}
                  onOpenProfile={() => {
                    setProfilePersonId(id)
                    setSelectedId(id)
                    setHighlightedIds(new Set())
                  }}
                  onDragStart={(e) => onNodeDragStart(id, e)}
                />
              </g>
            )
          })}
        </g>
      </svg>

      <ForceTimelineEventsLayer
        transform={transform}
        layoutWidth={layout.width}
        layoutHeight={layout.height}
        yearMin={layout.yearMin}
        yearMax={layout.yearMax}
        timelineHeight={layout.timelineHeight}
      />

      {marqueeScreen && marqueeScreen.w + marqueeScreen.h > 0 && (
        <div
          className="pointer-events-none absolute border border-sky-400 bg-sky-400/15"
          style={{
            left: marqueeScreen.x,
            top: marqueeScreen.y,
            width: marqueeScreen.w,
            height: marqueeScreen.h,
          }}
        />
      )}
    </div>
  )
}
