'use strict'

import chroma from 'chroma-js'
import * as twgl from 'twgl.js'

import { reducer, initialState } from './document/store/reducers'
import { createStore, applyMiddleware } from 'redux'
import RBush from 'rbush'

import { SCALE } from './constants'

import * as ACT from './document/store/actions.js'

import { DrawUI } from './gesture.js'
import * as PRIM from './document/primitives.js'
import * as SF from './renderer/shaders/shaders.js'
import { createGlyph, bakeGlyph, Glyph, updateMatrices, getUniforms } from './renderer/glyph.js'
import { deviceToSceneScalar, dispToValue, sceneToDeviceScalar } from './renderer/transformationUtils'

var canvas, ctx, ui

// TODO: put view in redux store
export var view

export var gl
export var resolution

export var mPt = twgl.v3.create(0.0, 0.0, 0.0)
//dPt z is scale
export var dPt = new twgl.v3.create(0, 0, SCALE)

// create redux store with middleware
// export const store = createStore(reducer, initialState, applyMiddleware(middleWare));
// export var state = store.getState();
// export const { dispatch } = store;
export let store, state, dispatch

// kd tree for points
export var ptTree = new RBush()
// bounding box tree for primitives
export var bboxTree = new RBush()
// list of renderable items
export var glyphs

var distBuffer, distTex, sceneTex

var resize = false

let setParentState

/*
 * 
 * Principles:
 * - Decouple rendering and document state completely
 * - Don't rely on actions to update rendering state
 * - Keep doing cool stuff with shaders
 * 
 * TODOS:
 * - [x] Render baked primitives to a texture and treat them as images
 * - [x] fix selection / bbox calculation / box selection
 * 
 * --- Editing Primitives
 * - [ ] implement arcs
 * - [ ] implement text, text editing
 *   - notes can start as a list of annotations
 *   - need to have both prim based annotations
 *   - and "general annotations" which can be their own primitive
 *   - hover note in html, prim is highlighted in drawing
 *   - in drawing, we need to render a tag for the note
 *   - open to this being just in the text context as a canvas
 * - [ ] implement text leaders / tags
 * 
 * - [x] only render shit once...
 *   - for now I'll test if edit prim is pointLight and only render distTex if that's the case (good compromise for now)
 * 
 * --- Loading UX
 * - [x] implement load progress status
 * - [ ] implement a way to add prims as baked w/ out creating an edit programinfo
 * - [x] implement PolyPoint.addPoints() function
 * - [ ] fix add multiple prims at once, potentially make this adapt to # of pts in a prim
 * - [ ] bakePrim don't unroll loop, takes too long to compile shaders with lots of points
 * 
 * --- Editing UX
 * - [ ] snap to distance by keyboard, snap to distance x, snap to distance y
 * - [x] optimize primitive translation in gesture.js:89
 *   - judo-ed this by just returning early in middleware
 * - [ ] implement hover shader
 * - [ ] implement adjust properties / uniforms
 * - [ ] render glyphs at an appropriate resolution and / or adapt resolution as dPt changs
 * - [ ] implement move existing points
 * - [ ] impelement bbox + handles in ui shader
 * 
 * - [ ] implement virtual scrolling for align sider
 * - [ ] implement selection & bbox filtering for list in align sider
 * - [ ] implement click & drag panning
 * - [x] zoom to fit scene, zoom to fit selection
 * - [x] parameterize scene scale (SCALE)
 * 
 * --- the following optimizations are secondary to the list above
 * - [ ] lookup polyline / polygon points in vertex shader instead of frag
 * - [ ] use cTex to break in fragment shader instead of pt == vec2(0, 0)
 * - [ ] use offscreen canvas during glyph baking when possible
 * - [ ] implement high quality / high speed toggle (?)
 * 
 * --- secondary features
 * - [ ] implement ngon
 * - [ ] implement a higher performance "line" primitive
 *   - this will just have two points, not in a texture
 *   - can be u_pointA and u_pointB, use this for circle / rectange / ellipse
 *   - arcs would have u_pointA thru u_pointC, that's fine
 * - [ ] unify polyline / polygon ui
 *   - snap to last point, click on last point to end drawing (in addition to enter)
 *   - snap to first point, click closes polyline -> polygon (and ends drawing)
 *   - can toggle stroke / fill (maybe just set opacity to 0)
 *   - could also look into uniform arrays? just so it's a little more similar to the u_eTex workflow
 * - [ ] unify primitive editing UX
 *   - allow filled primitive boundaries of arcs / polylines / bezier curves for instance
 *   - unify arc / circle / pie
 * - [ ] implement bezier curves
 * - [ ] implement hatch workflow (see rectanlge shader)
 *   - this will be very close to the "filters" workflow
 *   - [eventually] will create a .pat -> shader function
 * - [ ] implement add / remove points
 * - [ ] implement scale / rotate / translate for shapes
 */

