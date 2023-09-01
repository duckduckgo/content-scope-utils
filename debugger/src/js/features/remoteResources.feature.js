import React from 'react'
import { defineFeature } from '../feature'

const page = React.lazy(() => import('../remote-resources/remote-resources.page'))

export const feature = defineFeature({
  loader: async () => page,
  title: 'Remote Resources',
  order: 1,
})
