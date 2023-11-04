import { test as base } from '@playwright/test'
import { fork } from 'node:child_process'
import invariant from 'tiny-invariant'
import * as z from 'zod'
import { join } from 'node:path'

const messageSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ready'),
    addresses: z.array(z.string()),
    cwd: z.string(),
  }),
])

export const testHttp = base.extend({
  http: async ({}, use, testInfo) => {
    const base = process.cwd()
    const file = 'serve.mjs'
    const args = ['-c', 'config/integration.json']
    const { msg, exit } = await handleChild(base, file, args, testInfo)
    await use({ addresses: msg.addresses })
    await exit()
  },
  native: async ({}, use, testInfo) => {
    const base = process.cwd()
    const file = 'static.mjs'
    const args = []
    const { msg, exit } = await handleChild(base, file, args, testInfo)
    await use({ addresses: msg.addresses })
    await exit()
  },
})

/**
 * @param {string} base
 * @param {string} file
 * @param {string[]} args
 * @param {import("@playwright/test").TestInfo} testInfo
 */
async function handleChild(base, file, args, testInfo) {
  const absolute = join(base, file)

  await testInfo.attach('fork args', {
    body: JSON.stringify([absolute, ...args], null, 2),
    contentType: 'application/json',
  })

  const child = fork(absolute, args, {
    cwd: base,
    stdio: 'pipe',
  })

  /** @type {string[]} */
  const stdout = []

  invariant(child)

  child.stdout?.on('data', (d) => {
    stdout.push(d.toString())
  })

  child.stderr?.on('data', (d) => console.error(d.toString()))

  const closed = new Promise((res, rej) => {
    child.on('exit', (code) => {
      // console.log('exit, code: ', code)
      if (code !== 0 && code !== null) {
        rej(new Error('process exited with code ' + code))
      }
    })
    child.on('close', (code) => {
      // console.log("[child]: close", code);
      res(code)
    })
    child.on('disconnect', (...args) => {
      // console.log('disconnect', ...args)
    })
  })

  const msg = await new Promise((res, rej) => {
    child.on('spawn', (...args) => {
      // console.log('✅ spawned')
    })
    child.on('error', (error) => {
      rej(new Error('child process error' + error))
    })
    child.on('message', (message) => {
      // console.log('📩 message', message)
      const parsed = messageSchema.safeParse(message)
      if (parsed.success) {
        res(parsed.data)
      } else {
        rej(new Error('zod parsing error' + parsed.error))
      }
    })
  })

  return {
    msg,
    async exit() {
      child.kill('SIGTERM')

      await closed
    },
  }
}
