// @ts-ignore
import * as ACT from './store/actions.js'

// @ts-ignore
import { state, dispatch } from '../draw'
// @ts-ignore
import * as PRIM from './primitives'
import DxfParser from 'dxf-parser'

export function serializeScene() {
  if (!document) return

  return (
    JSON.stringify(
      Object.assign({},
        state.scene
      )
    )
  )
}

// TODO:
// 1. load things in view first
// 2. then by size of primitive
const loadAll = async (scene: any[], onProgressCallback?: (progress: number, total: number) => void) => {

  // TODO: fix stride thing
  const stride = 1

  const callback = (progress: number, total: number) => {
    if (!onProgressCallback) return undefined
    return () => onProgressCallback(progress, total)
  }

  for (let i = 0; i < scene.length; i += stride) {
    requestAnimationFrame(
      () => loadItems(scene.slice(i, i + stride), callback(i + 1, scene.length))
    )
  }

  // for (let i = 0; i < scene.length; i += stride) {
  //   const items = scene.slice(i, i + stride)
  //   setTimeout(
  //     () => loadItems(items, callback(i + 1, scene.length))
  //     , 100)
  // }
}

const loadItems = (items: any[], onProgressCallback?: () => void) => {
  const prims = items.reduce((p, item, i, a) => {

    if (item === 'undefined') return p

    const id = PRIM.uuid()

    // this is necessary to re-alias p.v3 variables
    const points = item.pts.map((p: any) => {
      // TODO: PRIM.uuid() is in place of p.pId.slice(), dealing with divergent schemas already I think >.<
      return new PRIM.vec(p.v3[0], p.v3[1], p.v3[2], 0, id, PRIM.uuid())
    })

    const type = item.type.slice()
    const prim = new PRIM.prim(type, points, { ...item.properties }, id, item.translate)
    p.push(prim)

    return p
  }, [])

  if (prims.length > 0) {
    dispatch(ACT.scenePushMany(prims))
  }

  onProgressCallback && onProgressCallback()
}


export function loadScene(data: any & { editItems: any[] }, onProgressCallback?: (progress: number, total: number) => void) {
  if (!document) return

  loadAll(data.editItems, onProgressCallback)
}

export function loadDXF(data: string, onProgressCallback?: (progress: number, total: number) => void) {
  if (!document || typeof data !== 'string') return

  const parser = new DxfParser()

  const dxfJson = parser.parseSync(data)

  // @ts-ignore
  const scene = dxfJson?.entities.reduce((p, { type, vertices }, index) => {
    switch (type) {
      case 'LINE':
      case 'POLYLINE':
        p.push(new PRIM.prim('polyline', 
          vertices.map((v: any) =>
            // TODO: parameterize scale factor
            new PRIM.vec(v.x / 32, 0.0 - v.y / 32, v.z / 32)
          )))
        return p
      default:
        // console.log(type)
        return p
    }
  }, [])  

  if (!scene) return

  loadAll(scene, onProgressCallback)
}
