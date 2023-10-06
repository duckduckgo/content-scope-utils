import z from 'zod'

export const GlobalConfig = z.object({
  editor: z.enum(['simple', 'monaco']).default('monaco'),
  platform: z.string().default('integration'),
})

/**
 * @typedef {import("zod").infer<typeof GlobalConfig>} GlobalConfig
 */

/**
 * @param {GlobalConfig} globalConfig
 */
export function configAwareFactory(globalConfig) {
  return {
    /**
     * Ret
     * @return {Promise<(...args: any[]) => import("./models/text-model").TextModel>}
     */
    async createTextModelFactory() {
      const model = globalConfig.editor === 'simple' ? 'text-model.js' : 'monaco-opt-in.js'
      const { createTextModel } = await import(`./models/${model}`)
      return createTextModel
    },
  }
}
