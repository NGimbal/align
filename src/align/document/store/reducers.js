//reducers
'use strict'

import * as PRIM from '../primitives.js'
import * as ACT from './actions.js'
import * as twgl from 'twgl.js'

// history only stores state.scene history
// should cover everything we want to keep history of
// will be set explicitly by the history reducer
export const historyInit = {
  past: [],
  future: [],
}

export const uiInit = {
  dragging: false,
  dragStart: false,
  dragOrigin: twgl.v3.create(),
  targeting: false, //are we moving the view towards a target
  target: twgl.v3.create(0, 0, 64), //where the view is moving
  mode: 'draw',
  boxSel: twgl.v3.create(0), // box select pt A
  boxSelectState: 0, // 0 is off, 1 is on
  snapPt: false,
  snapGlobal: false,
  snapGlobalAngle: 45,
  snapGrid: false,
  snapRef: false,
  snapRefAngle: 15,
  snapDist: false,
  snapDistXVal: 1,
  snapDistYVal: 1,
  showGrid: true,
}

const cursorInit = {
  pos: new PRIM.vec(0, 0),
  grid: new PRIM.vec(0, 0, 0, 0),
  scale: 64,
}

export const sceneInit = {
  editItem: '',
  editItems: [],
  hover: {},
  selected: [],
}

export const initialState = {
  ui: uiInit,
  cursor: cursorInit,
  scene: sceneInit,
  history: historyInit,
}

function ui(_state = initialState, action) {
  let state = _state.ui
  switch (action.subtype) {
    case ACT.UI_SNAPDIST:
      return Object.assign({}, state, {
        snapDist: !action.toggle
      })
    case ACT.UI_SNAPDISTXVAL:
      return Object.assign({}, state, {
        snapDistXVal: action.value
      })
    case ACT.UI_SNAPDISTYVAL:
      return Object.assign({}, state, {
        snapDistYVal: action.value
      })
    case ACT.UI_SNAPGLOBAL:
      return Object.assign({}, state, {
        snapGlobal: !state.snapGlobal
      })
    case ACT.UI_SNAPREF:
      return Object.assign({}, state, {
        snapRef: !state.snapRef
      })
    case ACT.UI_SNAPGRID:
      return Object.assign({}, state, {
        snapGrid: !state.snapGrid
      })
    case ACT.UI_SNAPPT:
      return Object.assign({}, state, {
        snapPt: !state.snapPt
      })
    case ACT.UI_TARGETHOME:
      return Object.assign({}, state, {
        targeting: action.toggle,
      })
    case ACT.UI_SETTARGET:
      return Object.assign({}, state, {
        target: action.target,
      })
    case ACT.UI_MODE:
      return Object.assign({}, state, {
        mode: action.mode
      })
    case ACT.UI_DRAGGING:
      return Object.assign({}, state, {
        dragging: action.toggle
      })
    case ACT.UI_DRAGSTART:
      return Object.assign({}, state, {
        dragStart: action.toggle,
        dragOrigin: twgl.v3.copy(action.pt),
      })
    case ACT.UI_BOXSELECT:
      return Object.assign({}, state, {
        boxSel: twgl.v3.copy(action.vec2),
        boxSelectState: action.int,
      })
    case ACT.UI_GRIDTOGGLE:
      return Object.assign({}, state, {
        showGrid: action.toggle
      })
    default:
      return state
  }
}

//state related to a user's view
function cursor(_state = initialState, action) {
  let state = _state.cursor

  switch (action.subtype) {
    case ACT.CURSOR_GRIDSCALE:
      return Object.assign({}, state, {
        scale: action.int
      })
    case ACT.CURSOR_GRID:
      return Object.assign({}, state, {
        grid: {
          x: 2.0 / action.scale,
          y: 2.0 / action.scale,
          z: action.scale,
          w: (2.0 / action.scale) * 0.1
        }
      })
    default:
      return state
  }
}

