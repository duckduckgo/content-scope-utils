import { appMachine } from '../app.machine'
import { createActorContext } from '@xstate/react'
import { Suspense } from 'react'
import * as z from 'zod'
import styles from './app.module.css'
import { FeatureNav } from './feature-nav'

export const AppMachineContext = createActorContext(appMachine, { devTools: true })

export function App() {
  const [state] = AppMachineContext.useActor()

  if (state.matches('showing error')) {
    return (
      <div className="initial-loader">
        <pre>
          <code>{state.context.error}</code>
        </pre>
      </div>
    )
  }
  if (!state.matches(['routes ready'])) {
    return (
      <div className="initial-loader">
        <p>Collecting Debug Data...</p>
      </div>
    )
  }

  return <AppShell />
}

function AppShell() {
  // Read full snapshot and get `send` function from `useActor()`
  const { feature, links } = AppMachineContext.useSelector((state) => {
    const parsed = z
      .object({
        feature: z.object({
          title: z.string(),
          page: z.any(),
          pathname: z.string(),
        }),
        search: z.instanceof(URLSearchParams),
        preModules: z.array(
          z.object({
            pathname: z.string(),
            title: z.string(),
          }),
        ),
      })
      .parse(state.context)

    const links = []

    for (const preModule of parsed.preModules) {
      links.push({
        name: preModule.title,
        active: preModule.pathname === parsed.feature.pathname,
        url: preModule.pathname,
      })
    }

    return {
      feature: parsed.feature,
      links,
      preModules: parsed.preModules,
    }
  })

  return (
    <div data-loaded="true" className={styles.appShell}>
      <header className={styles.appHeader}>
        <FeatureNav links={links} />
      </header>
      <Suspense fallback={null}>
        <feature.page />
      </Suspense>
    </div>
  )
}
