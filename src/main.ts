import './style.scss'
import { ParallaxPortalApp } from './portal/ParallaxPortalApp.ts'
import { portalConfigurations, projectionProfiles, sceneVariants } from './portal/config.ts'

async function mainAsync(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('.p-home-canvas')

  if (!canvas) {
    throw new Error('The shared portal canvas was not found.')
  }

  const app = new ParallaxPortalApp({
    canvas,
    configurations: portalConfigurations,
    profiles: projectionProfiles,
    sceneVariants,
  })

  await app.initialize()
  app.start()
}

mainAsync().catch((error: unknown) => {
  document.documentElement.classList.add('portal-unavailable')
  console.error(error)
})
