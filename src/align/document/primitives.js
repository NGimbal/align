//primitives.js
'use strict'

import { gl } from '../draw.js'
import { getFloat16, setFloat16 } from '@petamoriken/float16/browser/float16'

import * as chroma from 'chroma-js'
import * as twgl from 'twgl.js'

// https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
export function uuid() {
  if (typeof window === 'undefined') return ''
  var d = new Date().getTime()//Timestamp
  var d2 = (performance && performance.now && (performance.now() * 1000)) || 0//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16//random number between 0 and 16
    if (d > 0) {//Use timestamp until depleted
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else {//Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

//assume little endian
// https://abdulapopoola.com/2019/01/20/check-endianness-with-javascript/
const ENDD = false

// TODO: tranistion to glmatrix https://glmatrix.net/
// simple point, color vector w/ id
// ideally this would be a thin wrapper around twgl v3
export class vec {
  constructor(x, y, z, w, pId, id) {
    this.v3 = twgl.v3.create(x, y, 0.0)

    // TODO: maybe someday factor this shit out
    // it's also convenient but feels a little unclean
    // the reason to use this method, is to keep the vec light
    // when serializing to JSON
    sync(this, 'x', this.v3, 0)
    sync(this, 'y', this.v3, 1)
    sync(this, 'z', this.v3, 2)
    // TODO: this w thing is unused I believe, but I'm afraid to delete it
    // the reason to have it is because we have 4 channels for rgba all of which could be useful
    sync(this, 'w', this.v3, 2)

    sync(this, 'minX', this.v3, 0, true)
    sync(this, 'maxX', this.v3, 0, true)
    sync(this, 'minY', this.v3, 1, true)
    sync(this, 'maxY', this.v3, 1, true)

    //parentId
    this.pId = pId || ''

    this.id = id || uuid()
  }
}

export function cloneVec(v) {
  const w = typeof v.w !== 'undefined' ? v.w : 0.0
  return new vec(v.v3[0], v.v3[1], v.v3[2], w, v.pId, v.id)
}

export function vecSet(vec, x, y, z, w) {
  vec.x = x || vec.x
  vec.y = y || vec.y
  vec.z = z || vec.z
  vec.w = w || vec.w

  vec.v3 = twgl.v3.create(vec.x, vec.y, vec.z)

  return vec
}

export function lengthVec(_vec) {
  return Math.sqrt(_vec.x * _vec.x + _vec.y * _vec.y)
}

export function normVec(_vec) {
  let vec = cloneVec(_vec)
  let l = lengthVec(vec)
  vec.x = vec.x / l
  vec.y = vec.y / l
  return vec
}

export function dotVec(a, b) {
  let x = a.x * b.x
  let y = a.y * b.y
  return x + y
}

export function angleVec(_vec) {
  return (Math.atan2(- _vec.y, - _vec.x) + Math.PI)
}

export function distVec(a, b) {
  let dx = a.x - b.x
  let dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function addVec(a, b) {
  // this is to handle adding vec and twgl v3
  let x, y
  if (b.x) {
    // return new vec(a.x + b.x, a.y + b.y);
    x = a.x + b.x
    y = a.y + b.y
  } else {
    // return new vec(a.x + b[0], a.y + b[1]);
    x = a.x + b[0]
    y = a.y + b[1]
  }
  return {
    ...a,
    x: x,
    y: y,
    minX: x,
    maxX: x,
    minY: y,
    maxY: y,
    v3: twgl.v3.create(x, y, 0.0)
  }
}

export function subVec(a, b) {
  let bInv = vecSet(b, b.x * -1, b.y * -1)
  return addVec(a, bInv)
}

export class bbox {
  // BBox supports both prims and glyphs
  constructor(prim, _padding) {
    let points = prim.pts ? [...prim.pts] : [...prim.uniforms.u_eTex.pts]
    let type = prim.type ? prim.type : prim.primType
    let padding = _padding ? _padding : 0.05
    let translate = prim.translate || twgl.v3.create(0, 0, 0)

    if (!prim.id) {
      throw new Error('Bounding box created with no object Id')
    }
    else {
      this.id = prim.id.slice()
    }

    switch (type) {
      case ('polyline'):
        points.sort((a, b) => (a.x < b.x) ? -1 : 1)
        this.minX = points[0].x - padding + translate[0]
        this.maxX = points[points.length - 1].x + padding + translate[0]

        points.sort((a, b) => (a.y < b.y) ? -1 : 1)
        this.minY = points[0].y - padding + translate[1]
        this.maxY = points[points.length - 1].y + padding + translate[1]

        break
      // TODD: add translate to bbox for other prims
      case ('polygon'):
        points.sort((a, b) => (a.x < b.x) ? -1 : 1)
        this.minX = points[0].x - padding + translate[0]
        this.maxX = points[points.length - 1].x + padding + translate[0]

        points.sort((a, b) => (a.y < b.y) ? -1 : 1)
        this.minY = points[0].y - padding + translate[1]
        this.maxY = points[points.length - 1].y + padding + translate[1]

        break
      case ('circle'):
        let radius = distVec(points[0], points[1])
        this.minX = points[0].x - radius - padding + translate[0]
        this.maxX = points[0].x + radius + padding + translate[0]
        this.minY = points[0].y - radius - padding + translate[1]
        this.maxY = points[0].y + radius + padding + translate[1]
        break
      case ('ellipse'):
        let dims = absV3(twgl.v3.subtract(points[0].v3, points[1].v3))
        this.minX = points[0].x - dims[0] - padding + translate[0]
        this.maxX = points[0].x + dims[0] + padding + translate[0]
        this.minY = points[0].y - dims[1] - padding + translate[1]
        this.maxY = points[0].y + dims[1] + padding + translate[1]
        break
      case ('rectangle'):
        this.minX = Math.min(points[0].x, points[1].x) - padding + translate[0]
        this.maxX = Math.max(points[0].x, points[1].x) + padding + translate[0]
        this.minY = Math.min(points[0].y, points[1].y) - padding + translate[1]
        this.maxY = Math.max(points[0].y, points[1].y) + padding + translate[1]
        break
      case ('img'):
        this.minX = points[0].x + translate[0]
        this.minY = points[0].y + translate[0]
        this.maxX = points[1].x + translate[1]
        this.maxY = points[1].y + translate[1]
        break
      default:
        this.minX = points[0].x + translate[0]
        this.minY = points[0].y + translate[0]
        this.maxX = points[1].x + translate[1]
        this.maxY = points[1].y + translate[1]
        break
    }

    // why are min / max useful here?
    this.min = new vec(this.minX, this.minY)
    this.max = new vec(this.maxX, this.maxY)

    this.width = this.maxX - this.minX
    this.height = this.maxY - this.minY

  }
}

export const propsDefault = {
  type: '',
  filter: '',
  stroke: '#1d2b53',
  fill: '#FBD045',
  weight: 0.0002,
  radius: 0.001,
  opacity: 1.0,
  sel: 0.0,  //deselected by default when it's "baked"
  visible: true,
}

export class prim {
  constructor(type, pts, _props, id, _translate, _imgSrc) {

    this.type = type

    //list of points
    this.pts = pts || []
    this.properties = _props || { ...propsDefault }

    this.id = id || uuid()

    let idCol = chroma.random()
    this.idCol = twgl.v3.create(idCol.gl()[0], idCol.gl()[1], idCol.gl()[2])
    this.idColHex = idCol.hex()

    this.translate = _translate ? twgl.v3.create(_translate[0], _translate[1], _translate[2]) : twgl.v3.create()

    this.metaData = {
      name: '',
      index: '',
      csi: '',
      uniformat: '',
    }

    // This is for image primitives
    this.imgSrc = _imgSrc || undefined
  }
}
// TODO: create a bulk addPoints function to optimize the loading process
//PolyPoint is an array of points, a texture representation and properties
//Another class e.g. PolyLine extends PolyPoint to manipulate and bake
export class PolyPoint {

  // creates empty PolyPoint object
  constructor(_dataSize) {
    // this.properties = properties;
    this.dataSize = _dataSize || 16

    // list of points
    this.pts = []

    // cTexel is incremented at beginning of AddPoint
    // that way after adding a point reading cTexel gives current texel referemce
    this.cTexel = -1.0

    this.data = new Uint16Array(4 * this.dataSize * this.dataSize)

    this.texture = twgl.createTexture(gl, {
      unpackAlignnment: 4,
      minMag: gl.NEAREST,
      src: this.data,
      width: this.dataSize,
      height: this.dataSize,
      wrap: gl.CLAMP_TO_EDGE,
      internalFormat: gl.RGBA16F,
      format: gl.RGBA,
      type: gl.HALF_FLOAT,
    })

    this.id = uuid()
  }

  // adds point to polyPoint
  // point x, y, z, w are stored as HalfFloat16
  // https://github.com/petamoriken/float16
  // _texel is optional param for setting point at a particular index
  addPoint(_pt, pId, _texel) {
    let x = _pt ? _pt.x : 0.0
    let y = _pt ? _pt.y : 0.0
    let z = _pt && _pt.z ? _pt.z : 0.0
    let w = _pt && _pt.z ? _pt.w : 0.0

    let pt = new vec(x, y, z, w, pId)

    let index = 0

    if (typeof _texel !== 'undefined') {
      index = _texel * 4
      this.cTexel = Math.max(this.cTexel, _texel)
      this.pts[_texel] = pt
    } else {
      this.cTexel++
      index = this.cTexel * 4
      this.pts.push(pt)
    }

    // use view.setFloat16() to set the digits in the DataView
    // then use view.getUint16 to retrieve and write to data Texture
    let buffer = new ArrayBuffer(64)
    let view = new DataView(buffer)

    view.getFloat16 = (...args) => getFloat16(view, ...args)
    view.setFloat16 = (...args) => setFloat16(view, ...args)

    view.setFloat16(0, x, ENDD)
    view.setFloat16(16, y, ENDD)
    view.setFloat16(32, z, ENDD)
    view.setFloat16(48, w, ENDD)

    this.data[index] = view.getUint16(0, ENDD)
    this.data[index + 1] = view.getUint16(16, ENDD)
    this.data[index + 2] = view.getUint16(32, ENDD)
    this.data[index + 3] = view.getUint16(48, ENDD)

    // TODO: this is the only place the gl context is used,
    // should be an arg to the addPoint function, 
    // all other uses are constants that should be imported independently
    // more for clarity than anything else
    twgl.setTextureFromArray(gl, this.texture, this.data, {
      internalFormat: gl.RGBA16F,
      format: gl.RGBA,
      type: gl.HALF_FLOAT,
    })

    return pt
  }

  addPoints(pts) {
    if (!pts || !pts.length) return

    const size = Math.ceil(Math.sqrt(pts.length))
    const data = new Uint16Array(4 * size * size)

    this.dataSize = size

    // use view.setFloat16() to set the digits in the DataView
    // then use view.getUint16 to retrieve and write to data Texture
    let buffer = new ArrayBuffer(64 * pts.length)
    let view = new DataView(buffer)

    view.getFloat16 = (...args) => getFloat16(view, ...args)
    view.setFloat16 = (...args) => setFloat16(view, ...args)

    for (let i = 0; i < pts.length; i++) {
      const { x, y, z, w } = pts[i]
      view.setFloat16(i * 64 + 0, x, ENDD)
      view.setFloat16(i * 64 + 16, y, ENDD)
      view.setFloat16(i * 64 + 32, z, ENDD)
      view.setFloat16(i * 64 + 48, w, ENDD)

      data[i + i * 3] = view.getUint16(i * 64 + 0, ENDD)
      data[i + i * 3 + 1] = view.getUint16(i * 64 + 16, ENDD)
      data[i + i * 3 + 2] = view.getUint16(i * 64 + 32, ENDD)
      data[i + i * 3 + 3] = view.getUint16(i * 64 + 48, ENDD)
    }

    this.data = data

    twgl.setTextureFromArray(gl, this.texture, this.data, {
      internalFormat: gl.RGBA16F,
      format: gl.RGBA,
      type: gl.HALF_FLOAT,
    })
  }

  popPoint() {
    const index = this.cTexel * 4

    // use view.setFloat16() to set the digits in the DataView
    // then use view.getUint16 to retrieve and write to data Texture
    const buffer = new ArrayBuffer(64)
    const view = new DataView(buffer)

    view.getFloat16 = (...args) => getFloat16(view, ...args)
    view.setFloat16 = (...args) => setFloat16(view, ...args)

    view.setFloat16(0, 0, ENDD)
    view.setFloat16(16, 0, ENDD)
    view.setFloat16(32, 0, ENDD)
    view.setFloat16(48, 0, ENDD)

    this.data[index] = view.getUint16(0, ENDD)
    this.data[index + 1] = view.getUint16(16, ENDD)
    this.data[index + 2] = view.getUint16(32, ENDD)
    this.data[index + 3] = view.getUint16(48, ENDD)

    // TODO: this is the only place the gl context is used, 
    // maybe there's a way to batch these changes...
    twgl.setTextureFromArray(gl, this.texture, this.data, {
      internalFormat: gl.RGBA16F,
      format: gl.RGBA,
      type: gl.HALF_FLOAT,
    })

    this.cTexel--
    // returning pt not necessary as far as of now... but it is called popPoint...
    this.pts.pop()
  }

  getPoint(index) {
    // this is confusing because texel means something different in addPoint
    const texel = index * 4

    const buffer = new ArrayBuffer(64)

    const view = new DataView(buffer)

    view.getFloat16 = (...args) => getFloat16(view, args[0], args[1])
    view.setFloat16 = (...args) =>  setFloat16(view, args[0], args[1])

    const data = this.data.slice(texel, texel + 4)

    data.forEach((d, i) => {
      view.setUint16(i * 16, d, ENDD)
    })

    const x = view.getFloat16(0, ENDD)

    const y = view.getFloat16(16, ENDD)
    const z = view.getFloat16(32, ENDD)
    const w = view.getFloat16(48, ENDD)

    return [x, y, z, w]
  }
}

export class PointArray {
  // creates empty PolyPoint object
  constructor(_dataSize) {
    this.dataSize = 3

    // list of points
    this.pts = []

    this.id = uuid()
  }

  addPoint(_pt, pId, index) {

    let x = _pt ? _pt.x : 0.0
    let y = _pt ? _pt.y : 0.0
    let z = _pt && _pt.z ? _pt.z : 0.0
    let w = _pt && _pt.z ? _pt.w : 0.0

    let pt = new vec(x, y, z, w, pId)

    index ? this.pts[index] = pt : this.pts.push(pt)
  }

  popPoint() {
    return this.pts.pop()
  }

  getPoint(index) {
    return this.pts[index]
  }
}

//https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
export function distPrim(_mPt, prim) {
  let mPt = {}
  //until we switch out mPt for a twgl.v3
  if (_mPt.x) {
    mPt = twgl.v3.create(_mPt.x, _mPt.y, _mPt.z)
  } else {
    mPt = _mPt
  }

  let tPt = twgl.v3.subtract(mPt, prim.translate)

  let dist = 1000
  switch (prim.type) {
    case 'polyline':
      dist = Math.min(dist, pLineDist(tPt, prim))
      break
    case 'polygon':
      dist = Math.min(dist, polygonDist(tPt, prim))
      break
    case 'circle':
      dist = Math.min(dist, circleDist(tPt, prim))
      break
    case 'ellipse':
      dist = Math.min(dist, ellipseDist(tPt, prim))
      break
    case 'rectangle':
      dist = Math.min(dist, rectDist(tPt, prim))
      break
    case 'img':
      dist = Math.min(dist, rectDist(tPt, prim))
      break
    default:
      break
  }
  return dist
}

//return distance to a rectangle
function rectDist(mPt, prim) {

  let ptA = twgl.v3.copy(prim.pts[0].v3)
  let ptB = twgl.v3.copy(prim.pts[1].v3)

  let center = twgl.v3.add(twgl.v3.mulScalar(twgl.v3.subtract(ptB, ptA), 0.5), ptA)
  let b = twgl.v3.subtract(ptB, center)
  b = twgl.v3.create(Math.abs(b[0]), Math.abs(b[1]))

  let radius = twgl.v3.create(prim.properties.radius, prim.properties.radius)

  twgl.v3.subtract(b, radius, b)

  let uv = twgl.v3.subtract(mPt, center)
  let d = twgl.v3.subtract(twgl.v3.create(Math.abs(uv[0]), Math.abs(uv[1])), b)

  let dist = twgl.v3.length(twgl.v3.max(d, twgl.v3.create(0, 0))) + Math.min(Math.max(d[0], d[1]), 0) - radius[0]

  return dist
}

//returns distance to a poly line
function pLineDist(mPt, prim) {
  if (prim.type != 'polyline') { return 1000 }

  let dist = 1000
  let prev
  for (let p of prim.pts) {

    if (typeof prev === 'undefined') {
      prev = p
      continue
    }

    // TODO: return h from lineDist
    let lD = lineDist(mPt, prev, p, prim.properties.weight)

    // TODO: if lD < dist, return (dist, {a: prev, b: p}, h)
    dist = Math.min(dist, lD)

    prev = p
  }
  return dist
}

//returns distance to a poly line
function polygonDist(mPt, prim) {

  let prev = twgl.v3.copy(prim.pts[prim.pts.length - 1].v3)

  let first = twgl.v3.copy(prim.pts[0].v3)
  first = twgl.v3.subtract(mPt, first)

  let dist = twgl.v3.dot(first, first)
  let s = 1

  for (let _p of prim.pts) {
    let p = twgl.v3.copy(_p.v3)

    let e = twgl.v3.subtract(prev, p)
    let w = twgl.v3.subtract(mPt, p)

    let b = twgl.v3.subtract(w, twgl.v3.mulScalar(e, clamp(twgl.v3.dot(w, e) / twgl.v3.dot(e, e), 0.0, 1.0)))

    dist = Math.min(dist, twgl.v3.dot(b, b))

    let c = {
      x: mPt[1] >= p[1],
      y: mPt[1] < prev[1],
      z: e[0] * w[1] > e[1] * w[0]
    }

    if ((c.x && c.y && c.z) || (!c.x && !c.y && !c.z)) s *= -1

    prev = p
  }
  dist = s * Math.sqrt(dist)
  return dist
}

//returns distance to a circle
function circleDist(mPt, prim) {

  let ptA = twgl.v3.copy(prim.pts[0].v3)
  let ptB = twgl.v3.copy(prim.pts[1].v3)

  let radius = twgl.v3.distance(ptA, ptB)
  let uv = twgl.v3.subtract(mPt, ptA)

  let dist = twgl.v3.length(uv) - radius

  return dist
}

// returns distance to an ellipse
function ellipseDist(mPt, prim) {

  // ptA is center of the ellipse
  let ptA = twgl.v3.copy(prim.pts[0].v3)
  // ptA[2] = 1.0;
  let ptB = twgl.v3.copy(prim.pts[1].v3)
  // ptB[2] = 1.0;
  let e = twgl.v3.max(twgl.v3.subtract(ptB, ptA), twgl.v3.create(0.1, 0.1, 1.0))
  e[2] = 1.0
  let pAbs = absV3(twgl.v3.subtract(mPt, ptA))
  pAbs[2] = 1.0
  // not sure if the z value should be 0 or 1
  let ei = twgl.v3.divide(twgl.v3.create(1.0, 1.0, 1.0), e)
  let e2 = twgl.v3.multiply(e, e)
  let ve = twgl.v3.multiply(ei, twgl.v3.create(e2[0] - e2[1], e2[1] - e2[0], 1.0))

  let t = twgl.v3.create(0.7071067811865475, 0.7071067811865475, 1.0)

  for (let i = 0; i < 3; i++) {
    let v = twgl.v3.multiply(ve, t)
    twgl.v3.multiply(v, t, v)
    twgl.v3.multiply(v, t, v)
    let u = twgl.v3.normalize(twgl.v3.subtract(pAbs, v))
    twgl.v3.mulScalar(u, twgl.v3.length(twgl.v3.subtract(twgl.v3.multiply(t, e), v)), u)
    let w = twgl.v3.multiply(ei, twgl.v3.add(v, u))
    t = twgl.v3.normalize(clampV3(w, 0.0, 1.0))
  }

  let nearestAbs = twgl.v3.multiply(t, e)
  nearestAbs[2] = 1
  let dist = twgl.v3.length(twgl.v3.subtract(pAbs, nearestAbs))

  return twgl.v3.dot(pAbs, pAbs) < twgl.v3.dot(nearestAbs, nearestAbs) ?
    -1 * dist : dist
}

//returns distance to a line
function lineDist(p, _a, _b, w) {

  let a = twgl.v3.copy(_a.v3)
  let b = twgl.v3.copy(_b.v3)

  let pa = twgl.v3.subtract(p, a)
  let ba = twgl.v3.subtract(b, a)
  let dot = twgl.v3.dot(pa, ba) / twgl.v3.dot(ba, ba)
  let h = clamp(dot, 0.0, 1.0)

  return twgl.v3.length(twgl.v3.subtract(pa, twgl.v3.mulScalar(ba, h))) - w
}

// Utilities

function clamp(a, low, high) {
  return Math.min(Math.max(a, low), high)
}

// twgl.v3 a, twgl.v3 b
function clampV3(a, _min, _max) {
  let min = twgl.v3.create(_min, _min, 0.0)
  let max = twgl.v3.create(_max, _max, 0.0)

  return twgl.v3.min(twgl.v3.max(a, min), max)
}

function absV3(a) {
  return twgl.v3.create(Math.abs(a[0]),
    Math.abs(a[1]),
    Math.abs(a[2]))
}

function sync(target, tProp, source, sProp, _enumerable = false) {
  Object.defineProperty(target, tProp, {
    enumerable: false,
    configurable: true,
    get() {
      return source[sProp]
    },
    set(value) {
      source[sProp] = value
    }
  })
  return target
}