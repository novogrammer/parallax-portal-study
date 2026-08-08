import type {
  PortalGeometryResult,
  ProjectionProfile,
  Rect,
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
  assertFinitePositive(profile.referenceProjectionHeightMeters, 'referenceProjectionHeightMeters')

  if (!Number.isFinite(profile.referenceFovY) || profile.referenceFovY <= 0 || profile.referenceFovY >= PI) {
    throw new RangeError('referenceFovY must be finite and between 0 and PI radians.')
  }

  if (!Number.isFinite(profile.cameraTopY) || !Number.isFinite(profile.cameraBottomY)) {
    throw new RangeError('cameraTopY and cameraBottomY must be finite.')
  }

  if (profile.cameraTopY === profile.cameraBottomY) {
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

export function calculateReferenceCameraDistance(profile: ProjectionProfile): number {
  validateProjectionProfile(profile)
  return profile.referenceProjectionHeightMeters / (2 * Math.tan(profile.referenceFovY / 2))
}

export function calculateCameraY(profile: ProjectionProfile, centerProgress: number): number {
  validateProjectionProfile(profile)

  if (!Number.isFinite(centerProgress)) {
    throw new RangeError('centerProgress must be finite.')
  }

  return profile.cameraTopY + (profile.cameraBottomY - profile.cameraTopY) * centerProgress
}

export function calculateRenderCameraFovY(
  profile: ProjectionProfile,
  canvasHeight: number,
  portalHeight: number,
): number {
  validateProjectionProfile(profile)
  assertFinitePositive(canvasHeight, 'canvasHeight')
  assertFinitePositive(portalHeight, 'portalHeight')

  const cameraTravelHeightMeters = Math.abs(profile.cameraTopY - profile.cameraBottomY)
  const fov = 2 * Math.atan(
    Math.tan(profile.referenceFovY / 2)
      * (canvasHeight / portalHeight)
      * (cameraTravelHeightMeters / profile.referenceProjectionHeightMeters),
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
): PortalGeometryResult | null {
  const intersection = calculatePortalIntersection(portal, viewport)

  if (!intersection) {
    return null
  }

  const centerProgress = calculateCenterProgress(viewport.height, portal.y, portal.height)
  const referenceCameraDistance = calculateReferenceCameraDistance(profile)
  const cameraY = calculateCameraY(profile, centerProgress)
  const renderCameraFovY = calculateRenderCameraFovY(profile, viewport.height, portal.height)
  const canvasAspect = viewport.width / viewport.height
  const renderCameraFovX = 2 * Math.atan(Math.tan(renderCameraFovY / 2) * canvasAspect)
  const canvasVisibleHeightMeters = 2 * referenceCameraDistance * Math.tan(renderCameraFovY / 2)
  const canvasVisibleWidthMeters = canvasVisibleHeightMeters * canvasAspect
  const metersPerCssPixel = canvasVisibleHeightMeters / viewport.height
  const portalVisibleWidthMeters = portal.width * metersPerCssPixel

  const derivedValues = [
    referenceCameraDistance,
    cameraY,
    renderCameraFovY,
    renderCameraFovX,
    canvasVisibleHeightMeters,
    canvasVisibleWidthMeters,
    metersPerCssPixel,
    portalVisibleWidthMeters,
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
    renderCameraFovX,
    canvasVisibleHeightMeters,
    canvasVisibleWidthMeters,
    metersPerCssPixel,
    portalVisibleWidthMeters,
  }
}