function middleWare({ getState }) {
  return next => action => {
    const returnVal = next(action)

    const newState = getState()

    // this is working
    // if (action.subtype === ACT.EDIT_WEIGHT) {
    //   console.log(action)
    //   console.log('---------------')
    // }

    // TODO: this needs to actually be fixed
    if (action.subtype === ACT.EDIT_TRANSLATE) {
      return
    }

    if (action.type === ACT.scene &&
      typeof setParentState === 'function') {
      updateDataStructures(newState)

      setParentState(state => ({
        ...state,
        scene: newState.scene,
      }))
    }

    if (action.type === ACT.history &&
      typeof setParentState === 'function') {

      if (action.subType !== ACT.HISTORY_PUSH) {
        updateDataStructures(newState)
      }

      setParentState(state => ({
        ...state,
        history: newState.history,
      }))
    }

    if (action.type === ACT.ui &&
      typeof setParentState === 'function') {

      setParentState(state => ({
        ...state,
        ui: newState.ui,
      }))
    }

    return returnVal
  }
}

export const updateDataStructures = (state) => {
  // update point tree by rebuilding - this seems inefficient but whatever
  ptTree = new RBush()

  let pts = state.scene.editItems.reduce((prev, curr, index, arr) => {
    if (state.ui.dragging && state.scene.selected.includes(curr.id)) return prev
    return [...prev, ...curr.pts.map((p, i, a) => PRIM.addVec(p, curr.translate))]
  }, [])

  ptTree.load(pts)

  // update bbox tree by rebuilding
  bboxTree = new RBush()

  // TODO: switch this over to glyph bboxes(?)
  // This is going to need to be optimized...
  let boxes = state.scene.editItems.reduce((prev, curr, index, arr) => {
    if (state.scene.editItem === curr.id) return prev
    if (curr.pts.length === 0) return prev
    return [...prev, ...[new PRIM.bbox(curr)]]
  }, [])

  bboxTree.load(boxes)

  updateGlyphs()

  return state
}

