import { nodeResolve } from '@rollup/plugin-node-resolve'

export default [
  {
    input: 'src/messaging-consumer.js',
    output: [
      {
        file: 'dist/messaging-consumer.dist.js',
        format: 'iife',
      },
    ],
    plugins: [nodeResolve()],
  },
]
