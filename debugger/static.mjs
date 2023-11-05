import express from 'express'
import { ready, signals } from './common.mjs'
const app = express()

app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))
app.use(express.static('dist'))

// @ts-expect-error - TS can't handle that this can be empty or a string or number
const server = app.listen(undefined, '0.0.0.0', () => {
  const { addresses, address } = ready(server)

  for (let address of addresses) {
    const url = new URL(address)
    url.hash = '/remoteResources'
    url.searchParams.set('transport', 'http')
    console.log('Available on:', url.href)
  }
})

signals()
