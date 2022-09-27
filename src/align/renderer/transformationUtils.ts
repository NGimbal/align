import { v3 } from 'twgl.js'

export const sceneToDevice = (
  pt: v3.Vec3,
  dPt: v3.Vec3,
  scale: number,
  resolution: { x: number, y: number },
  dst?: v3.Vec3
) => {
  const f = (scale / dPt[2]) * resolution.y
  const factor = v3.create(f, f, 1)

  return v3.multiply(pt, factor, dst ?? v3.create())
}

export const deviceToScene = (
  pt: v3.Vec3,
  dPt: v3.Vec3,
  scale: number,
  resolution: { x: number, y: number },
  dst: v3.Vec3
) => {
  const f = dPt[2] / scale
  const t = 1 / resolution.y

  const scene = v3.mulScalar(pt, t, dst ?? v3.create())
  v3.subtract(scene, dPt, scene)
  v3.mulScalar(scene, f, scene)
  return scene
}

export const sceneToDeviceScalar = (
  size: number,
  zoom: number,
  scale: number,
  resolution: { x: number, y: number }
) => {
  const factor = (scale / zoom) * resolution.y
  return size * factor
}

export const deviceToSceneScalar = (
  size: number,
  zoom: number,
  scale: number,
  resolution: { x: number, y: number }
) => {
  const factor = zoom / (resolution.y * scale)
  return size * factor
}

// this is used to set dPt[0] & dPt[1] to specific values in scene space
export const dispToValue = (value: number, scale: number, zoom: number) => {
  return -1 * ((value * scale) / zoom)
}

export const lerpScalar = (min: number, max: number, t: number) => {
  return (1 - t) * min + t * max
}