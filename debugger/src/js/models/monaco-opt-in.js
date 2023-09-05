import * as monaco from 'monaco-editor'
import { useEffect } from 'react'

/**
 * @typedef {import('../remote-resources/remote-resources.machine.types').ContentError} ContentError
 */

/**
 * Global Setup for Monaco
 */
// @ts-ignore
// eslint-disable-next-line no-undef
globalThis.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './js/editor/json.js'
    }
    return './js/editor/editor.js'
  },
}

/**
 * @param {object} params
 * @param {string} params.content
 * @param {string} params.contentType
 */
export function createTextModel({ content, contentType }) {
  return monaco.editor.createModel(content, contentType)
}

/**
 * @param {(errors: ContentError[]) => void} onErrors
 */
export function useMonacoErrors(onErrors) {
  useEffect(() => {
    const sub = monaco.editor.onDidChangeMarkers((uriList) => {
      const markers = monaco.editor.getModelMarkers({ resource: uriList[0] })
      const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error)
      /** @type {ContentError[]} */
      const contentErrors = errors.map((x) => {
        return {
          message: 'line: ' + x.startLineNumber + ' ' + x.message,
        }
      })
      onErrors(contentErrors)
    })
    return () => sub.dispose()
  }, [onErrors])
}
