import { readFileSync } from 'node:fs'
import { DEFAULT_BASE_VALUE } from './debug-tools'

export class Resources {
  /**
   * @param {import("@playwright/test").Page} page
   */
  constructor(page) {
    this.page = page
  }
  get remoteResources() {
    return {
      macos: () => readFileSync('./schema/__fixtures__/macos-config.json', 'utf8'),
      /**
       * @param {string} content
       * @return {import('../../schema/__generated__/schema.types').RemoteResource}
       */
      testResource: (content = DEFAULT_BASE_VALUE) => {
        /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
        const resource = {
          id: 'test-resource',
          url: 'https://example.com/test-resource.json',
          name: 'Test Resource',
          current: {
            source: {
              remote: {
                url: 'https://example.com/test-resource.json',
                fetchedAt: '2023-07-05T12:34:56Z',
              },
            },
            contents: content,
            contentType: 'application/json',
          },
        }
        return resource
      },
      privacyConfig: (contents = this.remoteResources.macos()) => {
        return {
          id: 'privacy-configuration',
          url: 'https://example.com/macos-config.json',
          name: 'Privacy Config',
          current: {
            source: {
              remote: {
                url: 'https://example.com/macos-config.json',
                fetchedAt: '2023-07-05T12:34:56Z',
              },
            },
            contents,
            contentType: 'application/json',
          },
        }
      },
    }
  }
  /**
   * @param {import('../../schema/__generated__/schema.types').RemoteResource} resource
   * @param {string} contents
   * @return {import('../../schema/__generated__/schema.types').RemoteResource}
   */
  static updatedResource(resource, contents = '{ "updated": true }') {
    /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
    return {
      ...resource,
      current: {
        source: {
          debugTools: {
            modifiedAt: '2023-07-05T12:34:56Z',
          },
        },
        contents,
        contentType: 'application/json',
      },
    }
  }
}
