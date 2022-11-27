/**
 * This will mock webkit handlers based on the key-values you provide
 * @param {import("@playwright/test").Page} page
 * @param {Record<string, any>} mocks
 */
export async function withMockedWebkitHandlers(page, mocks) {
  await page.addInitScript((mocks) => {
    window.__playwright = []
    window.webkit = {
      messageHandlers: {},
    }
    for (let [msgName, response] of Object.entries(mocks)) {
      window.webkit.messageHandlers[msgName] = {
        /**
         * @param {any} data
         */
        postMessage: async (data) => {
          const call = [msgName, data, response]
          window.__playwright.push(JSON.parse(JSON.stringify(call)))

          // If `data.messageHandling.methodName` exists, this means we're trying to use encryption
          // therefor we mimic what happens on the native side by calling the relevant window method
          // with the encrypted data
          const fn = window[data.messageHandling.methodName]
          if (typeof fn === 'function') {
            // @ts-ignore
            fn(encryptResponse(data, response))
            return
          }

          return JSON.stringify(response)
        },
      }
    }

    /**
     * @param {{
     *     "messageHandling": {
     *         "methodName": string,
     *         "secret": string,
     *         "key": number[],
     *         "iv": number[],
     *     },
     *     [index: string]: any,
     * }} message - the incoming message. The encryption parts are within `messageHandling`
     * @param {Record<string, any>} response - the data that will be encrypted and returned back to the page
     * @returns {Promise<{ciphertext: *[], tag: *[]}>}
     */
    async function encryptResponse(message, response) {
      /**
       * Create a `CryptoKey` based on the incoming message's 'key' field
       * @type {CryptoKey}
       */
      const keyEncoded = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(message.messageHandling.key),
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      )

      /**
       * Encode the response JSON
       */
      const enc = new TextEncoder()
      const encodedJson = enc.encode(JSON.stringify(response))

      /**
       * Encrypt the JSON string
       */
      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(message.messageHandling.iv),
        },
        keyEncoded,
        encodedJson
      )

      /**
       * Now return the encrypted data in the same shape that the native side would
       */
      return {
        ciphertext: [...new Uint8Array(encryptedContent)],
        tag: [],
      }
    }
  }, mocks)
}

/**
 * @param {import('@playwright/test').Page} page
 */
export function forwardConsole(page) {
  page.on('console', (msg) => {
    console.log('->', msg.type(), msg.text())
  })
}
