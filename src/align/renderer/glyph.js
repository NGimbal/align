//glyph.js
'use strict'

import chroma from 'chroma-js'
import * as twgl from 'twgl.js'

// will live in a scene object that is the singleton for this shit
import { gl, state, resolution, mPt, dPt } from '../draw.js'

import { SCALE } from '../constants'

import * as FS from './shaders/shaders'
import * as BAKE from './bakeGlyph.js'

import * as PRIM from '../document/primitives.js'

// to be treated as a drawObject by twgl we need these properties
// { programInfo: programInfo,
//   bufferInfo: plane,
//   uniforms: this.uniforms,}
// can't have property named "type"
export class Glyph {
  constructor(prim, vert, frag, _order, _uniforms) {
    let uniforms = _uniforms || getUniforms(prim)

    if (typeof prim != 'object' || typeof vert != 'string' || typeof frag != 'string' || typeof uniforms != 'object') {
      console.log('glyph constructor is invalid, check inputs')
      console.log('prim: ', prim)
      console.log('vert: ', vert)
      console.log('frag: ', frag)
      console.log('uniforms: ', uniforms)
      return
    }

    this.order = _order || 0
    this.active = true
    this.visible = true

    //prop type is reserved for gl draw type
    this.primType = prim.type.slice()

    this.vert = vert.slice()
    this.frag = frag.slice()
    this.uniforms = { ...uniforms }

    let ptsLength = 16

    if (prim.pts && prim.pts.length > 0) {
      // largest multiple of 2 that is > pts.length
      ptsLength = Math.ceil((Math.sqrt(prim.pts.length) / 2)) * 2
    }

    if (prim.id) {
      this.id = prim.id.slice()
    } else {
      this.id = PRIM.uuid()
    }

    if (this.uniforms.u_eTex) {
      this.uniforms.u_eTex = new PRIM.PolyPoint(ptsLength)
      this.uniforms.u_cTex = this.uniforms.u_eTex.cTexel
    }

    if (this.uniforms.u_idCol) {
      this.uniforms.u_idCol = twgl.v3.copy(prim.idCol)
    }

    // bbox is set on bake
    // we test for presence of bbox to determine whether to bake glyph
    // this is probably something we'll have to change at some point
    this.bbox

    if (typeof prim.pts !== 'undefined' && prim.pts.length && this.uniforms.u_eTex) {
      // prim.pts.forEach((p, i) => this.uniforms.u_eTex.addPoint(p, prim.id.slice(), i));
      this.uniforms.u_eTex.addPoints(prim.pts)
    }

    this.translate = prim.translate || twgl.v3.create()

    this.matrix = twgl.m4.ortho(0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1)
    this.matrix = twgl.m4.translate(this.matrix, twgl.v3.create(0, 0, 0))
    this.matrix = twgl.m4.scale(this.matrix, twgl.v3.create(gl.canvas.width, gl.canvas.height, 1))
    this.uniforms.u_matrix = this.matrix

    //create program
    this.programInfo = twgl.createProgramInfo(gl, [vert, frag])

    //create plane
    const positions = new Float32Array([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1,])
    const texcoords = new Float32Array([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1,])
    const arrays = {
      position: { numComponents: 2, data: positions },
      texcoord: { numComponents: 2, data: texcoords }
    }
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays)

    this.bufferInfo = bufferInfo
    this.vertexArrayInfo = twgl.createVertexArrayInfo(gl, this.programInfo, this.bufferInfo)
  }
}

// texture clipping reference:
// https://webgl2fundamentals.org/webgl/lessons/webgl-2d-drawimage.html
//updates position and texture clipping matrices for glyph
export function updateMatrices(glyph, _asImg) {
  const asImg = _asImg || false

  // get prim
  let prim = state.scene.editItems.find(item => item.id === glyph.id)

  // world Origin translated by panning view
  let minX = dPt[0] * resolution.y
  let minY = dPt[1] * resolution.y
  let wOrigin = twgl.v3.create(minX, minY)

  // inverse scale factor per zoom
  let fX = (SCALE / dPt[2]) * resolution.y
  let fY = (SCALE / dPt[2]) * resolution.y
  let fact = twgl.v3.create(fX, fY)

  // glyph Origin initial translation, scaled by zoom
  let lOrigin = twgl.v3.subtract(glyph.bbox.min.v3, twgl.v3.create())
  twgl.v3.multiply(lOrigin, fact, lOrigin)

  // world space matrix, translated by panning view
  glyph.matrix = twgl.m4.ortho(0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1)
  twgl.m4.translate(glyph.matrix, wOrigin, glyph.matrix)

  // glyph Origin translated by prim.translate, translation scaled by zoom
  let translate = twgl.v3.multiply(prim.translate, fact)
  twgl.v3.add(lOrigin, translate, translate)
  twgl.m4.translate(glyph.matrix, translate, glyph.matrix)

  // scale quad to width and height, adjusted by zoom
  let width = glyph.bbox.width * fX
  let height = glyph.bbox.height * fY
  glyph.matrix = twgl.m4.scale(glyph.matrix, twgl.v3.create(width, height, 1))

  glyph.uniforms.u_matrix = glyph.matrix

  const denominator = resolution.y * SCALE
  const scaleX = width * dPt[2] / denominator
  const scaleY = height * dPt[2] / denominator

  const origin = twgl.v3.subtract(glyph.bbox.min.v3, twgl.v3.create())

  const texMatrix = twgl.m4.identity()
  // will probably have to change when everything is an image
  if (glyph.primType !== 'img' && !asImg) {
    twgl.m4.translate(texMatrix, origin, texMatrix)
    twgl.m4.scale(texMatrix, twgl.v3.create(scaleX, scaleY, 1), texMatrix)
  }

  glyph.uniforms.u_textureMatrix = texMatrix
}

