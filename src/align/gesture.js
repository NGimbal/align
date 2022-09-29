'use strict'

import * as twgl from 'twgl.js'
import knn from 'rbush-knn'

import * as ACT from './document/store/actions.js'

import { gl, state, dispatch, resolution, mPt, dPt, ptTree, screenshotDirect, view } from './draw.js'

import { SCALE } from './constants'

import * as PRIM from './document/primitives'
import { deviceToScene } from './renderer/transformationUtils.ts'

// This is going to become an interaction manager that uses a simple event emitter
// some of this code will be moved to a client
// most of the UI modifier shit should be like events + event handlers
export class DrawUI {

  constructor() {
    // MODIFIERS
    // constructor(name, tag, keyCut, events, _pulse){
    // TODO: basically all this bs after keycut should just be a function that's called
    // I forget why all this nonsense was necessary
    let targetHome = new UIModifier('Return Home', 'view', 'h', { clck: () => dispatch(ACT.uiTargetHome(true)) })

    let screenshot = new UIModifier('Screenshot', 'export', 'l', { clck: screenshotDirect })

    let snapPt = new UIModifier('Snap Point', 'snap', 'p', { clck: () => dispatch(ACT.uiSnapPt()) })
    let snapRef = new UIModifier('Snap Ref', 'snap', 's', { clck: () => dispatch(ACT.uiSnapRef()) })
    let snapGlobal = new UIModifier('Snap Global', 'snap', 'Shift', { clck: () => dispatch(ACT.uiSnapGlobal()) })
    let snapGrid = new UIModifier('Snap Grid', 'snap', 'g', { clck: () => dispatch(ACT.uiSnapGrid()) })

    let endDraw = new UIModifier('End Draw', 'edit', 'Enter', { clck: endDrawClck })
    let escDraw = new UIModifier('Esc Draw', 'edit', 'Escape', { clck: escDrawClck })

    // hard cancel, clears selection
    let endSel = new UIModifier('End Sel', 'select', 'Escape', { clck: endSelClck })

    //MODES
    let drawMods = [targetHome, screenshot, snapGlobal, snapRef, snapGrid, snapPt, endDraw, escDraw]

    let selMods = [targetHome, screenshot, endSel]

    //if no drawing tools are selected, drawExit();
    let draw = new UIMode('draw', drawMods, { mv: drawMv, up: drawUp })
    let select = new UIMode('select', selMods, { mv: selMv, up: selUp, dwn: selDwn })

    //would like this to be kept track of in the redux store
    this.modes = [draw, select]

    document.querySelector('#canvas-container').addEventListener('mouseup', this.mouseUp.bind(this))
    document.querySelector('#canvas-container').addEventListener('mousedown', this.mouseDown.bind(this))
    document.querySelector('#canvas-container').addEventListener('mousemove', this.mouseMove.bind(this))

    //cntrl+z
    this.cntlPressed = false
    this.zPressed = false
    this.yPressed = false
    this.shiftPressed = false
    window.addEventListener('keyup', this.keyUp.bind(this))
    window.addEventListener('keydown', this.keyDown.bind(this))

    return this
  }

