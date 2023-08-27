import React from 'react'
import { defineFeature } from '../feature'

export const feature = defineFeature({
  loader: async () => React.lazy(() => import('../remote-resources/remote-resources.page')),
  title: 'Remote Resources',
})
