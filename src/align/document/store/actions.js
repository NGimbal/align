//actions.js
'use strict'

// actions named with reducer_property
// action functions named with reducerProperty()

//ACTION TYPE CONSTANTS

//main types
export const scene = 'scene'
export const cursor = 'cursor'
export const ui = 'ui'
export const history = 'history'

//sub types

//HISTORY
export const HISTORY_UNDO = 'HISTORY_UNDO'
export const HISTORY_REDO = 'HISTORY_REDO'
export const HISTORY_PUSH = 'HISTORY_PUSH'

//UI 
export const UI_SNAPGRID = 'UI_SNAPGRID' //snap to grid
export const UI_SNAPPT = 'UI_SNAPPT'  //snap to points
export const UI_SNAPGLOBAL = 'UI_SNAPGLOBAL' //snap global angle
export const UI_SNAPREF = 'UI_SNAPREF' // snap reference angle
export const UI_TARGETHOME = 'UI_TARGETHOME' //return to origin rendering
export const UI_SETTARGET = 'UI_SETTARGET' //set target
export const UI_MODE = 'UI_MODE' //toggle show points
export const UI_DRAGGING = 'UI_DRAGGING' //dragging state
export const UI_DRAGSTART = 'UI_DRAGSTART' //start drag state
export const UI_BOXSELECT = 'UI_BOXSELECT' //set box select box

export const UI_GRIDTOGGLE = 'UI_GRIDTOGGLE' //toggle grid

// Not yet fully implemented
export const UI_SNAPDIST = 'UI_SNAPDIST' //set to distance
export const UI_SNAPDISTXVAL = 'UI_SNAPDISTXVAL' //set snap to distance in X
export const UI_SNAPDISTYVAL = 'UI_SNAPDISTYVAL' //set snap to distance in X

//CURSOR 
export const CURSOR_SET = 'CURSOR_SET'  //curr cursor position
export const CURSOR_GRIDSCALE = 'CURSOR_GRIDSCALE' //gridscale, int
export const CURSOR_GRID = 'CURSOR_GRID' //grid, vec

//SCENE 
export const SCENE_SETEDITITEM = 'SCENE_SETEDITITEM' //sets edit item
export const SCENE_ADDPT = 'SCENE_ADDPT' //add point(s) to scene
export const SCENE_PUSHMANY = 'SCENE_PUSHMANY'
export const SCENE_PUSHEDITITEM = 'SCENE_PUSHEDITITEM'
export const SCENE_RMVITEM = 'SCENE_RMVITEM' //remove item w/ id - must also remove points
export const SCENE_ESCITEM = 'SCENE_ESCITEM' // removes current edit prim and replaces with a new edit prim
export const SCENE_CLEAR = 'SCENE_CLEAR' //clear scene

//EDIT - under scene sub type for now because it all operates on scene state
export const EDIT_FILTER = 'EDIT_FILTER' //curr filter
export const EDIT_STROKE = 'EDIT_STROKE' //stroke color
export const EDIT_FILL = 'EDIT_FILL' //fill color
export const EDIT_WEIGHT = 'EDIT_WEIGHT' //stroke weight
export const EDIT_RADIUS = 'EDIT_RADIUS' //shape radius
export const EDIT_OPACITY = 'EDIT_OPACITY' //shape radius
export const EDIT_VISIBLE = 'EDIT_VISIBLE' //visibilty

export const EDIT_HOVERSET = 'EDIT_HOVERSET' // set current hover item
export const EDIT_HOVERCLR = 'EDIT_HOVERCLR' // set current hover item

export const EDIT_SETSEL = 'EDIT_SETSEL' //set selection state
export const EDIT_SELECTAPND = 'EDIT_SELECTAPND' //add selected item
export const EDIT_SELECTREPLACE = 'EDIT_SELECTREPLACE' //replaces selection
export const EDIT_SELECTRMV = 'EDIT_SELECTRMV' //Remove selected item
export const EDIT_SELECTCLR = 'EDIT_SELECTCLR' //clears selection
export const EDIT_TRANSLATE = 'EDIT_TRANSLATE' //translates edit object

//ACTION CREATORS
export function historyUndo() {
  return {
    type: history,
    subtype: HISTORY_UNDO
  }
}

export function historyRedo() {
  return {
    type: history,
    subtype: HISTORY_REDO
  }
}

export function historyPush(pastScene) {
  return {
    type: history,
    subtype: HISTORY_PUSH,
    pastScene
  }
}

// toggles the ui auto navigate to target
export function uiTargetHome(toggle) {
  return {
    type: ui,
    subtype: UI_TARGETHOME,
    toggle,
  }
}

// sets target to vec3
export function uiSetTarget(target) {
  return {
    type: ui,
    subtype: UI_SETTARGET,
    target,
  }
}

export function uiDragStart(toggle, pt) {
  return {
    type: ui,
    subtype: UI_DRAGSTART,
    toggle,
    pt,
  }
}

export function uiDragging(toggle) {
  return {
    type: ui,
    subtype: UI_DRAGGING,
    toggle,
  }
}

//
export function uiMode(mode) {
  return {
    type: ui,
    subtype: UI_MODE,
    mode,
  }
}