  // TODO: calling dispatch in the update function is causing updateDataStructures
  // to be called in the render loop which is inneficient and causing lag for larger
  // scenes during object translation.
  // only need to update bbox tree / pt tree on drag end
  update() {
    let mode = this.modes.find(a => a.name == state.ui.mode)

    if (!mode) return

    // TODO: disorienting when there is big delta between dPt[2] and taget[2]
    // desired behavior should be pan then zoom, or zoom then pan
    // really want to zoom to center, then pan to target position
    if (state.ui.targeting) {
      if (twgl.v3.distanceSq(state.ui.target, dPt) > 0.00001) {
        const xyDpt = twgl.v3.create(dPt[0], dPt[1], 0)
        const xyTarget = twgl.v3.create(state.ui.target[0], state.ui.target[1], 0)

        // attempt at pan then zoom
        // this is still weird because we're not zooming to the center
        if (twgl.v3.distanceSq(xyTarget, xyDpt) > 0.00001) {
          twgl.v3.lerp(xyDpt, xyTarget, 0.1, xyDpt)
          dPt[0] = xyDpt[0]
          dPt[1] = xyDpt[1]
        } else {
          twgl.v3.lerp(dPt, state.ui.target, 0.1, dPt)
        }

        // attempt at zoom then pan
        // if (Math.abs(dPt[2] - state.ui.target[2]) > 5) {
        //   dPt[2] = lerpScalar(dPt[2], state.ui.target[2], 0.1);
        // } else {
        //   twgl.v3.lerp(dPt, state.ui.target, 0.1, dPt);
        // }

        // everything all at once
        // twgl.v3.lerp(dPt, state.ui.target, 0.1, dPt);

        // TODO: consider whether view should be in redux store
        view.minX = (0.0 - dPt[0]) / (SCALE / dPt[2])
        view.minY = (0.0 - dPt[1]) / (SCALE / dPt[2])
        view.maxX = ((resolution.x / resolution.y) - dPt[0]) / (SCALE / dPt[2])
        view.maxY = (1.0 - dPt[1]) / (SCALE / dPt[2])

      } else {
        dispatch(ACT.uiTargetHome(false))
      }
    }

    // I don't know where the right place for this is... yet
    if (state.ui.mode === 'select' && state.ui.dragging) {
      for (let id of state.scene.selected) {
        if (id === state.scene.editItem) continue

        let mouse = twgl.v3.copy(mPt)

        let translate = twgl.v3.subtract(mouse, state.ui.dragOrigin)

        // TODO: so this is being called repeatedly in quick succession while prim is being dragged
        // need to debounce this, and maybe apply translation to the glyph only, then later apply to the primitive?
        dispatch(ACT.editTranslate(id, translate))
      }
      // TODO: maybe this could be private to this class, not necessarily in store
      // this is like a "prevPos" while dragging
      dispatch(ACT.uiDragStart(true, twgl.v3.copy(mPt)))
    }

    for (let m of mode.modifiers) {
      //each update will deal with m.toggle on an individual basis
      if (m.update) {
        m.update()
      }
    }
  }

  mouseUp(e) {
    let mode = this.modes.find(a => a.name == state.ui.mode)

    if (!mode.up) return

    mode.up(e)
  }

  mouseDown(e) {
    let mode = this.modes.find(a => a.name == state.ui.mode)

    if (!mode.dwn) return

    mode.dwn(e)
  }

  mouseMove(e) {
    // record mouse position
    let canvas = gl.canvas
    let rect = canvas.getBoundingClientRect()

    const device = twgl.v3.create(
      e.clientX - rect.left,
      e.clientY - rect.top,
      0
    )

    const scene = deviceToScene(
      device,
      dPt,
      SCALE,
      resolution,
    )

    const editItem = state.scene.editItems.find(item => item.id === state.scene.editItem)

    const pos = calcMousePosition(
      { x: scene[0], y: scene[1] },
      editItem,
      state.cursor,
      state.ui
    )

    mPt[0] = pos.x
    mPt[1] = pos.y

    // get mode
    let mode = this.modes.find(a => a.name == state.ui.mode)
    if (!mode.up) return

    mode.mv(e)
  }

  keyUp(e) {
    if (document.activeElement.tagName !== 'BODY') return

    let key = e.key
    let mode = this.modes.find(a => a.name == state.ui.mode)

    // console.log(key)
    // console.log(mode)

    if (key === 'Shift') this.shiftPressed = false
    if (key === 'Meta') this.cntlPressed = false
    if (key === 'Control') this.cntlPressed = false

    if (key === 'Backspace' && state.scene.selected.length > 0) {
      dispatch(ACT.sceneRmvItem(state.scene.selected))
    }

    for (let m of mode.modifiers) {
      if (m.keyCut == key) {
        m.clck()
      }
    }
  }

  keyDown(e) {
    if (document.activeElement.tagName !== 'BODY') return

    let key = e.key

    if (key == 'Meta') this.cntlPressed = true
    if (key == 'Shift') this.shiftPressed = true
    if (key == 'Control') this.cntlPressed = true

    if ((key === 'z' || key === 'Z') && this.shiftPressed && this.cntlPressed) {
      dispatch(ACT.historyRedo())
    } else if ((key === 'z' || key === 'Z') && this.cntlPressed) {
      dispatch(ACT.historyUndo())
    }
  }
}

function drawMv(e) {

  for (let m of this.modifiers) {
    if (!m.mv) continue
    m.mv(e, this.options)
  }
  return
}

