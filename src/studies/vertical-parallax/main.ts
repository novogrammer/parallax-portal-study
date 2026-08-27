import './style.scss'
import { StudyApp } from './StudyApp.ts'

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('.p-home-canvas')

  if (!canvas) {
    throw new Error('The shared portal canvas was not found.')
  }

  const app = new StudyApp({
    canvas,
    forceWebGL: new URLSearchParams(window.location.search).get('forceWebGL') === '1',
  })

  app.initialize()
  await app.start()
}

main().catch((error: unknown) => {
  document.documentElement.classList.add('portal-unavailable')
  console.error(error)
})
