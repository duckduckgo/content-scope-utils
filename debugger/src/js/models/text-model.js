/**
 * @typedef {Pick<import("monaco-editor").editor.ITextModel, "getValue" | "setValue" | "onDidChangeContent">} TextModel
 * @typedef {import("monaco-editor").IDisposable} Disposable
 */
import { createContext } from 'react'

/**
 * @implements TextModel
 */
export class PlainTextModel {
  /**
   * @param {string} content
   * @param {string} contentType
   */
  constructor(content, contentType) {
    this.#content = content
    this.#value = content
    this.#contentType = contentType
  }
  #content
  #contentType
  #value
  /**
   * @returns {string}
   */
  getValue() {
    return this.#value
  }

  /**
   * @param {string} value
   */
  setValue(value) {
    this.#value = value
  }

  /**
   * onDidChangeContent(listener: (e: IModelContentChangedEvent) => void): IDisposable;
   * @param {(e: any) => void} listener
   * @returns {Disposable}
   */
  onDidChangeContent(listener) {
    console.log('got listener')
    return {
      dispose() {
        console.log('dispose...')
      },
    }
  }
}

export const TextModelContext = createContext({
  /** @type {((params: { content: string; contentType: string }) => TextModel) | null} */
  createTextModel: null,
  /** @type {"monaco" | "web"} */
  editorType: 'web',
})

/**
 * @param {object} params
 * @param {string} params.content
 * @param {string} params.contentType
 */
export function createTextModel({ content, contentType }) {
  return new PlainTextModel(content, contentType)
}