// updating glyphs outside of render loop
// creating glyphs and baking glyphs are the most time consuming operatinos
function updateGlyphs() {

  // sort by order
  glyphs = glyphs.sort((a, b) => a.order - b.order)

  const editItemIDs = state.scene.editItems.map(item => item.id)
  const glyphIDs = glyphs.map(glyph => glyph.id)

  // filter out deleted items
  glyphs = glyphs.filter(glyph =>
    editItemIDs.includes(glyph.id) ||
    glyph.primType === 'grid' ||
    glyph.primType === 'ui'
  )

  // create any new glyphs that haven't been created yet
  state.scene.editItems.forEach((item, i) => {
    if (!glyphIDs.includes(item.id)) {
      let glyph = createGlyph(item, i, item.id === state.scene.editItem)
      // TODO: checking for img type is weird and hacky
      if (item.pts && item.pts.length > 0 && item.type === 'img') {
        glyph.bbox = new PRIM.bbox(item)
        updateMatrices(glyph)
      }
      glyphs.push(glyph)
    }
  })

  // TODO: this actually creates new glyphs twice unnecessarily
  // check if item is edit glyph in loop above
  // make sure edit item is an "edit" glyph
  const editGlyphIndex = glyphs.findIndex(g => g.id === state.scene.editItem)
  if (editGlyphIndex > -1 && glyphs[editGlyphIndex].bbox instanceof PRIM.bbox) {
    const editing = state.scene.editItems.find(i => i.id === state.scene.editItem)
    if (!editing) return
    glyphs[editGlyphIndex] = createGlyph(editing, editGlyphIndex)
  }

  glyphs.forEach((glyph, i, a) => {
    // bake new glyphs
    if (!(glyph.bbox instanceof PRIM.bbox) &&
      glyph.id !== state.scene.editItem &&
      glyph.primType !== 'grid' &&
      glyph.primType !== 'ui'
    ) {
      if (glyph.primType === 'img') {
        return
      } else if (glyph.uniforms.u_eTex.pts.length > 0) {
        const prim = state.scene.editItems.find(item => item.id === glyph.id)
        if (!prim) return
        updateGlyphUniforms(glyph, prim)
        bakeGlyph(glyph)
      }
    }
  })
}

export function initDraw(_setScene) {
  if (typeof window === 'undefined') return

  store = createStore(reducer, initialState, applyMiddleware(middleWare))
  state = store.getState()
  dispatch = store.dispatch

  // subscribe to store changes - run listener to set relevant variables
  // store.subscribe(() => console.log(listener()));
  store.subscribe(() => state = store.getState())

  setParentState = _setScene

  let canvasContainer = document.querySelector('#canvas-container')

  let textCanvas = document.querySelector('#text')
  ctx = textCanvas.getContext('2d')

  canvas = document.querySelector('#c')

  // subtle difference bug display-p3 looks a little nicer
  gl = canvas.getContext('webgl2', { premultipliedAlpha: false, colorSpace: 'display-p3' })

  twgl.setDefaults({ attribPrefix: 'a_' })
  twgl.resizeCanvasToDisplaySize(gl.canvas)
  twgl.resizeCanvasToDisplaySize(ctx.canvas)

  //set the document resolution
  resolution = new PRIM.vec(canvas.clientWidth, canvas.clientHeight)
  dispatch(ACT.cursorGridScale(SCALE))
  dispatch(ACT.cursorGrid(SCALE))

  view = {
    minX: (0.0 - dPt[0]) * (SCALE / dPt[2]),
    minY: (0.0 - dPt[1]) * (SCALE / dPt[2]),
    maxX: (resolution.x / resolution.y) * (SCALE / dPt[2]) - dPt[0],
    maxY: 1.0 * (SCALE / dPt[2]) - dPt[1],
  }

  if (!gl) {
    console.log('your browser/OS/drivers do not support WebGL2')
    return
  }

  glyphs = []
  dispatch(ACT.scenePushEditItem(new PRIM.prim('polyline', [], PRIM.propsDefault)))

  // set up event handlers and such
  ui = new DrawUI()

  // need to initialize ptTree and bboxTree even tho they're empty
  updateDataStructures(store.getState())

  canvasContainer.onwheel = scrollPan

  let texMatrix = twgl.m4.identity()

  let gridUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
  }

  // grid layer
  let gridLayer = new Glyph({ type: 'grid' }, SF.simpleVert, SF.gridFrag, -1, gridUniforms)
  glyphs.push(gridLayer)
  gridLayer.active = state.ui.showGrid

  let uiUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
    u_mPt: mPt,
    u_eTex: {},
    u_weight: 0.001,
    u_stroke: chroma('#ffa724').gl().slice(0, 3),
    u_boxSel: twgl.v3.create(),
    u_boxState: state.ui.boxSelectState,
  }

  // ui layer
  let uiLayer = new Glyph({ type: 'ui' }, SF.simpleVert, SF.uiFrag, 10000, uiUniforms)
  glyphs.push(uiLayer)

  //---
  distTex = twgl.createTexture(gl, {
    level: 0,
    width: gl.canvas.width,
    height: gl.canvas.height,
    min: gl.LINEAR,
    wrap: gl.CLAMP_TO_EDGE,
  })

  sceneTex = twgl.createTexture(gl, {
    level: 0,
    width: gl.canvas.width,
    height: gl.canvas.height,
    min: gl.LINEAR,
    wrap: gl.CLAMP_TO_EDGE,
  })

  distBuffer = twgl.createFramebufferInfo(gl, [
    { attachment: sceneTex, attachmentPoint: gl.COLOR_ATTACHMENT0 },
    { attachment: distTex, attachmentPoint: gl.COLOR_ATTACHMENT1 }
  ], gl.canvas.width, gl.canvas.height)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  requestAnimationFrame(render)
}

