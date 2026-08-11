import './style.scss'
import { ParallaxPortalApp } from './portal/ParallaxPortalApp.ts'
import { portalConfigurations, projectionProfiles, sceneConfigurations } from './portal/config.ts'

function main(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('.p-home-canvas')

  if (!canvas) {
    throw new Error('The shared portal canvas was not found.')
  }

  const app = new ParallaxPortalApp({
    canvas,
    configurations: portalConfigurations,
    profiles: projectionProfiles,
    sceneConfigurations,
  })

  app.initialize()
  app.start()
}

try {
  main()
} catch (error: unknown) {
  document.documentElement.classList.add('portal-unavailable')
  console.error(error)
}
