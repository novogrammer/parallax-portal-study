import './style.scss'
import { StudyApp } from './StudyApp.ts'

function main(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('.p-home-canvas')

  if (!canvas) {
    throw new Error('The shared portal canvas was not found.')
  }

  const app = new StudyApp({
    canvas,
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