// TODO: right now _src is passed from onDrop as a base64 encoded string
// should actually be uploaded to google cloud storage and stored as url in primitive
// addImage function
export function addImage(_src, dims, evPt) {
  let src, image
  switch (typeof _src) {
    case 'string':
      src = _src
      break
    default:
      src = '../assets/textures/leaves.jpg'
      break
  }

  let texMatrix = twgl.m4.translation(twgl.v3.create(0, 0, 0))
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1))

  image = twgl.createTexture(gl, {
    src: src,
    color: [0.125, 0.125, 0.125, 0.125],
  }, () => {
    // console.log(image);
  })

  twgl.loadTextureFromUrl(gl, image)

  // transforms window / js space to sdf / frag space
  evPt.x = ((evPt.x / resolution.x) * (resolution.x / resolution.y)) - dPt[0]
  evPt.y = (evPt.y / resolution.y) - dPt[1]
  evPt.x = evPt.x * (dPt[2] / SCALE)
  evPt.y = evPt.y * (dPt[2] / SCALE)

  drawImage(image, { width: dims.width / dims.height, height: 1 }, evPt)
}

export function drawImage(img, dims, evPt) {

  const { width, height } = dims

  let pt0 = new PRIM.vec(evPt.x, evPt.y)
  let pt1 = new PRIM.vec(evPt.x + width, evPt.y + height)
  let pts = [pt0, pt1]

  let imgPrim = new PRIM.prim('img', pts)
  imgPrim.imgSrc = img
  imgPrim.distImgSrc = img

  dispatch(ACT.scenePushEditItem(imgPrim, state.scene.editItem))
}

function update() {

  ui.update()

  let selDist = sceneDist()

  // Style mouse for hover - could also do tooltip at some point
  if (selDist.d < 0.01 && state.ui.mode === 'select' && selDist.sel) {
    if (state.scene.hover !== selDist.sel.id) {
      document.getElementById('canvas-container').style.cursor = 'grab'
      dispatch(ACT.editHoverSet(selDist.sel.id))
    }
  } else if (state.scene.hover !== '') {
    document.getElementById('canvas-container').style.cursor = 'auto'
    dispatch(ACT.editHoverClr())
  }

  updateCtx(selDist)

  resize = twgl.resizeCanvasToDisplaySize(gl.canvas)

  if (resize) {
    twgl.resizeCanvasToDisplaySize(ctx.canvas)
    twgl.resizeTexture(gl, distTex, {
      level: 0,
      width: gl.canvas.width,
      height: gl.canvas.height,
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    })
    twgl.resizeTexture(gl, sceneTex, {
      level: 0,
      width: gl.canvas.width,
      height: gl.canvas.height,
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    })

    PRIM.vecSet(resolution, gl.canvas.width, gl.canvas.height)
  }
}

