import { ContentError } from '../remote-resources.machine.types'

export interface ScrollData {
  scrollTop: number
}

// prettier-ignore
export interface DoneInvokeReadInitialEvent {
  type: 'done.invoke.readInitial';
  data: ScrollData | null;
}

// prettier-ignore
export interface ErrorInvokeReadInitialEvent {
  type: 'error.platform.readInitial';
  data: Error;
}

export interface SetScrollEvent {
  type: 'TextEditor.set-scroll'
  payload: { scrollTop: number }
}

export interface ContentChangedEvent {
  type: 'TextEditor.content-changed'
  payload: { content: string }
}

export interface ClearErrorsEvent {
  type: 'TextEditor.clear-errors'
}

export interface SetErrorsEvent {
  type: 'TextEditor.set-errors'
  payload: ContentError[]
}

export interface SetContentEvent {
  type: 'TextEditor.set-content'
  payload: { content: string }
}

// Export union of all the interfaces using the original union name
export type TextEditorEvents =
  | DoneInvokeReadInitialEvent
  | ErrorInvokeReadInitialEvent
  | SetScrollEvent
  | ContentChangedEvent
  | ClearErrorsEvent
  | SetErrorsEvent
  | SetContentEvent

export type ReadInitialData = Extract<
  TextEditorEvents,
  { type: 'done.invoke.readInitial' } | { type: 'error.platform.readInitial' }
>['data']
