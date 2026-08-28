import * as THREE from 'three/webgpu'
import {
  calculateReferenceCameraDistance,
  selectResponsiveProjection,
} from 'parallax-portal'
import type {
  ProjectionConfiguration,
  Rect,
  SceneConfiguration,
} from 'parallax-portal'
import {
  calculateDomPlaneLayout,
  parseDomPlaneZ,
} from './domPlaneLayout.ts'

const SOURCE_SELECTOR = '[data-plane-source]'
const PROJECTED_ATTRIBUTE = 'data-projected'

export interface StudySceneBundle {
  scene: THREE.Scene
  clearColor: THREE.ColorRepresentation
  ready: Promise<void>
  updateLayout: () => void
  dispose: () => void
}

export interface DomPlaneStudySceneOptions {
  portalElement: HTMLElement
  clearColor: THREE.ColorRepresentation
  projectionConfiguration: ProjectionConfiguration
  referenceProjectionHeightMeters: number
  sceneConfiguration: SceneConfiguration
  textureCache: DomPlaneTextureCache
}

interface DomPlaneSource {
  image: HTMLImageElement
  z: number
}

interface DomPlaneMesh extends DomPlaneSource {
  material: THREE.MeshBasicMaterial
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
}

export class DomPlaneTextureCache {
  private readonly textures = new Map<string, THREE.Texture>()
  private isDisposed = false

  get = (image: HTMLImageElement): THREE.Texture => {
    if (this.isDisposed) {
      throw new Error('Layered Composition texture cache has been disposed.')
    }

    const sourceUrl = image.currentSrc || image.src

    if (!sourceUrl) {
      throw new Error('Layered Composition image source URL is empty.')
    }

    const existingTexture = this.textures.get(sourceUrl)

    if (existingTexture) {
      return existingTexture
    }

    const texture = new THREE.Texture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    this.textures.set(sourceUrl, texture)
    return texture
  }

  dispose = (): void => {
    if (this.isDisposed) {
      return
    }

    this.isDisposed = true
    this.textures.forEach((texture) => texture.dispose())
    this.textures.clear()
  }
}

function toRect(domRect: DOMRect): Rect {
  return {
    x: domRect.left,
    y: domRect.top,
    width: domRect.width,
    height: domRect.height,
  }
}

function requireSourceElement(portalElement: HTMLElement): HTMLElement {
  const sourceElement = portalElement.querySelector<HTMLElement>(SOURCE_SELECTOR)

  if (!sourceElement) {
    throw new Error(`Layered Composition source "${SOURCE_SELECTOR}" was not found.`)
  }

  return sourceElement
}

function listDomPlaneSources(sourceElement: HTMLElement): DomPlaneSource[] {
  const images = Array.from(sourceElement.querySelectorAll<HTMLImageElement>('img[data-z]'))

  if (images.length === 0) {
    throw new Error('Layered Composition requires at least one image with data-z.')
  }

  return images.map((image) => ({
    image,
    z: parseDomPlaneZ(image.getAttribute('data-z')),
  }))
}

class DomPlaneStudyScene implements StudySceneBundle {
  readonly scene = new THREE.Scene()
  readonly clearColor: THREE.ColorRepresentation
  readonly ready: Promise<void>

  private readonly options: DomPlaneStudySceneOptions
  private readonly sourceElement: HTMLElement
  private readonly sources: DomPlaneSource[]
  private readonly geometry = new THREE.PlaneGeometry(1, 1)
  private meshes: DomPlaneMesh[] = []
  private hasValidLayout = false
  private hasLayoutError = false
  private isDisposed = false

  constructor(options: DomPlaneStudySceneOptions) {
    this.options = options
    this.clearColor = options.clearColor
    this.sourceElement = requireSourceElement(options.portalElement)
    this.sources = listDomPlaneSources(this.sourceElement)
    this.ready = this.initialize()
  }

  updateLayout = (): void => {
    if (this.isDisposed || this.meshes.length === 0) {
      return
    }

    try {
      const portalRect = toRect(this.options.portalElement.getBoundingClientRect())
      const viewportWidth = window.innerWidth
      const rules = this.options.projectionConfiguration.rules ?? []
      const projection = selectResponsiveProjection(
        this.options.projectionConfiguration,
        rules.map(({ query }) => window.matchMedia(query).matches),
      )
      const cameraDistance = calculateReferenceCameraDistance(
        projection,
        this.options.referenceProjectionHeightMeters,
      )
      const layouts = this.meshes.map(({ image, z }) => calculateDomPlaneLayout({
        portalRect,
        elementRect: toRect(image.getBoundingClientRect()),
        viewportWidth,
        z,
        cameraDistance,
        sceneConfiguration: this.options.sceneConfiguration,
      }))

      layouts.forEach((layout, index) => {
        const mesh = this.meshes[index]?.mesh

        if (!mesh) {
          throw new Error('Layered Composition mesh state is inconsistent.')
        }

        mesh.position.set(layout.position.x, layout.position.y, layout.position.z)
        mesh.scale.set(layout.size.width, layout.size.height, 1)
      })

      this.hasValidLayout = true
      this.hasLayoutError = false
    } catch (error) {
      if (!this.hasValidLayout) {
        throw error
      }

      if (!this.hasLayoutError) {
        console.error('Layered Composition could not update its DOM plane layout.', error)
      }

      this.hasLayoutError = true
    }
  }

  dispose = (): void => {
    if (this.isDisposed) {
      return
    }

    this.isDisposed = true
    this.sourceElement.removeAttribute(PROJECTED_ATTRIBUTE)
    this.releaseResources()
  }

  private async initialize(): Promise<void> {
    try {
      await Promise.all(this.sources.map(({ image }) => image.decode()))

      if (this.isDisposed) {
        return
      }

      this.meshes = this.sources.map((source) => {
        const texture = this.options.textureCache.get(source.image)

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
        })
        const mesh = new THREE.Mesh(this.geometry, material)
        mesh.name = `dom-plane:${source.image.className}`
        this.scene.add(mesh)

        return { ...source, material, mesh }
      })

      this.updateLayout()
      this.sourceElement.setAttribute(PROJECTED_ATTRIBUTE, '')
    } catch (error) {
      this.releaseResources()
      throw error
    }
  }

  private releaseResources(): void {
    this.scene.clear()
    this.meshes.forEach(({ material }) => {
      material.dispose()
    })
    this.meshes = []
    this.geometry.dispose()
  }
}

export function createDomPlaneStudyScene(
  options: DomPlaneStudySceneOptions,
): StudySceneBundle {
  return new DomPlaneStudyScene(options)
}