// TODO: because of our new image prims uniform.u_stroke isn't an object, so this doesn't work
// going with glyph in glyph approach, probably by actually nesting the objects
// I think creating the image glyphs is fast enough that we should just create them as we do now
// when a glyph is modified, re-render the child glyph and update the parent glyph's uniform
// since these properties are primitives, shouldn't need to recompile the shaders
// update only once each frame
// problem will be if someone tries to modify the properties of lots of primitives at once
// will deal with that when it comes up tho...

// update glyph uniforms in render loop
function updateGlyphUniforms(glyph, prim) {
  let _needsUpdate = false

  function needsUpdate() {
    if (!_needsUpdate) {
      gl.useProgram(glyph.programInfo.program)
      _needsUpdate = true
    }
  }

  if (resize && typeof glyph.uniforms.u_resolution !== 'undefined' &&
    (glyph.uniforms.u_resolution[0] !== gl.canvas.width
      || glyph.uniforms.u_resolution[1] !== gl.canvas.height)) {
    needsUpdate()
    glyph.uniforms.u_resolution['0'] = gl.canvas.width
    glyph.uniforms.u_resolution['1'] = gl.canvas.height
  }

  if (typeof glyph.uniforms.u_dPt !== 'undefined' &&
    (glyph.uniforms.u_dPt[0] !== dPt[0]
      || glyph.uniforms.u_dPt[1] !== dPt[1]
      || glyph.uniforms.u_dPt[2] !== dPt[2])) {
    needsUpdate()
    glyph.uniforms.u_dPt = dPt
  }

  if (typeof glyph.uniforms.u_mPt !== 'undefined' &&
    (glyph.uniforms.u_mPt[0] !== mPt[0]
      || glyph.uniforms.u_mPt[1] !== mPt[1])) {
    needsUpdate()
    glyph.uniforms.u_mPt[0] = mPt[0]
    glyph.uniforms.u_mPt[1] = mPt[1]
  }

  // box select
  if (typeof glyph.uniforms.u_boxSel === 'object' &&
    (glyph.uniforms.u_boxSel[0] !== state.ui.boxSel[0]
      || glyph.uniforms.u_boxSel[1] !== state.ui.boxSel[1]
      || glyph.uniforms.u_boxSel[2] !== state.ui.boxSel[2])) {
    needsUpdate()
    glyph.uniforms.u_boxSel = twgl.v3.copy(state.ui.boxSel)
  }
  // box select state 0, 1
  if (typeof glyph.uniforms.u_boxState === 'number'
    && glyph.uniforms.u_boxState !== state.ui.boxSelectState) {
    needsUpdate()
    glyph.uniforms.u_boxState = state.ui.boxSelectState
  }

  // u_stroke
  if (typeof glyph.uniforms.u_stroke === 'object') {
    const stroke = chroma(prim.properties.stroke).gl().slice(0, 3)
    if (glyph.uniforms.u_stroke[0] !== stroke[0] ||
      glyph.uniforms.u_stroke[1] !== stroke[1] ||
      glyph.uniforms.u_stroke[2] !== stroke[2]) {
      needsUpdate()
      glyph.uniforms.u_stroke = stroke
    }
  }

  // u_fill
  if (typeof glyph.uniforms.u_fill === 'object') {
    const fill = chroma(prim.properties.fill).gl().slice(0, 3)
    if (glyph.uniforms.u_fill[0] !== fill[0]
      || glyph.uniforms.u_fill[1] !== fill[1]
      || glyph.uniforms.u_fill[2] !== fill[2]) {
      needsUpdate()
      glyph.uniforms.u_fill = fill
    }
  }

  // u_weight
  if (typeof glyph.uniforms.u_weight === 'number' &&
    (glyph.uniforms.u_weight !== prim.properties.weight)) {
    needsUpdate()
    glyph.uniforms.u_weight = prim.properties.weight
  }

  // u_opacity
  if (typeof glyph.uniforms.u_opacity === 'number' &&
    glyph.uniforms.u_opacity !== prim.properties.opacity) {
    needsUpdate()
    glyph.uniforms.u_opacity = prim.properties.opacity
  }

  // u_radius
  if (typeof glyph.uniforms.u_radius === 'number' &&
    glyph.uniforms.u_radius !== prim.properties.radius) {
    needsUpdate()
    glyph.uniforms.u_radius = prim.properties.radius
  }

  // u_distTex - how will we check whether this needs to be updated?
  if (typeof glyph.uniforms.u_distTex === 'object') {
    needsUpdate()
    glyph.uniforms.u_distTex = distTex
  }

  // u_eTex
  if (glyph.uniforms.u_eTex instanceof PRIM.PolyPoint) {

    prim.pts.forEach((p, i) => {
      const uPt = glyph.uniforms.u_eTex.getPoint(i)
      if (uPt.x !== p.x || uPt.y !== p.y) {
        needsUpdate()
        glyph.uniforms.u_eTex.addPoint(p, prim.id, i)
      }
    })

    // clear deleted prim points
    for (let i = 0; i < glyph.uniforms.u_cTex - (prim.pts.length - 1); i++) {
      needsUpdate()
      glyph.uniforms.u_eTex.popPoint()
    }
  }

  // u_sel
  if (typeof glyph.uniforms.u_sel === 'number') {
    if (state.scene.selected.includes(prim.id)
      && glyph.uniforms.u_sel < 1.0) {
      needsUpdate()
      glyph.uniforms.u_sel += 0.15
    } else if (state.scene.hover === prim.id
      && glyph.uniforms.u_sel < 0.7) {
      needsUpdate()
      glyph.uniforms.u_sel += 0.06
    } else if (glyph.uniforms.u_sel > 0.0) {
      needsUpdate()
      glyph.uniforms.u_sel -= 0.15
    }
  }

  // cTex isn't used yet
  // u_cTex
  if (typeof glyph.uniforms.u_cTex === 'number'
    && glyph.uniforms.u_cTex !== prim.pts.length - 1) {
    needsUpdate()
    glyph.uniforms.u_cTex = prim.pts.length - 1
  }

  if (_needsUpdate) {
    twgl.setUniforms(glyph.programInfo, glyph.uniforms)
    // bakeGlyph(glyph);
    // TODO: for baked prims, rerender the prim image
  }
}

