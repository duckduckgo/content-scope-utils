import React from 'react'
import { defineFeature } from '../feature'

export const feature = defineFeature({
  loader: async () => React.lazy(() => import('../components/user-scripts')),
  title: 'User Scripts',
  order: 2,
})
