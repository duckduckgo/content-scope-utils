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
    this.#publish()
  }

  /** @type {((e: any) => void)[]} */
  #listeners = []

  /**
   * @param {(e: any) => void} listener
   * @returns {Disposable}
   */
  onDidChangeContent(listener) {
    this.#listeners.push(listener)

    return {
      dispose: () => {
        const index = this.#listeners.indexOf(listener)
        this.#listeners.splice(index, 1)
      },
    }
  }

  #publish() {
    for (let listener of this.#listeners) {
      listener(null)
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
