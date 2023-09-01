import React from 'react'
import { defineFeature } from '../feature'

const page = React.lazy(() => import('../components/user-scripts'))

export const feature = defineFeature({
  loader: async () => page,
  title: 'User Scripts',
  order: 2,
})
