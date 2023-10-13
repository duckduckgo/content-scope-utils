// eslint-disable-next-line no-undef
import { extractUrls } from '../src/js/transforms'
import { expect } from '@esm-bundle/chai'

describe('text utils', () => {
  it.only('extracts urls from text', async () => {
    const input = `2023-10-13 13:59:25.974  3547-4229  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://example.com/favicon.ico is a first party url
2023-10-13 14:03:26.564  5560-5770  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://example.com/favicon.ico is a first party url
2023-10-13 14:04:19.645  5560-5771  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://shaneddg.ngrok.io/ resource https://tlx.3lift.com/header/auction WAS identified as a tracker and status=BLOCKED
2023-10-13 14:04:19.679  5560-5770  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://shaneddg.ngrok.io/ resource https://googletagmanager.com/gtag/js/abc?ab=3232 WAS identified as a tracker and status=BLOCKED
2023-10-13 14:04:19.704  5560-5770  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://shaneddg.ngrok.io/favicon.ico is a first party url
---------------------------- PROCESS ENDED (5560) for package com.duckduckgo.mobile.android.debug ----------------------------
---------------------------- PROCESS STARTED (6094) for package com.duckduckgo.mobile.android.debug ----------------------------
2023-10-13 14:05:17.275  6094-6310  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://shaneddg.ngrok.io/ resource https://tlx.3lift.com/header/auction WAS identified as a tracker and status=SITE_BREAKAGE_ALLOWED
2023-10-13 14:05:17.310  6094-6309  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://shaneddg.ngrok.io/ resource https://googletagmanager.com/gtag/js/abc?ab=3232 WAS identified as a tracker and status=BLOCKED
2023-10-13 14:05:17.418  6094-6309  TrackerDetectorImpl     com.duckduckgo.mobile.android.debug  V  https://shaneddg.ngrok.io/favicon.ico is a first party url
`

    const { urls, unique } = extractUrls(input)
    const actual = JSON.stringify({ urls, unique }, null, 2)
    const expected = JSON.stringify(
      {
        urls: [
          'https://example.com/favicon.ico',
          'https://example.com/favicon.ico',
          'https://shaneddg.ngrok.io/',
          'https://tlx.3lift.com/header/auction',
          'https://shaneddg.ngrok.io/',
          'https://googletagmanager.com/gtag/js/abc?ab=3232',
          'https://shaneddg.ngrok.io/favicon.ico',
          'https://shaneddg.ngrok.io/',
          'https://tlx.3lift.com/header/auction',
          'https://shaneddg.ngrok.io/',
          'https://googletagmanager.com/gtag/js/abc?ab=3232',
          'https://shaneddg.ngrok.io/favicon.ico',
        ],
        unique: [
          'https://example.com/favicon.ico',
          'https://shaneddg.ngrok.io/',
          'https://tlx.3lift.com/header/auction',
          'https://googletagmanager.com/gtag/js/abc',
          'https://shaneddg.ngrok.io/favicon.ico',
        ],
      },
      null,
      2,
    )

    expect(actual).to.deep.eq(expected)
  })
})
