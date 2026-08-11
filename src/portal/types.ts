export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ViewportSize {
  width: number
  height: number
}

export interface ProjectionProfile {
  profileId: string
  referenceFovY: number
  referenceProjectionHeightMeters: number
  cameraTopY: number
  cameraBottomY: number
}

export type Vector3Tuple = readonly [x: number, y: number, z: number]

export interface SceneVariant {
  sceneVariantId: string
  position: Vector3Tuple
  rotation: Vector3Tuple
  scale: Vector3Tuple
}

export interface PortalVariant {
  projectionProfileId: string
  sceneVariantId: string
}

export interface ResponsiveRule {
  query: string
  variant: PortalVariant
}

export interface PortalConfiguration {
  portalId: string
  sceneId: string
  responsiveVariants: {
    rules: readonly ResponsiveRule[]
    otherwise: PortalVariant
  }
}

export interface WebGlScissorRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PortalGeometryResult {
  intersection: Rect
  centerProgress: number
  referenceCameraDistance: number
  cameraY: number
  renderCameraFovY: number
}