let saveDist = false

function draw() {
  // spatial indexing / hashing for rendering
  let bboxSearch = bboxTree.search(view).map(b => b.id)

  // update glyph uniforms & bounding boxes
  glyphs.forEach((g) => {
    let prim = state.scene.editItems.find(a => a.id === g.id)

    if (prim && (prim.properties.visible !== g.visible)) {
      g.visible = prim.properties.visible
    }

    if (!g.active) return

    if (g.bbox instanceof PRIM.bbox) {
      updateMatrices(g, true)
    }

    // allows ui layer to give additional visual clues to current color, radius, line weight etc.
    if (g.primType === 'ui') {
      prim = state.scene.editItems.find(a => a.id === state.scene.editItem)
    }

    updateGlyphUniforms(g, prim)
  })

  // TODO: visible should be a property of the prim, and then updated in updateUniforms
  glyphs.forEach(g => {
    g.active =
      (bboxSearch.includes(g.id) && g.visible)
      || ((state.scene.editItem === g.id && state.ui.mode === 'draw'))

    if (g.primType === 'grid') g.active = state.ui.showGrid
    if (g.primType === 'ui') g.active = true
  })

  glyphs.sort((a, b) => a.order - b.order)

  // ----
  // TODO: only drawing things once basically gets us there in terms of framerate

  twgl.bindFramebufferInfo(gl, distBuffer)
  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1
  ])
  // Clear
  gl.clearColor(1, 1, 1, 0.0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // https://github.com/greggman/twgl.js/blob/e3a8d0ed09f7f5cd4be0e4cb5976081c2b5013aa/examples/vertex-array-objects.html#L302-L308
  glyphs.forEach(g => {
    if (!g.active ||
      ['grid', 'ui', 'pointlight'].includes(g.primType)) return
    const programInfo = g.programInfo
    gl.useProgram(programInfo.program)
    twgl.setUniforms(programInfo, g.uniforms)
    twgl.setBuffersAndAttributes(gl, programInfo, g.vertexArrayInfo)
    twgl.drawBufferInfo(gl, g.vertexArrayInfo)
  })

  if (saveDist) {
    saveWebGLTexture(distTex, {
      width: gl.canvas.clientWidth,
      height: gl.canvas.clientHeight,
    })
    saveDist = false
  }

  // draw to canvas
  twgl.bindFramebufferInfo(gl, null)
  gl.clearColor(1, 1, 1, 0.0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  // https://github.com/greggman/twgl.js/blob/e3a8d0ed09f7f5cd4be0e4cb5976081c2b5013aa/examples/vertex-array-objects.html#L302-L308
  glyphs.forEach(g => {
    if (!g.active) return
    const programInfo = g.programInfo
    gl.useProgram(programInfo.program)
    twgl.setUniforms(programInfo, g.uniforms)
    twgl.setBuffersAndAttributes(gl, programInfo, g.vertexArrayInfo)
    twgl.drawBufferInfo(gl, g.vertexArrayInfo)
  })
}

function render() {
  update()
  draw()
  requestAnimationFrame(render)
}

function scrollPan(e) {
  e.preventDefault()
  e.stopPropagation()
  dispatch(ACT.uiTargetHome(false))

  if (e.ctrlKey) {
    // Your zoom/scale factor
    dPt[2] = Math.max(1., dPt[2] + e.deltaY * 0.1)
    // TODO: zoom to mouse
    // console.log(mPt)
    // dPt[0] += e.deltaY * 0.01;
    // dPt[1] += e.deltaY * 0.01;
  } else {
    dPt[0] += e.deltaX * 0.001
    dPt[1] += e.deltaY * 0.001
  }

  view = {
    minX: ((0.0 - dPt[0]) * dPt[2]) / SCALE,
    minY: ((0.0 - dPt[1]) * dPt[2]) / SCALE,
    maxX: (((resolution.x / resolution.y) - dPt[0]) * dPt[2]) / SCALE,
    maxY: ((1.0 - dPt[1]) * dPt[2]) / SCALE,
  }

}

export function saveDistTex() {
  // const factor = (SCALE / dPt[2]) * gl.canvas.height;
  // const width = Math.floor(glyph.bbox.width * factor);
  // const height = Math.floor(glyph.bbox.height * factor);
  saveDist = true
}

export function zoomToBbox(bbox) {

  const res = {
    x: gl.canvas.clientWidth,
    y: gl.canvas.clientHeight
  }

  const dH = bbox.width * SCALE * gl.canvas.height / gl.canvas.width
  const dV = bbox.height * SCALE

  // center bbox in view
  let dZ = dV

  let dX = dispToValue(bbox.minX, SCALE, dZ)
  let dY = dispToValue(bbox.minY, SCALE, dZ)

  if (bbox.width >= bbox.height &&
    sceneToDeviceScalar(bbox.height, dH, SCALE, res) < res.y) {

    dZ = dH
    dX = dispToValue(bbox.minX, SCALE, dZ)

    const canvasSceneHeight = deviceToSceneScalar(res.y, dZ, SCALE, res)
    const centerY = (canvasSceneHeight - bbox.height) / 2

    dY = dispToValue(bbox.minY - centerY, SCALE, dZ)
  } else {
    const canvasSceneWidth = deviceToSceneScalar(res.x, dZ, SCALE, res)
    const centerX = (canvasSceneWidth - bbox.width) / 2

    dX = dispToValue(bbox.minX - centerX, SCALE, dZ)
  }

  const target = twgl.v3.create(dX, dY, dZ)

  dispatch(ACT.uiSetTarget(target))
  dispatch(ACT.uiTargetHome(true))
}

// TODO: debug this
export function zoomToFit() {
  dispatch(ACT.uiTargetHome(false))

  let pts = ptTree.all()

  if (state.scene.selected.length > 0) {
    pts = pts.filter(pt => state.scene.selected.includes(pt.pId))
  }

  const sceneBox = new PRIM.bbox({ pts, type: 'polyline', id: 'scene-box' })

  zoomToBbox(sceneBox)
}

export function screenshotDirect(_callback) {
  const callback = _callback ?? function (blob) {
    saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`)
  }
  // TODO: parameterize draw function to skip ui, grid
  draw()
  canvas.toBlob(callback)
}

// TODO: some day could provide an option to users:
// "You have started a drawing, would you like to continue working on it or clear the board?"
// https://stackoverflow.com/questions/23598471/how-do-i-clean-up-and-unload-a-webgl-canvas-context-from-gpu-after-use
export function cleanupWebGL() {
  dispatch(ACT.sceneClear())
  const loseContext = gl.getExtension('WEBGL_lose_context')
  if (loseContext) {
    loseContext.loseContext()
  }
}

function updateCtx(selDist) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.font = '14px Arial'

  let pixelPt = { x: 0, y: 0 }

  // let selDist = sceneDist();
  let dist = selDist.d
  let selPrim = selDist.sel

  pixelPt.x = (mPt[0] * (SCALE / dPt[2]) + dPt[0]) * resolution.y
  pixelPt.y = (mPt[1] * (SCALE / dPt[2]) + dPt[1]) * resolution.y

  // display current mouse pos
  ctx.fillStyle = 'black'
  let mPtString = (mPt[0] * SCALE / 2).toFixed(2) + '" x ' + (mPt[1] * SCALE / 2).toFixed(2) + '"'
  ctx.fillText('Dims: ' + mPtString, pixelPt.x + 12, pixelPt.y)

  if (typeof selPrim !== 'undefined' && dist < 0) {
    ctx.fillStyle = selPrim.idColHex
    ctx.fillText(selPrim.type + ': ' + selPrim.id, pixelPt.x + 12, pixelPt.y + 14)
  }
}

function sceneDist() {
  let dist = 1000
  let selPrim

  let mouse = {
    minX: mPt[0],
    maxX: mPt[0],
    minY: mPt[1],
    maxY: mPt[1],
  }

  let bboxSearch = bboxTree.search(mouse).map(b => b.id)

  let inMouse = state.scene.editItems.filter(i => bboxSearch.includes(i.id))

  for (let prim of inMouse) {

    if (prim.id === state.scene.editItem) continue

    let currDist = PRIM.distPrim(mPt, prim)

    if (currDist < dist) {
      selPrim = prim
      dist = currDist
    }
  }
  return { d: dist, sel: selPrim }
}

// Utilities --------------------------------------------------
const saveBlob = (function () {
  if (typeof window === 'undefined') return

  const a = document.createElement('a')
  document.body.appendChild(a)

  a.style.display = 'none'
  return function saveData(blob, fileName) {
    if (typeof window === 'undefined') return
    const url = window.URL.createObjectURL(blob)
    a.href = url
    a.download = fileName
    a.click()
  }
}())

// dims here need to be in pixel dimensions
export function saveWebGLTexture(img, dims) {
  let width = Math.floor(dims.width)
  let height = Math.floor(dims.height)

  const fbo = twgl.createFramebufferInfo(gl, [{
    attachment: img
  }], width, height)

  const data = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data)

  gl.deleteFramebuffer(fbo.framebuffer)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { colorSpace: 'display-p3' })

  const imageData = context.createImageData(width, height)
  imageData.data.set(data)
  context.putImageData(imageData, 0, 0)

  canvas.toBlob(blob => saveBlob(blob, 'webGLTexture.png'))
  canvas.remove()
}