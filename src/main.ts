import './style.scss'
import { ParallaxPortalApp } from './portal/index.ts'
import {
  portalConfigurations,
  projectionProfiles,
  referenceProjectionHeightMeters,
  sceneConfigurations,
} from './portal/config.ts'

function main(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('.p-home-canvas')

  if (!canvas) {
    throw new Error('The shared portal canvas was not found.')
  }

  const app = new ParallaxPortalApp({
    canvas,
    configurations: portalConfigurations,
    profiles: projectionProfiles,
    referenceProjectionHeightMeters,
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
