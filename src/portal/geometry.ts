import type {
  PortalGeometryResult,
  ProjectionProfile,
  Rect,
  SceneConfiguration,
  ViewportSize,
  WebGlScissorRect,
} from './types.ts'

const PI = Math.PI

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite value greater than 0.`)
  }
}

export function validateProjectionProfile(profile: ProjectionProfile): void {
  if (!Number.isFinite(profile.referenceFovY) || profile.referenceFovY <= 0 || profile.referenceFovY >= PI) {
    throw new RangeError('referenceFovY must be finite and between 0 and PI radians.')
  }
}

export function validateSceneConfiguration(scene: SceneConfiguration): void {
  assertFinitePositive(scene.referenceProjectionHeightMeters, 'referenceProjectionHeightMeters')

  if (!Number.isFinite(scene.cameraTopY) || !Number.isFinite(scene.cameraBottomY)) {
    throw new RangeError('cameraTopY and cameraBottomY must be finite.')
  }

  if (scene.cameraTopY === scene.cameraBottomY) {
    throw new RangeError('cameraTopY and cameraBottomY must not be equal.')
  }
}

export function calculatePortalIntersection(portal: Rect, viewport: ViewportSize): Rect | null {
  assertFinitePositive(viewport.width, 'viewport.width')
  assertFinitePositive(viewport.height, 'viewport.height')

  if (![portal.x, portal.y, portal.width, portal.height].every(Number.isFinite)) {
    throw new RangeError('Portal rect values must be finite.')
  }

  if (portal.width <= 0 || portal.height <= 0) {
    return null
  }

  const left = Math.max(0, portal.x)
  const top = Math.max(0, portal.y)
  const right = Math.min(viewport.width, portal.x + portal.width)
  const bottom = Math.min(viewport.height, portal.y + portal.height)

  if (right <= left || bottom <= top) {
    return null
  }

  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function calculateCenterProgress(viewportHeight: number, portalTop: number, portalHeight: number): number {
  assertFinitePositive(viewportHeight, 'viewportHeight')
  assertFinitePositive(portalHeight, 'portalHeight')

  if (!Number.isFinite(portalTop)) {
    throw new RangeError('portalTop must be finite.')
  }

  return (viewportHeight / 2 - portalTop) / portalHeight
}

export function calculateReferenceCameraDistance(
  profile: ProjectionProfile,
  scene: SceneConfiguration,
): number {
  validateProjectionProfile(profile)
  validateSceneConfiguration(scene)
  return scene.referenceProjectionHeightMeters / (2 * Math.tan(profile.referenceFovY / 2))
}

export function calculateCameraY(scene: SceneConfiguration, centerProgress: number): number {
  validateSceneConfiguration(scene)

  if (!Number.isFinite(centerProgress)) {
    throw new RangeError('centerProgress must be finite.')
  }

  return scene.cameraTopY + (scene.cameraBottomY - scene.cameraTopY) * centerProgress
}

export function calculateRenderCameraFovY(
  profile: ProjectionProfile,
  scene: SceneConfiguration,
  canvasHeight: number,
  portalHeight: number,
): number {
  validateProjectionProfile(profile)
  validateSceneConfiguration(scene)
  assertFinitePositive(canvasHeight, 'canvasHeight')
  assertFinitePositive(portalHeight, 'portalHeight')

  const cameraTravelHeightMeters = Math.abs(scene.cameraTopY - scene.cameraBottomY)
  const fov = 2 * Math.atan(
    Math.tan(profile.referenceFovY / 2)
      * (canvasHeight / portalHeight)
      * (cameraTravelHeightMeters / scene.referenceProjectionHeightMeters),
  )

  if (!Number.isFinite(fov) || fov <= 0 || fov >= PI) {
    throw new RangeError('Derived renderCameraFovY must be finite and between 0 and PI radians.')
  }

  return fov
}

export function calculateWebGlScissor(intersection: Rect, viewportHeight: number): WebGlScissorRect {
  assertFinitePositive(viewportHeight, 'viewportHeight')

  const left = Math.floor(intersection.x)
  const right = Math.ceil(intersection.x + intersection.width)
  const bottom = Math.floor(viewportHeight - (intersection.y + intersection.height))
  const top = Math.ceil(viewportHeight - intersection.y)

  return {
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
  }
}

export function calculatePortalGeometry(
  portal: Rect,
  viewport: ViewportSize,
  profile: ProjectionProfile,
  scene: SceneConfiguration,
): PortalGeometryResult | null {
  const intersection = calculatePortalIntersection(portal, viewport)

  if (!intersection) {
    return null
  }

  const centerProgress = calculateCenterProgress(viewport.height, portal.y, portal.height)
  const referenceCameraDistance = calculateReferenceCameraDistance(profile, scene)
  const cameraY = calculateCameraY(scene, centerProgress)
  const renderCameraFovY = calculateRenderCameraFovY(profile, scene, viewport.height, portal.height)

  const derivedValues = [
    referenceCameraDistance,
    cameraY,
    renderCameraFovY,
  ]

  if (!derivedValues.every(Number.isFinite)) {
    throw new RangeError('Portal geometry produced a non-finite value.')
  }

  return {
    intersection,
    centerProgress,
    referenceCameraDistance,
    cameraY,
    renderCameraFovY,
  }
}
