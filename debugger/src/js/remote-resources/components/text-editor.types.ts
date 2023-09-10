import { ContentError } from '../remote-resources.machine.types'

export interface ScrollData {
  scrollTop: number
}

// prettier-ignore
export type TextEditorEvents =
  | { type: 'done.invoke.readInitial'; data: ScrollData | null }
  | { type: 'set-scroll'; payload: { scrollTop: number } }
  | { type: 'content-changed'; payload: { content: string } }
  | { type: 'clear-errors' }
  | { type: 'set-errors'; payload: ContentError[] }
  | { type: 'set-content'; payload: { content: string } }

export type Return = Extract<TextEditorEvents, { type: 'done.invoke.readInitial' }>['data']

export interface TextEditorServices {
  readInitial: Promise<Return>
  [index: string]: any
}