function drawUp(e) {
  for (let m of this.modifiers) {
    if (!m.up) continue
    let modState = m.up(e)
    if (!modState) continue
  }

  const pt = new PRIM.vec(mPt[0], mPt[1], mPt[2] ?? 0, 0, state.scene.editItem)

  dispatch(ACT.sceneAddPt([pt], state.scene.editItem))
  dispatch(ACT.historyPush(state.scene))

  let currItem = state.scene.editItems.find(item => item.id === state.scene.editItem)

  if ((currItem.type == 'circle' || currItem.type == 'ellipse' || currItem.type == 'rectangle') && currItem.pts.length == 2) {
    let newPrim = new PRIM.prim(currItem.type, [], { ...currItem.properties })

    dispatch(ACT.scenePushEditItem(newPrim))
    dispatch(ACT.editSelectRmv(currItem.id))
    dispatch(ACT.historyPush(state.scene))
  }

  return
}

// function endSelClck() {
//   this.toggle = true;
// }

function endSelClck() {
  // if (!this.toggle) return null;
  dispatch(ACT.uiMode('draw'))
  dispatch(ACT.editSelectClr())
  // this.toggle = false;
}

function selUp(e) {
  if (state.ui.dragging) {

    dispatch(ACT.uiDragStart(false, mPt))
    dispatch(ACT.uiDragging(false))

    if (state.scene.selected.includes(state.scene.hover)) {
      dispatch(ACT.editSelectRmv(state.scene.hover))
    }
    // push state to history post drag
    // dispatch(ACT.historyPush(state.scene));
  } else if (state.ui.dragStart) {

    dispatch(ACT.uiDragStart(false, mPt))

  }
  dispatch(ACT.uiBoxSelect(mPt, 0))
}

function selDwn(e) {
  if (state.scene.hover !== '') {
    dispatch(ACT.uiDragStart(true, mPt))
    dispatch(ACT.editSelectApnd([state.scene.hover]))
  } else {
    dispatch(ACT.uiBoxSelect(mPt, 1))
  }
}

function selMv() {
  if (state.ui.dragStart && !state.ui.dragging) {
    dispatch(ACT.uiDragging(true))
    // push scene state to history before drag
    dispatch(ACT.historyPush(state.scene))
  }

  if (state.ui.boxSelectState) {
    let selBox = {
      minX: Math.min(state.ui.boxSel[0], mPt[0]),
      maxX: Math.max(state.ui.boxSel[0], mPt[0]),
      minY: Math.min(state.ui.boxSel[1], mPt[1]),
      maxY: Math.max(state.ui.boxSel[1], mPt[1]),
    }

    let boxSel = ptTree.search(selBox).reduce((prev, curr, index, array) => {
      if (!prev.includes(curr.pId)) {
        return [...prev, curr.pId]
      } else {
        return prev
      }
    }, [])

    dispatch(ACT.editSelectReplace(boxSel))
  }
}

function calcMousePosition(evPt, editItem, state, snaps) {
  let pt = { x: evPt.x, y: evPt.y }

  let editPts = editItem ? editItem.pts : []

  if (snaps.snapRef && editPts.length > 1) {
    pt = snapToRelativeAngle(
      { x: evPt.x, y: evPt.y },
      editPts.slice(editPts.length - 2),
      snaps.snapRefAngle
    )
  }

  if (snaps.snapGlobal && editPts.length > 0) {
    pt = snapToGlobalAngle(
      { x: evPt.x, y: evPt.y },
      editPts[editPts.length - 1],
      snaps.snapGlobalAngle
    )
  }

  if (snaps.snapGrid) {
    pt = snapToGrid({ x: evPt.x, y: evPt.y }, state.grid)
  }

  if (snaps.snapPt) {
    const snapPt = snapToPt({ x: evPt.x, y: evPt.y })
    if (snapPt) {
      pt = snapPt
    }
  }

  return pt
}

const snapToPt = (pt) => {
  let ptNear = knn(ptTree, pt.x, pt.y, 1, undefined, 0.01)

  return ptNear.length > 0 ? ptNear[0] : false
}

const snapToGrid = (pt, { x: gridX, y: gridY }) => {
  pt.x = Math.round(pt.x / gridX) * gridX + 0.000000000000000001
  pt.y = Math.round(pt.y / gridY) * gridY + 0.000000000000000001

  return pt
}

