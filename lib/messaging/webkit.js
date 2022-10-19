// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MessagingTransport, MissingHandler } from "../messaging.js";

/**
 * A wrapper for sending/receiving messages
 * @implements {MessagingTransport}
 */
export class WebkitMessagingTransport {
  /** @type {WebkitMessagingConfig} */
  config;
  globals;
  /**
   * @param {WebkitMessagingConfig} config
   */
  constructor(config) {
    this.config = config;
    this.globals = captureGlobals();
    if (!this.config.hasModernWebkitAPI) {
      this.captureWebkitHandlers(this.config.webkitMessageHandlerNames);
    }
  }
  /**
   * Sends message to the webkit layer (fire and forget)
   * @param {String} handler
   * @param {*} data
   * @internal
   */
  wkSend(handler, data = {}) {
    if (!(handler in this.globals.window.webkit.messageHandlers)) {
      throw new MissingHandler(`Missing webkit handler: '${handler}'`);
    }
    const outgoing = {
      ...data,
      messageHandling: { ...data.messageHandling, secret: this.config.secret },
    };
    if (!this.config.hasModernWebkitAPI) {
      if (!(handler in this.globals.capturedWebkitHandlers)) {
        throw new Error(`cannot continue, method ${handler} not captured on macos < 11`);
      } else {
        return this.globals.capturedWebkitHandlers[handler](outgoing);
      }
    }
    return this.globals.window.webkit.messageHandlers[handler].postMessage?.(outgoing);
  }