//state related to the scene
function scene(_state = initialState, action) {
  let state = _state.scene
  switch (action.subtype) {
    case ACT.SCENE_SETEDITITEM:
      return Object.assign({}, state, {
        editItem: action.editItem
      })
    case ACT.SCENE_ADDPT:
      return Object.assign({}, state, {
        editItems: state.editItems.map(item => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            pts: [...item.pts, ...action.pts]
          })
        }),
      })
    // TODO: make adding edit item optional
    // TODO: Also want a action for bulk adding prims
    case ACT.SCENE_PUSHMANY: //takes prim type, appends to edit items and sel array
      return Object.assign({}, state, {
        editItems: [...state.editItems, ...action.items], //not sure if we need to set update here
      })
    // TODO: make adding edit item optional
    // TODO: Also want a action for bulk adding prims
    case ACT.SCENE_PUSHEDITITEM: //takes prim type, appends to edit items and sel array
      return Object.assign({}, state, {
        editItems: [...state.editItems, { ...action.prim }], //not sure if we need to set update here
        editItem: typeof action.edit === 'string' ? action.edit.slice() : action.prim.id.slice(),
      })
    case ACT.SCENE_RMVITEM:
      return Object.assign({}, state, {
        editItems: state.editItems.filter(i => !(action.id.includes(i.id))),
        selected: state.selected.filter(i => !(action.id.includes(i.id)))
      })
    case ACT.SCENE_ESCITEM:
      return Object.assign({}, state, {
        editItem: action.newEditItem.id.slice(),
        editItems: state.editItems.map(i => {
          if (i.id !== action.id) return { ...i }
          return { ...action.newEditItem }
        }),
        selected: state.selected.map(i => {
          if (i !== action.id) return i.slice()
          return action.newEditItem.id.slice()
        })
      })
    case ACT.SCENE_CLEAR:
      return Object.assign({}, state, {
        editItems: [],
        editItem: '',
        selected: []
      })
    case ACT.EDIT_WEIGHT:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, weight: action.weight }
          })
        }),
      })
    case ACT.EDIT_RADIUS:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, radius: action.radius }
          })
        }),
      })
    case ACT.EDIT_OPACITY:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, opacity: action.opacity }
          })
        }),
      })
    case ACT.EDIT_VISIBLE:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, visible: action.toggle }
          })
        }),
      })
    case ACT.EDIT_FILL:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, fill: action.hex }
          })
        }),
      })
    case ACT.EDIT_STROKE:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, stroke: action.hex.slice() }
          })
        }),
      })
    case ACT.EDIT_SETSEL:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, sel: action.state }
          })
        }),
      })
    case ACT.EDIT_FILTER:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          return Object.assign({}, item, {
            properties: { ...item.properties, filter: action.filter }
          })
        }),
      })
    case ACT.EDIT_HOVERSET:
      return Object.assign({}, state, {
        hover: action.id.slice()
      })
    case ACT.EDIT_HOVERCLR:
      return Object.assign({}, state, {
        hover: ''
      })
    // Selection array
    case ACT.EDIT_SELECTAPND:
      let sel = [...state.selected, ...action.sel]
      return Object.assign({}, state, {
        selected: sel.filter((id, i) => sel.indexOf(id) === i)
      })
    // Selection array
    case ACT.EDIT_SELECTREPLACE:
      return Object.assign({}, state, {
        selected: [...action.sel]
      })
    // Selection array
    case ACT.EDIT_SELECTRMV:
      return Object.assign({}, state, {
        selected: state.selected.filter(item => item !== action.sel)
      })
    // Selection array
    case ACT.EDIT_SELECTCLR:
      return Object.assign({}, state, {
        selected: []
      })
    case ACT.EDIT_TRANSLATE:
      return Object.assign({}, state, {
        editItems: state.editItems.map((item) => {
          if (item.id !== action.id) return { ...item }
          const translate = twgl.v3.add(item.translate, action.v3, twgl.v3.create())
          return Object.assign({}, item, {
            translate,
          })
        }),
      })
    default:
      return state
  }
}


function history(_state = initialState, action) {
  const state = {
    scene: _state.scene,
    history: _state.history,
  }
  switch (action.subtype) {
    case ACT.HISTORY_UNDO: {
      const past = state.history.past.map(i => ({ ...i }))
      const scene = { ...past.pop() }
      if (Object.keys(scene).length <= 0) return {}
      return Object.assign({}, state, {
        scene,
        history: {
          future: [...state.history.future.map(i => ({ ...i })), { ...state.scene }],
          past
        }
      })
    }
    case ACT.HISTORY_REDO: {
      const future = state.history.future.map(i => ({ ...i }))
      const scene = { ...future.pop() }
      if (Object.keys(scene).length <= 0) return {}
      return Object.assign({}, state, {
        scene,
        history: {
          future,
          past: [...state.history.past.map(i => ({ ...i })), { ...state.scene }]
        }
      })
    }
    case ACT.HISTORY_PUSH:
      return {
        history: {
          past: [..._state.history.past.map(i => ({ ...i })), { ...action.pastScene }],
          future: [],
        }
      }
    default:
      return state
  }
}

export const reducer = function (state = initialState, action) {
  if (!state) {
    console.error('Reducer got null state. Should be initialized')
    return initialState
  }
  switch (action.type) {
    case ACT.status:
      return Object.assign({}, state, {
        status: status(state, action),
      })
    case ACT.cursor:
      return Object.assign({}, state, {
        cursor: cursor(state, action),
      })
    case ACT.ui:
      return Object.assign({}, state, {
        ui: ui(state, action),
      })
    case ACT.scene:
      return Object.assign({}, state, {
        scene: scene(state, action),
      })
    // undo / redo return { state, history }
    // push returns { history }
    case ACT.history: {
      return Object.assign({}, state,
        history(state, action),
      )
    } default:
      return state
  }
}

//Immutable pattern helpers
// insert action.arry at action.index
function insertItem(array, action) {
  let newArray = array.slice()
  newArray.splice(action.index, 0, action.item)
  return newArray
}

function appendItem(array, item) {
  let newArray = array.slice()
  newArray.splice(array.length, 0, item)
  return newArray
}

// remove array[action.index]
function removeItem(array, index) {
  return array.filter((item, i) => i !== index)
}

// set array[action.index] equal to action.item
function updateItem(array, action) {
  // want to also be able to update by key
  // let actIndex = action.index || array.findIndex((, i, arr) => action.key
  return array.map((item, index) => {
    if (index !== action.index) {
      // This isn't the item we care about - keep it as-is
      return item
    }

    // Otherwise, this is the one we want - return an updated value
    return {
      ...item,
      ...action.item
    }
  })
}