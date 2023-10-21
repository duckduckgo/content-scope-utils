import * as monaco from 'monaco-editor'
import { useEffect } from 'react'
import invariant from 'tiny-invariant'

/**
 * @typedef {import('../remote-resources/remote-resources.machine.types').ContentError} ContentError
 * @typedef {import('monaco-editor').editor.ITextModel} ITextModel
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

/**
 * @param {(content: string) => void} onContentChanged
 * @param {monaco.Uri} uri
 */
export function useMonacoContentChanged(onContentChanged, uri) {
  // listen to local model changes and propagate
  useEffect(() => {
    const model = monaco.editor.getModel(uri)
    invariant(model, 'must find by uri: ' + uri.path)
    if ('__playwright_01' in window) {
      window.__playwright_01['models'] ??= {}
      window.__playwright_01['models'][uri.path] = model
    }
    let t
    const sub = model.onDidChangeContent(() => {
      clearTimeout(t)
      t = setTimeout(
        () => {
          onContentChanged(model.getValue())
        },
        '__playwright_01' in window ? 0 : 500,
      )
    })

    return () => {
      sub.dispose()
      clearTimeout(t)
      if (model.uri.path in window.__playwright_01['models']) {
        Reflect.deleteProperty(window.__playwright_01['models'], model.uri.path)
      }
    }
  }, [uri])
}

/**
 * @param {string} lastValue
 * @param {monaco.Uri} uri
 */
export function useMonacoLastValue(lastValue, uri) {
  useEffect(() => {
    const model = monaco.editor.getModel(uri)
    invariant(model, 'must find by uri: ' + uri.path)
    if (lastValue === model.getValue()) {
      // do nothing
    } else {
      model.setValue(lastValue)
    }
  }, [lastValue, uri])
}
