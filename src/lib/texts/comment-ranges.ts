/** DOM Range helpers for comment offsets against rendered textContent. */

export function createRangeFromTextOffsets(
  root: Node,
  start: number,
  end: number,
): Range | null {
  if (end <= start || start < 0) return null
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let pos = 0
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0

  let node = walker.nextNode() as Text | null
  while (node) {
    const len = node.data.length
    if (!startNode && pos + len >= start) {
      startNode = node
      startOffset = start - pos
    }
    if (pos + len >= end) {
      endNode = node
      endOffset = end - pos
      break
    }
    pos += len
    node = walker.nextNode() as Text | null
  }

  if (!startNode || !endNode) return null
  try {
    const range = document.createRange()
    range.setStart(startNode, Math.min(startOffset, startNode.data.length))
    range.setEnd(endNode, Math.min(endOffset, endNode.data.length))
    return range
  } catch {
    return null
  }
}

export function findTextRange(root: Node, needle: string): Range | null {
  const text = needle.trim()
  if (!text) return null
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let haystack = ''
  const pieces: Array<{ node: Text; start: number }> = []
  let node = walker.nextNode() as Text | null
  while (node) {
    pieces.push({ node, start: haystack.length })
    haystack += node.data
    node = walker.nextNode() as Text | null
  }
  const index = haystack.indexOf(text)
  if (index < 0) return null
  return createRangeFromTextOffsets(root, index, index + text.length)
}

export function resolveCommentDomRange(
  root: Node,
  comment: { start: number; end: number; quote: string },
): Range | null {
  const byOffset = createRangeFromTextOffsets(root, comment.start, comment.end)
  if (byOffset) {
    const matched = byOffset.toString()
    const quote = comment.quote.trim()
    if (!quote || matched === quote || matched.includes(quote) || quote.includes(matched.trim())) {
      return byOffset
    }
  }
  return findTextRange(root, comment.quote)
}

export interface CommentClientRect {
  commentId: number
  top: number
  left: number
  width: number
  height: number
}

export function collectCommentClientRects(
  root: HTMLElement,
  comments: Array<{ id: number; start: number; end: number; quote: string }>,
): CommentClientRect[] {
  const rootRect = root.getBoundingClientRect()
  const results: CommentClientRect[] = []
  for (const comment of comments) {
    const range = resolveCommentDomRange(root, comment)
    if (!range) continue
    const rects = [...range.getClientRects()]
    for (const rect of rects) {
      if (rect.width < 1 || rect.height < 1) continue
      results.push({
        commentId: comment.id,
        top: rect.top - rootRect.top + root.scrollTop,
        left: rect.left - rootRect.left + root.scrollLeft,
        width: rect.width,
        height: rect.height,
      })
    }
  }
  return results
}

export function findCommentAtPoint(
  root: HTMLElement,
  comments: Array<{ id: number; start: number; end: number; quote: string }>,
  x: number,
  y: number,
): number | null {
  for (const comment of comments) {
    const range = resolveCommentDomRange(root, comment)
    if (!range) continue
    for (const rect of range.getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return comment.id
      }
    }
  }
  return null
}

export function textOffsetFromPoint(root: HTMLElement, x: number, y: number): number | null {
  const caret =
    typeof document.caretPositionFromPoint === 'function'
      ? document.caretPositionFromPoint(x, y)
      : null
  let node: Node | null = null
  let offset = 0
  if (caret) {
    node = caret.offsetNode
    offset = caret.offset
  } else if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y)
    if (!range) return null
    node = range.startContainer
    offset = range.startOffset
  }
  if (!node || !root.contains(node)) return null
  try {
    const pre = document.createRange()
    pre.selectNodeContents(root)
    pre.setEnd(node, offset)
    return pre.toString().length
  } catch {
    return null
  }
}

export function findCommentAtOffset(
  comments: Array<{ id: number; start: number; end: number }>,
  offset: number | null,
): number | null {
  if (offset == null) return null
  const hit = comments.find((c) => offset >= c.start && offset < c.end)
  return hit?.id ?? null
}
