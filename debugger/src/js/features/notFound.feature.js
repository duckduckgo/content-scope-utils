import { defineFeature } from '../feature'
import React from 'react'

const page = React.lazy(() => import('../notFound.page'))

export const feature = defineFeature({
  loader: async () => page,
  title: 'Not Found',
  order: -1,
})
