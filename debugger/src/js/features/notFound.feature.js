import { defineFeature } from '../feature'
import React from 'react'

export const feature = defineFeature({
  loader: async () => React.lazy(() => import('../notFound.page')),
  title: 'Not Found',
})