  /**
   * Sends message to the webkit layer and waits for the specified response
   * @param {String} handler
   * @param {*} data
   * @returns {Promise<*>}
   * @internal
   */
  async wkSendAndWait(handler, data = {}) {
    if (this.config.hasModernWebkitAPI) {
      const response = await this.wkSend(handler, data);
      return this.globals.JSONparse(response || "{}");
    }

    try {
      const randMethodName = this.createRandMethodName();
      const key = await this.createRandKey();
      const iv = this.createRandIv();

      const { ciphertext, tag } = await new this.globals.Promise((/** @type {any} */ resolve) => {
        this.generateRandomMethod(randMethodName, resolve);
        data.messageHandling = {
          methodName: randMethodName,
          secret: this.config.secret,
          key: this.globals.Arrayfrom(key),
          iv: this.globals.Arrayfrom(iv),
        };
        this.wkSend(handler, data);
      });

      const cipher = new this.globals.Uint8Array([...ciphertext, ...tag]);
      const decrypted = await this.decrypt(cipher, key, iv);
      return this.globals.JSONparse(decrypted || "{}");
    } catch (e) {
      // re-throw when the error is just a 'MissingHandler'
      if (e instanceof MissingHandler) {
        throw e;
      } else {
        console.error("decryption failed", e);
        console.error(e);
        return { error: e };
      }
    }
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   */
  notify(name, data = {}) {
    this.wkSend(name, data);
  }
  /**
   * @param {string} name
   * @param {Record<string, any>} [data]
   * @param {{signal?: AbortSignal}} [opts]
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request(name, data = {}, opts = {}) {
    return this.wkSendAndWait(name, data);
  }
  /**
   * Generate a random method name and adds it to the global scope
   * The native layer will use this method to send the response
   * @param {string} randomMethodName
   * @param {Function} callback
   */
  generateRandomMethod(randomMethodName, callback) {
    this.globals.ObjectDefineProperty(this.globals.window, randomMethodName, {
      enumerable: false,
      // configurable, To allow for deletion later
      configurable: true,
      writable: false,
      /**
       * @param {any[]} args
       */
      value: (...args) => {
        callback(...args);
        delete this.globals.window[randomMethodName];
      },
    });
  }

  randomString() {
    return "" + this.globals.getRandomValues(new this.globals.Uint32Array(1))[0];
  }

  createRandMethodName() {
    return "_" + this.randomString();
  }

  /**
   * @type {{name: string, length: number}}
   */
  algoObj = { name: "AES-GCM", length: 256 };

  /**
   * @returns {Promise<Uint8Array>}
   */
  async createRandKey() {
    const key = await this.globals.generateKey(this.algoObj, true, ["encrypt", "decrypt"]);
    const exportedKey = await this.globals.exportKey("raw", key);
    return new this.globals.Uint8Array(exportedKey);
  }

  /**
   * @returns {Uint8Array}
   */
  createRandIv() {
    return this.globals.getRandomValues(new this.globals.Uint8Array(12));
  }

  /**
   * @param {BufferSource} ciphertext
   * @param {BufferSource} key
   * @param {Uint8Array} iv
   * @returns {Promise<string>}
   */
  async decrypt(ciphertext, key, iv) {
    const cryptoKey = await this.globals.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
    const algo = { name: "AES-GCM", iv };

    let decrypted = await this.globals.decrypt(algo, cryptoKey, ciphertext);

    let dec = new this.globals.TextDecoder();
    return dec.decode(decrypted);
  }

  /**
   * When required (such as on macos 10.x), capture the `postMessage` method on
   * each webkit messageHandler
   *
   * @param {string[]} handlerNames
   */
  captureWebkitHandlers(handlerNames) {
    const handlers = window.webkit.messageHandlers;
    if (!handlers) throw new MissingHandler("window.webkit.messageHandlers was absent");
    for (let webkitMessageHandlerName of handlerNames) {
      if (typeof handlers[webkitMessageHandlerName]?.postMessage === "function") {
        /**
         * `bind` is used here to ensure future calls to the captured
         * `postMessage` have the correct `this` context
         */
        const original = handlers[webkitMessageHandlerName];
        const bound = handlers[webkitMessageHandlerName].postMessage?.bind(original);
        this.globals.capturedWebkitHandlers[webkitMessageHandlerName] = bound;
        delete handlers[webkitMessageHandlerName].postMessage;
      }
    }
  }
}

export class WebkitMessagingConfig {
  /**
   * Whether or not the current WebKit Platform supports secure messaging
   * by default (eg: macOS 11+)
   * @type {boolean}
   */
  hasModernWebkitAPI;
  /**
   * A list of WebKit message handler names that a user script can send
   * @type {string[]}
   */
  webkitMessageHandlerNames;
  /**
   * A string provided by native platforms to be sent with future outgoing
   * messages
   * @type {string}
   */
  secret;
  /**
   * @param {boolean} hasModernWebkitAPI
   * @param {string[]} webkitMessageHandlerNames
   * @param {string} secret
   */
  constructor(hasModernWebkitAPI, webkitMessageHandlerNames, secret) {
    this.hasModernWebkitAPI = hasModernWebkitAPI;
    this.webkitMessageHandlerNames = webkitMessageHandlerNames;
    this.secret = secret;
  }
}

/**
 * Capture some globals used for messaging handling to prevent page
 * scripts from tampering with this
 */
function captureGlobals() {
  // Creat base with null prototype
  const output = Object.create(null);
  return Object.assign(output, {
    window,
    // Methods must be bound to their interface, otherwise they throw Illegal invocation
    encrypt: window.crypto.subtle.encrypt.bind(window.crypto.subtle),
    decrypt: window.crypto.subtle.decrypt.bind(window.crypto.subtle),
    generateKey: window.crypto.subtle.generateKey.bind(window.crypto.subtle),
    exportKey: window.crypto.subtle.exportKey.bind(window.crypto.subtle),
    importKey: window.crypto.subtle.importKey.bind(window.crypto.subtle),
    getRandomValues: window.crypto.getRandomValues.bind(window.crypto),
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    JSONstringify: window.JSON.stringify,
    JSONparse: window.JSON.parse,
    Arrayfrom: window.Array.from,
    Promise: window.Promise,
    ObjectDefineProperty: window.Object.defineProperty,
    addEventListener: window.addEventListener.bind(window),
    /**
     * @type {Record<string, (...args: any[]) => Promise<any>>}
     */
    capturedWebkitHandlers: {},
  });
}
