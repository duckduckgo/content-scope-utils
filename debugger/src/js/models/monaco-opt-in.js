import * as monaco from 'monaco-editor'
import { useContext, useEffect } from 'react'
import invariant from 'tiny-invariant'
import { GlobalContext } from '../global-config.react'
import useConstant from '@xstate/react/es/useConstant'

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
 * @param {monaco.Uri} uri
 */
export function useMonacoErrors(onErrors, uri) {
  useEffect(() => {
    const uriString = uri.toString()
    const sub = monaco.editor.onDidChangeMarkers((uriList) => {
      const markers = monaco.editor.getModelMarkers({ resource: uriList[0] })
      const errors = markers.filter((m) => {
        return m.resource.toString() === uriString && m.severity === monaco.MarkerSeverity.Error
      })
      /** @type {ContentError[]} */
      const contentErrors = errors.map((x) => {
        return {
          message: 'line: ' + x.startLineNumber + ' ' + x.message,
        }
      })
      onErrors(contentErrors)
    })
    return () => sub.dispose()
  }, [onErrors, uri])
}

/**
 * @param {(content: string) => void} onContentChanged
 * @param {monaco.Uri} uri
 */
export function useMonacoContentChanged(onContentChanged, uri) {
  const { globalConfig } = useContext(GlobalContext)
  const { editorSaveTimeout } = globalConfig
  // listen to local model changes and propagate
  useEffect(() => {
    const model = monaco.editor.getModel(uri)
    invariant(model, 'must find by uri: ' + uri.path)
    if (window.__playwright_01) {
      window.__playwright_01['models'] ??= {}
      window.__playwright_01['models'][uri.path] = model
    }
    let timeout
    const sub = model.onDidChangeContent(() => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        onContentChanged(model.getValue())
      }, editorSaveTimeout)
    })

    return () => {
      sub.dispose()
      clearTimeout(timeout)
      if (window.__playwright_01) {
        if (model.uri.path in window.__playwright_01['models']) {
          Reflect.deleteProperty(window.__playwright_01['models'], model.uri.path)
        }
      }
    }
  }, [uri, editorSaveTimeout, onContentChanged])
}

/**
 * @param {string} lastValue
 * @param {monaco.Uri} uri
 */
export function useMonacoModelSync(lastValue, uri) {
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

/**
 * @param {monaco.Uri} uri - monaco compatible identifier
 * @param {string} value - initial model value
 * @param {string} language - default is application/json
 * @return {monaco.editor.ITextModel}
 */
export function useMonacoModel(uri, value, language) {
  const model = useConstant(() => {
    return monaco.editor.createModel(value, language, uri)
  })

  useEffect(() => {
    return () => {
      model.dispose()
    }
  }, [model])

  return model
}