export function uiGridToggle(toggle) {
  return {
    type: ui,
    subtype: UI_GRIDTOGGLE,
    toggle,
  }
}

// 0 is off 1 is on
export function uiBoxSelect(vec2, int) {
  return {
    type: ui,
    subtype: UI_BOXSELECT,
    vec2,
    int
  }
}

export function uiSnapDist(toggle) {
  return {
    type: ui,
    subtype: UI_SNAPDIST,
    toggle
  }
}

export function uiSnapDistXVal(value) {
  return {
    type: ui,
    subtype: UI_SNAPDISTXVAL,
    value
  }
}

export function uiSnapDistYVal(value) {
  return {
    type: ui,
    subtype: UI_SNAPDISTYVAL,
    value
  }
}

//records cursor position
export function cursorSet(vec2) {
  return {
    type: cursor,
    subtype: CURSOR_SET,
    vec2
  }
}

//establishes grid offset
export function cursorGrid(scale) {
  return {
    type: cursor,
    subtype: CURSOR_GRID,
    scale
  }
}

//toggles snap to grid
export function uiSnapGrid() {
  return {
    type: ui,
    subtype: UI_SNAPGRID,
  }
}

//toggles snap to point
export function uiSnapPt() {
  return {
    type: ui,
    subtype: UI_SNAPPT,
  }
}

//toggles snap to global angle
export function uiSnapGlobal() {
  return {
    type: ui,
    subtype: UI_SNAPGLOBAL,
  }
}

//toggles snap to reference angle
export function uiSnapRef() {
  return {
    type: ui,
    subtype: UI_SNAPREF,
  }
}

//sets grid scale
export function cursorGridScale(int) {
  return {
    type: cursor,
    subtype: CURSOR_GRIDSCALE,
    int,
  }
}

//what is the current filter - string
export function editFilter(filter, id) {
  return {
    type: scene,
    subtype: EDIT_FILTER,
    filter,
    id,
  }
}

//what is the current stroke color - vec(r, g, b, a)
export function editStroke(hex, id) {
  return {
    type: scene,
    subtype: EDIT_STROKE,
    hex,
    id,
  }
}

//current fill color
export function editFill(hex, id) {
  return {
    type: scene,
    subtype: EDIT_FILL,
    hex,
    id
  }
}

//what is the current stroke weight int
export function editWeight(weight, id) {
  return {
    type: scene,
    subtype: EDIT_WEIGHT,
    weight,
    id,
  }
}

//what is the current shape radius int
export function editRadius(radius, id) {
  return {
    type: scene,
    subtype: EDIT_RADIUS,
    radius,
    id,
  }
}


//what is the current shape radius float
export function editOpacity(opacity, id) {
  return {
    type: scene,
    subtype: EDIT_OPACITY,
    opacity,
    id,
  }
}

//what is the current shape radius float
export function editVisible(toggle, id) {
  return {
    type: scene,
    subtype: EDIT_VISIBLE,
    toggle,
    id,
  }
}

// can only hover over a single item
export function editHoverSet(id) {
  return {
    type: scene,
    subtype: EDIT_HOVERSET,
    id,
  }
}

// can only hover over a single item
export function editHoverClr() {
  return {
    type: scene,
    subtype: EDIT_HOVERCLR,
  }
}
// append to array of selected items
// sel is an array
// might want to have different types of selection?
export function editSelectApnd(sel) {
  return {
    type: scene,
    subtype: EDIT_SELECTAPND,
    sel,
  }
}

export function editSelectReplace(sel) {
  return {
    type: scene,
    subtype: EDIT_SELECTREPLACE,
    sel,
  }
}

// array of selected items
// might want to have different types of selection?
export function editSelectRmv(sel) {
  return {
    type: scene,
    subtype: EDIT_SELECTRMV,
    sel,
  }
}

export function editSelectClr() {
  return {
    type: scene,
    subtype: EDIT_SELECTCLR,
  }
}

// export function editBbox(id, bbox) {
//   return {
//     type: scene,
//     subtype: EDIT_BBOX,
//     id,
//     bbox
//   }
// }

export function editTranslate(id, v3) {
  return {
    type: scene,
    subtype: EDIT_TRANSLATE,
    id,
    v3,
  }
}

export function setEditItem(editItem) {
  return {
    type: scene,
    subtype: SCENE_SETEDITITEM,
    editItem: editItem,
  }
}

//add point
export function sceneAddPt(pts, id) {
  return {
    type: scene,
    subtype: SCENE_ADDPT,
    pts,
    id
  }
}

//pushes new item onto scene - prim is type
export function scenePushMany(items) {
  return {
    type: scene,
    subtype: SCENE_PUSHMANY,
    items
  }
}


//pushes new item onto scene - prim is type
export function scenePushEditItem(prim, edit) {
  return {
    type: scene,
    subtype: SCENE_PUSHEDITITEM,
    prim,
    edit
  }
}


//removes item, must also remove points
export function sceneRmvItem(id) {
  return {
    type: scene,
    subtype: SCENE_RMVITEM,
    id
  }
}

export function sceneEscItem(id, newEditItem) {
  return {
    type: scene,
    subtype: SCENE_ESCITEM,
    id,
    newEditItem
  }
}

export function sceneClear() {
  return {
    type: scene,
    subtype: SCENE_CLEAR,
  }
}