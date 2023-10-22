import { readFileSync } from 'node:fs'

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
      testResource: (content) => {
        /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
        const resource = {
          id: 'test-resource',
          url: 'https://example.com/test-resource.json',
          name: 'Test Resource',
          kind: 'text',
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
      /**
       * @return {import('../../schema/__generated__/schema.types').RemoteResource}
       */
      privacyConfig: (contents = this.remoteResources.macos()) => {
        /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
        const resource = {
          id: 'privacy-configuration',
          url: 'https://example.com/macos-config.json',
          name: 'Privacy Config',
          kind: 'privacy-configuration',
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
        return resource
      },
    }
  }
  /**
   * @param {import('../../schema/__generated__/schema.types').RemoteResource} resource
   * @param {string} contents
   * @return {import('../../schema/__generated__/schema.types').RemoteResource}
   */
  static updatedResource(resource, contents) {
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
  /**
   * @param {import('../../schema/__generated__/schema.types').RemoteResource} resource
   * @param {string} contents
   * @param {string} url
   * @return {import('../../schema/__generated__/schema.types').RemoteResource}
   */
  static updatedUrl(resource, url, contents = '{ "updated": true }') {
    /** @type {import('../../schema/__generated__/schema.types').RemoteResource} */
    return {
      ...resource,
      current: {
        source: {
          remote: {
            url: url,
            fetchedAt: '2023-07-05T12:34:56Z',
          },
        },
        contents,
        contentType: 'application/json',
      },
    }
  }
}
