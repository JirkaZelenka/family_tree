export type TextMentionKind = 'person' | 'lineage'

export interface TextMention {
  kind: TextMentionKind
  /** Kanonické person id nebo klíč rodu ze stromu. */
  ref: string
  /** Viditelný text bez `{id}`. */
  display: string
  start: number
  end: number
}

export interface UnresolvedTextMention {
  display: string
  rawRef: string
  start: number
  end: number
}

export interface TextDocument {
  id: string
  title: string
  date?: string
  filePath: string
  rawContent: string
  displayBody: string
  mentions: TextMention[]
}

export interface TextExcerpt {
  before: string
  hit: string
  after: string
}

export interface TextOccurrence {
  document: TextDocument
  mentions: TextMention[]
  excerpt: TextExcerpt
}
