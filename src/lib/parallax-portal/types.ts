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
  referenceFovY: number
}

export interface SceneConfiguration {
  cameraTopY: number
  cameraBottomY: number
}

export interface ResponsiveProjectionRule extends ProjectionProfile {
  query: string
}

export interface ProjectionConfiguration extends ProjectionProfile {
  rules?: readonly ResponsiveProjectionRule[]
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