const snapToGlobalAngle = (pt, prev, globalAngle) => {
  let line = PRIM.cloneVec(prev)

  line.x = line.x - pt.x
  line.y = line.y - pt.y

  let angle = PRIM.angleVec(line) * (180 / Math.PI)
  let snapA = (Math.round(angle / globalAngle) * globalAngle)
  snapA = (snapA * (Math.PI / 180))

  //length
  let length = PRIM.lengthVec(line)
  pt.x = prev.x - length * Math.cos(snapA)
  pt.y = prev.y - length * Math.sin(snapA)

  return pt
}

const snapToRelativeAngle = (pt, [prevPrev, prev], relativeAngle) => {

  let line = PRIM.cloneVec(prev)
  let linePrev = PRIM.cloneVec(prevPrev)

  //current line
  line.x = line.x - pt.x
  line.y = line.y - pt.y
  let lineN = PRIM.normVec(line)

  //previous line
  linePrev.x = prev.x - linePrev.x
  linePrev.y = prev.y - linePrev.y
  let linePrevN = PRIM.normVec(linePrev)

  //angle between two lines
  let dot = PRIM.dotVec(lineN, linePrevN)
  let det = linePrevN.x * lineN.y - linePrevN.y * lineN.x
  let angle = Math.atan2(det, dot) * (180 / Math.PI)
  //snap angle
  let snapA = Math.round(angle / relativeAngle) * relativeAngle
  snapA = snapA * (Math.PI / 180) + PRIM.angleVec(linePrev)

  pt.x = prev.x - (PRIM.lengthVec(line) * Math.cos(snapA))
  pt.y = prev.y - (PRIM.lengthVec(line) * Math.sin(snapA))

  return pt
}

//---SELECT----------------------------
function endDrawClck() {

  let currItem = state.scene.editItems.find(item => item.id === state.scene.editItem)

  if (currItem.pts.length < 1) {
    dispatch(ACT.uiMode('select'))
    return
  }

  let newPrim = new PRIM.prim(currItem.type, [], { ...currItem.properties })

  dispatch(ACT.editSelectRmv(currItem.id))
  dispatch(ACT.scenePushEditItem(newPrim))
  dispatch(ACT.historyPush(state.scene))

  return
}

function escDrawClck() {

  let id = state.scene.editItem
  let currItem = state.scene.editItems.find(i => i.id === id)

  let props = { ...currItem.properties }
  let newPrim = new PRIM.prim(currItem.type, [], props)

  dispatch(ACT.sceneEscItem(id, newPrim))
  dispatch(ACT.historyPush(state.scene))

  // this.toggle = false;
  return
}

// Deletes item in editItems at index
export function deleteItem(id) {

  //rmvItem now removes all pts as well
  dispatch(ACT.sceneRmvItem(id))
  dispatch(ACT.historyPush(state.scene))

  return true
}

//modes are collections of UIModifiers
class UIMode {

  constructor(name, modifiers, _events, _options) {
    this.name = name
    this.modifiers = modifiers
    // this.toggle = true;

    //these should basically all be defined for every mode
    if (_events.mv) this.mv = _events.mv
    if (_events.up) this.up = _events.up
    if (_events.dwn) this.dwn = _events.dwn
    if (_events.scrll) this.scrll = _events.scrll

    this.options = _options || { factor: 1.0 }
  }
}

//simple class to hold modifiers
class UIModifier {
  //clck
  constructor(name, tag, keyCut, events, _pulse) {
    this.name = name
    //tag e.g. snap, edit, view, export
    this.tag = tag
    this.keyCut = keyCut

    // this.toggle = false;
    //whether this modifier's move function should be called on move or onUpdate
    if (events.update) {
      this.update = events.update
    }
    if (events.clck) {
      this.clck = events.clck.bind(this)
    }
    if (events.mv) {
      this.mv = events.mv.bind(this)
    }
    if (events.up) {
      this.up = events.up.bind(this)
    }
    if (events.dwn) {
      this.dwn = events.dwn.bind(this)
    }
    if (events.scrll) {
      this.scrll = events.scrll.bind(this)
    }

    if (typeof _pulse == 'boolean') {
      this.pulse = _pulse
    } else {
      this.pulse = false
    }
  }
}