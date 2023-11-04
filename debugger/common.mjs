import invariant from 'tiny-invariant'
import { networkInterfaces } from 'node:os'
import { createInterface } from 'node:readline'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @param {import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>} server
 */
export function ready(server) {
  // read config, try to use it
  const address = server.address()
  invariant(address && typeof address !== 'string')
  const port = address.port
  const addresses = getAddresses(String(port)).map((x) => x.href)
  const plainAddresses = addresses.map((x) => {
    const url = new URL(x)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString()
  })

  if (process.send) {
    process.send({
      kind: 'ready',
      addresses: plainAddresses,
      cwd: __dirname,
    })
  }

  for (let address of addresses) {
    console.log('Available on:', address)
  }

  return address
}

/**
 * @param {string} port
 * @return {URL[]}
 */
function getAddresses(port) {
  const internal = 'localhost'
  const external = Object.values(networkInterfaces())
    .flat()
    .filter((networkInterfaceInfo) => {
      invariant(networkInterfaceInfo)
      return networkInterfaceInfo.family === 'IPv4'
    })
    .map((networkInterfaceInfo) => {
      invariant(networkInterfaceInfo)
      return networkInterfaceInfo.address
    })

  return [internal, ...external].map((address) => {
    invariant(typeof address === 'string')
    const url = new URL('http://' + address)
    url.port = port
    url.searchParams.set('transport', 'native')
    url.hash = '/remoteResources'
    return url
  })
}

export function signals() {
  if (process.platform === 'win32') {
    createInterface({
      input: process.stdin,
      output: process.stdout,
    }).on('SIGINT', function () {
      process.emit('SIGINT')
    })
  }

  process.on('SIGINT', function () {
    console.log('serve.mjs stopped.')
    process.exit()
  })

  process.on('SIGTERM', function () {
    console.log('serve.mjs stopped.')
    process.exit()
  })
}
