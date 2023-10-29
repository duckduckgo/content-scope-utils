import { test as base } from '@playwright/test'
import { fork, spawn } from 'node:child_process'
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
  http: async ({}, use) => {
    /** @type {string[]} */
    const stdout = []
    const base = process.cwd()
    const file = join(base, 'serve.mjs')
    const args = ['-c', 'config/integration.json']
    console.log('node fork: ', file, args)
    const child = fork(file, ['-c', 'config/integration.json'], {
      cwd: base,
      stdio: 'pipe',
    })

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

    await use({ child, addresses: msg.addresses })

    child.kill('SIGTERM')

    await closed
  },
})