//bakes glyph
export function bakeGlyph(glyph) {
  // set bounding box
  glyph.bbox = new PRIM.bbox(glyph, 0.05)

  updateMatrices(glyph)

  const fs = BAKE.bake(glyph)
  glyph.frag = fs
  glyph.programInfo = twgl.createProgramInfo(gl, [glyph.vert, fs])

  const matrix = twgl.m4.identity()
  twgl.m4.scale(matrix, twgl.v3.create(2, 2, 1), matrix)
  twgl.m4.translate(matrix, twgl.v3.create(-0.5, -0.5, 0), matrix)
  glyph.uniforms.u_matrix = matrix

  gl.useProgram(glyph.programInfo.program)
  twgl.setUniforms(glyph.programInfo, glyph.uniforms)

  const [imgSrc, distImgSrc] = renderGlyph(glyph)

  // download image of glyph
  // const factor = (SCALE / dPt[2]) * gl.canvas.height;
  // const width = Math.floor(glyph.bbox.width * factor);
  // const height = Math.floor(glyph.bbox.height * factor);

  // saveWebGLTexture(distImgSrc, {
  //   width,
  //   height
  // });
  //----

  // TODO: create new image glyph, current glyph is a child of that glyph
  updateMatrices(glyph, true)
  glyph.programInfo = twgl.createProgramInfo(gl, [glyph.vert, getFragStub('img')])
  glyph.uniforms = getUniforms({ type: 'img', imgSrc, distImgSrc })
  gl.useProgram(glyph.programInfo.program)
  twgl.setUniforms(glyph.programInfo, glyph.uniforms)
}

// TODO: this can get moved to offscreencanvas at some point
export function renderGlyph(glyph) {
  glyph.active = true

  const factor = (SCALE / dPt[2]) * gl.canvas.height
  const targetWidth = Math.floor(glyph.bbox.width * factor)
  const targetHeight = Math.floor(glyph.bbox.height * factor)

  const rgbaTexture = twgl.createTexture(gl,
    {
      level: 0,
      width: targetWidth,
      height: targetHeight,
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    })

  const distTexture = twgl.createTexture(gl,
    {
      level: 0,
      width: targetWidth,
      height: targetHeight,
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    })

  const glyphBuffer = twgl.createFramebufferInfo(gl, [
    { attachment: rgbaTexture, attachmentPoint: gl.COLOR_ATTACHMENT0 },
    { attachment: distTexture, attachmentPoint: gl.COLOR_ATTACHMENT1 }
  ], targetWidth, targetHeight)

  twgl.bindFramebufferInfo(gl, glyphBuffer)

  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1
  ])

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  twgl.drawObjectList(gl, [glyph])

  return [rgbaTexture, distTexture]
}

//create new edit glyph of a certain primitive type
export function createGlyph(prim, order, _edit) {
  const edit = typeof _edit !== 'undefined' ? _edit : true
  //get program stub for prim type
  let fs = getFragStub(prim.type, edit)
  let vs = FS.simpleVert.slice()

  //return new Glyph
  let glyph = new Glyph(prim, vs, fs, order)

  return glyph
}

//does this function need to be public?
//returns edit frag or stub frag depending on edit param
export function getFragStub(type, edit) {
  switch (type) {
    case 'polyline':
      return edit ? FS.pLineEdit.slice() : FS.pLineStub.slice()
    case 'polygon':
      return edit ? FS.polygonEdit.slice() : FS.polygonStub.slice()
    case 'circle':
      return edit ? FS.circleEdit.slice() : FS.circleStub.slice()
    case 'ellipse':
      return edit ? FS.ellipseEdit.slice() : FS.ellipseStub.slice()
    case 'rectangle':
      return edit ? FS.rectangleEdit.slice() : FS.rectangleStub.slice()
    case 'pointlight':
      return FS.pointLightEdit.slice()
    case 'img':
      return FS.imgFrag.slice()
    default:
      return FS.pLineStub.slice()
  }
}


// TODO: u_resolution, u_dPt will be "edit only" uniforms
//get uniforms by prim type
export function getUniforms(prim) {
  const type = prim.type
  //full screen texture matrix
  // let texMatrix = twgl.m4.translation(twgl.v3.create(0, 0, 0));
  // texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));
  const texMatrix = twgl.m4.identity()

  let properties = { ...prim.properties }
  switch (type) {
    case 'polyline':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
        u_sel: properties.sel,
      }
    case 'polygon':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
        u_fill: chroma(properties.fill).gl().slice(0, 3),
      }
    case 'circle':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt[0], mPt[1], 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
        u_fill: chroma(properties.fill).gl().slice(0, 3),
      }
    case 'ellipse':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt[0], mPt[1], 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
        u_fill: chroma(properties.fill).gl().slice(0, 3),
      }
    case 'rectangle':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
        u_fill: chroma(properties.fill).gl().slice(0, 3),
        u_radius: 0.01,
      }
    case 'pointlight':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_distTex: {},
        u_cTex: -1, // not really a tex... stands for current Texel
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
        u_fill: chroma(properties.fill).gl().slice(0, 3),
        u_radius: 0.01,
      }
    case 'img':
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_img: prim.imgSrc,
        u_distImg: prim.distImgSrc,
      }
    default:
      return {
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_weight: properties.weight,
        u_opacity: properties.opacity,
        u_stroke: chroma(properties.stroke).gl().slice(0, 3),
      }
  }
}