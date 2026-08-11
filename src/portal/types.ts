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

export interface ResponsiveVariant {
  projectionProfileId: string
}

export interface ResponsiveRule {
  query: string
  variant: ResponsiveVariant
}

export interface PortalConfiguration {
  portalId: string
  sceneId: string
  responsiveVariants: {
    rules: readonly ResponsiveRule[]
    otherwise: ResponsiveVariant
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
