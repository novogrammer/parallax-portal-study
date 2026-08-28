import type { Rect, SceneConfiguration } from 'parallax-portal'

export interface DomPlaneLayoutInput {
  portalRect: Rect
  elementRect: Rect
  viewportWidth: number
  z: number
  cameraDistance: number
  sceneConfiguration: SceneConfiguration
}

export interface DomPlaneLayout {
  position: {
    x: number
    y: number
    z: number
  }
  size: {
    width: number
    height: number
  }
  depthScale: number
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`)
  }
}

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite value greater than 0.`)
  }
}

function validateRect(rect: Rect, name: string): void {
  assertFinite(rect.x, `${name}.x`)
  assertFinite(rect.y, `${name}.y`)
  assertFinitePositive(rect.width, `${name}.width`)
  assertFinitePositive(rect.height, `${name}.height`)
}

export function parseDomPlaneZ(value: string | null): number {
  if (value === null || value.trim() === '') {
    throw new RangeError('data-z must be present and contain a finite number.')
  }

  const z = Number(value)
  assertFinite(z, 'data-z')
  return z
}

export function calculateDomPlaneLayout(input: DomPlaneLayoutInput): DomPlaneLayout {
  validateRect(input.portalRect, 'portalRect')
  validateRect(input.elementRect, 'elementRect')
  assertFinitePositive(input.viewportWidth, 'viewportWidth')
  assertFinite(input.z, 'z')
  assertFinitePositive(input.cameraDistance, 'cameraDistance')

  const cameraTravel = input.sceneConfiguration.cameraTopY
    - input.sceneConfiguration.cameraBottomY

  assertFinitePositive(cameraTravel, 'cameraTopY - cameraBottomY')

  const depthScale = (input.cameraDistance - input.z) / input.cameraDistance
  assertFinitePositive(depthScale, 'depthScale')

  const metersPerCssPixel = cameraTravel / input.portalRect.height
  const elementCenterX = input.elementRect.x + input.elementRect.width / 2
  const elementCenterY = input.elementRect.y + input.elementRect.height / 2
  const localCenterY = elementCenterY - input.portalRect.y
  const baseX = (elementCenterX - input.viewportWidth / 2) * metersPerCssPixel
  const baseY = input.sceneConfiguration.cameraTopY
    - localCenterY * metersPerCssPixel
  const anchorY = (
    input.sceneConfiguration.cameraTopY
    + input.sceneConfiguration.cameraBottomY
  ) / 2

  return {
    position: {
      x: baseX * depthScale,
      y: anchorY + (baseY - anchorY) * depthScale,
      z: input.z,
    },
    size: {
      width: input.elementRect.width * metersPerCssPixel * depthScale,
      height: input.elementRect.height * metersPerCssPixel * depthScale,
    },
    depthScale,
  }
}
