import { useEffect, useRef } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force'
import { useGraphStore } from '@/stores/graph-store'
import { useTimeStore } from '@/stores/time-store'
import { useVaultStore } from '@/stores/vault-store'
import type { ViewProps } from '../types'

interface SimNode {
  id: string
  x: number
  y: number
  color: string
  label: string
  visible: boolean
}

export function ForceView({ className }: ViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const graph = useGraphStore((s) => s.graph)
  const persons = useGraphStore((s) => s.persons)
  const selectedId = useGraphStore((s) => s.selectedId)
  const setSelectedId = useGraphStore((s) => s.setSelectedId)
  const isPersonVisible = useTimeStore((s) => s.isPersonVisible)
  const colors = useVaultStore((s) => s.vault?.config.lineageColors ?? {})

  useEffect(() => {
    if (!graph || !svgRef.current) return
    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    const nodes: SimNode[] = graph.nodes().map((id) => {
      const p = persons.get(id)!
      return {
        id,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        color: colors[p.lineage] ?? '#94a3b8',
        label: p.fullName,
        visible: isPersonVisible(p.birthYear, p.deathYear),
      }
    })

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    const links = graph
      .edges()
      .filter((e) => {
        const t = graph.getEdgeAttributes(e).type
        return t === 'parent-child' || t === 'spouse'
      })
      .map((e) => {
        const [s, t] = graph.extremities(e)
        return { source: s, target: t }
      })
      .filter((l) => nodeMap.has(l.source as string) && nodeMap.has(l.target as string))

    const simulation = forceSimulation(nodes)
      .force('link', forceLink(links).id((d) => (d as SimNode).id).distance(80))
      .force('charge', forceManyBody().strength(-120))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(20))

    const svg = svgRef.current
    svg.innerHTML = ''

    const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svg.appendChild(linkGroup)
    svg.appendChild(nodeGroup)

    const linkEls = links.map(() => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('stroke', '#475569')
      line.setAttribute('stroke-opacity', '0.5')
      linkGroup.appendChild(line)
      return line
    })

    const nodeEls = nodes.map((n) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.style.cursor = 'pointer'
      g.style.display = n.visible ? '' : 'none'
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('r', '8')
      circle.setAttribute('fill', n.color)
      if (n.id === selectedId) {
        circle.setAttribute('stroke', '#fff')
        circle.setAttribute('stroke-width', '2')
      }
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('font-size', '10')
      text.setAttribute('fill', '#e2e8f0')
      text.textContent = n.label
      g.appendChild(circle)
      g.appendChild(text)
      g.addEventListener('click', () => setSelectedId(n.id))
      nodeGroup.appendChild(g)
      return { g, circle, text, node: n }
    })

    simulation.on('tick', () => {
      links.forEach((l, i) => {
        const s = nodeMap.get(l.source as string)!
        const t = nodeMap.get(l.target as string)!
        const el = linkEls[i]
        el.setAttribute('x1', String(s.x))
        el.setAttribute('y1', String(s.y))
        el.setAttribute('x2', String(t.x))
        el.setAttribute('y2', String(t.y))
      })
      nodeEls.forEach(({ g, circle, text, node }) => {
        g.setAttribute('transform', `translate(${node.x},${node.y})`)
        text.setAttribute('x', '12')
        text.setAttribute('y', '4')
        circle.setAttribute('fill', node.color)
      })
    })

    return () => {
      simulation.stop()
    }
  }, [graph, persons, selectedId, setSelectedId, isPersonVisible, colors])

  return (
    <svg
      ref={svgRef}
      className={`h-full w-full bg-background ${className ?? ''}`}
    />
  )
}
