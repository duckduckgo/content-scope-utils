export type DomainExceptionEvents =
  | { type: 'DOMAINS'; domains: string[]; current: string }
  | { type: 'SELECT_TAB_DOMAIN'; domain: string }
  | { type: 'ADD_NEW' }
  | { type: 'SAVE_NEW'; domain: string }
  | { type: 'CANCEL' }
  | { type: 'CLEAR' }
  | { type: '🌐 url updated' }
  | { type: 'EDIT' }
