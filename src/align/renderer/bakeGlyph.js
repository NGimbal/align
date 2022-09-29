//bakePrim.js
'use strict'

// TODO: I think it'd be reasonable to refactor SDFUI out of this file
import * as SDFUI from '../draw.js'

import * as GLYPH from './glyph.js'; 64

// could also get frag stub here
export function bake(glyph) {
  const prim = SDFUI.state.scene.editItems.find(e => e.id === glyph.id)
  switch (glyph.primType) {
    case 'polyline':
      return polyLine(prim, glyph)
    case 'polygon':
      return polygon(prim, glyph)
    case 'circle':
      return circleCall(prim, glyph)
    case 'ellipse':
      return ellipseCall(prim, glyph)
    case 'rectangle':
      return rectangleCall(prim, glyph)
    case 'img':
      console.log('bake glyph should not be called on an img prim.')
      return
    case 'pointlight':
      console.log('bake pointlight not yet implemented.')
      return
    default:
      return polyLine(prim, glyph)
  }
}

//POLYLINE-------------------------------------------------------
//takes prim and layer and bakes as a polyline
function polyLine(prim, glyph) {
  let shader = GLYPH.getFragStub(prim.type, false)
  let parameters = glyph.uniforms.u_eTex

  //every layer gets its own parameters texture
  shader = polyLineFunc(prim, shader, parameters)
  shader = polyLineCall(prim, shader)

  //need to recompile layer program
  //probably after returning the compiled shader
  return shader
}

//prim is the shape
function polyLineFunc(prim, shader, parameters) {
  //insert new function
  let insString = '//$INSERT FUNCTION$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  // if function exists start and end should be before beginning and after end
  let exFuncStr = '//$START-' + prim.id.substr(0, 7)

  let exFuncIndex = shader.indexOf(exFuncStr)

  //if function exists
  if (exFuncIndex >= 0) {
    startShader = shader.slice(0, exFuncIndex)

    let postFuncStr = '//$END-' + prim.id.substr(0, 7)
    let postIndex = shader.indexOf(postFuncStr)
    postIndex += postFuncStr.length
    endShader = shader.slice(postIndex)
  }

  //create function
  let posString = '\n'
  posString += '//$START-' + prim.id.substr(0, 7) + '\n'

  // p is a translation for polyLine
  posString += 'vec4 ' + 'pline' + prim.id.substr(0, 7) + '(vec2 uv, vec2 p) {'

  posString += '\n\tvec2 tUv = uv - p;'

  let indexX = 0
  let indexY = 0

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize))
  let dataSize = parameters.dataSize

  for (let cTexel = 0; cTexel < prim.pts.length; cTexel++) {
    if (cTexel == 0) {
      indexX = (cTexel % dataSize) / dataSize + texelOffset
      indexY = (Math.floor(cTexel / dataSize)) / dataSize + texelOffset
      posString += '\n\tvec3 finalColor = vec3(1.0);'
      posString += '\n\tvec2 pos = vec2(0.0);'
      posString += '\n\tfloat d = 0.0;'
      posString += '\n\tfloat accumD = 100.0;'
      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');'
      posString += '\n\tvec2 oldPos = texture(u_eTex, index).xy;'
      continue
    } else {
      indexX = (cTexel % dataSize) / dataSize + texelOffset
      indexY = (Math.floor(cTexel / dataSize)) / dataSize + texelOffset

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');'
      posString += '\n\tpos = texture(u_eTex, index).xy;'
      posString += '\n\td = sdLine(tUv, oldPos, pos, u_weight, 0.0);'
      posString += '\n\taccumD = min(accumD, d);'
      posString += '\n\toldPos = pos;'
    }
  }

  posString += '\n\tfinalColor = mix(finalColor, u_stroke, line(accumD, u_weight, u_dPt.z));'
  posString += '\n\treturn vec4(finalColor, accumD);'
  posString += '\n}\n'
  posString += '//$END-' + prim.id.substr(0, 7) + '\n'

  startShader += posString

  let fragShader = startShader + endShader

  return fragShader
}

//creates function call for prim specific function
function polyLineCall(prim, shader) {

  let insString = '//$INSERT CALL$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  //create function
  let posString = '\n'

  posString += '\t colDist = ' + 'pline' + prim.id.substr(0, 7) + '(uv, vec2(0.0, 0.0));\n'
  startShader += posString

  let fragShader = startShader + endShader

  return fragShader
}

//POLYLINE-------------------------------------------------------

//POLYGON--------------------------------------------------------
//takes prim and layer and bakes as a polyline
function polygon(prim, glpyh) {
  let shader = GLYPH.getFragStub(prim.type, false)
  let parameters = glpyh.uniforms.u_eTex

  shader = polygonFunc(prim, shader, parameters)
  shader = polygonCall(prim, shader)

  //need to recompile layer program after returning the compiled shader
  return shader
}

//creates function call that draws prim as a polygon
function polygonFunc(prim, shader, parameters) {

  //insert new function
  let insString = '//$INSERT FUNCTION$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  // if function exists start and end should be before beginning and after end
  let exFuncStr = '//$START-' + prim.id.substr(0, 7)

  let exFuncIndex = shader.indexOf(exFuncStr)

  //if function exists
  if (exFuncIndex >= 0) {
    startShader = shader.slice(0, exFuncIndex)

    let postFuncStr = '//$END-' + prim.id.substr(0, 7)
    let postIndex = shader.indexOf(postFuncStr)
    postIndex += postFuncStr.length
    endShader = shader.slice(postIndex)
  }

  //create function
  let posString = '\n'
  posString += '//$START-' + prim.id.substr(0, 7) + '\n'

  let indexX = 0
  let indexY = 0

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize))
  let dataSize = parameters.dataSize

  // p is a translation for polygon
  posString += 'vec4 ' + 'pgon' + prim.id.substr(0, 7) + '(vec2 uv, vec2 p) {'

  posString += '\n\tvec2 tUv = uv - p;\n'

  let cTexel = 0
  for (let _p of prim.pts) {

    if (cTexel == 0) {
      indexX = (cTexel % dataSize) / dataSize + texelOffset
      indexY = (Math.floor(cTexel / dataSize)) / dataSize + texelOffset

      posString += '\n\tvec2 pos = vec2(0.0);'
      posString += '\n\tfloat accumD = 100.0;'

      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');\n'

      posString += '\tvec2 first = texture(u_eTex, index).xy;\n'

      //last point
      indexX = (parameters.cTexel % dataSize) / dataSize + texelOffset
      indexY = (Math.floor(parameters.cTexel / dataSize)) / dataSize + texelOffset
      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n'
      posString += '\tvec2 last = texture(u_eTex, index).xy;\n'

      posString += '\tfloat d = dot(tUv - first, tUv - first);\n'

      posString += '\tfloat s = 1.0;\n'
      posString += '\tvec2 oldPos = first;\n'
      posString += '\tvec2 e = last - first;\n'
      posString += '\tvec2 w = tUv - first;\n'
      posString += '\tvec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n'
      posString += '\td = min(d, dot(b,b));\n'
      // winding number from http://geomalgorithms.com/a03-_inclusion.html
      posString += '\tbvec3 cond = bvec3( tUv.y>=first.y, tUv.y<last.y, e.x*w.y>e.y*w.x );\n'
      posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n'

      cTexel++
      continue
    } else {
      indexX = (cTexel % dataSize) / dataSize + texelOffset
      indexY = (Math.floor(cTexel / dataSize)) / dataSize + texelOffset

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n'
      posString += '\tpos = texture(u_eTex, index).xy;\n'
      posString += '\te = oldPos - pos;\n'
      posString += '\tw = tUv - pos;\n'
      posString += '\tb = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n'
      posString += '\td = min(d, dot(b,b));\n'
      // winding number from http://geomalgorithms.com/a03-_inclusion.html
      posString += '\tcond = bvec3( tUv.y>=pos.y, tUv.y<oldPos.y, e.x*w.y>e.y*w.x );\n'
      posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n'
      posString += '\toldPos = pos;\n'

      cTexel++
    }
  }

  posString += '\td = s*sqrt(d);\n'
  posString += '\treturn vec4(d);\n'

  posString += '\n}\n'
  posString += '//$END-' + prim.id.substr(0, 7) + '\n'

  startShader += posString
  let fragShader = startShader + endShader

  return fragShader
}

//creates function calls that draws prim as a polygon
function polygonCall(prim, shader) {

  let insString = '//$INSERT CALL$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  //create function
  let posString = '\n'

  posString += '\t colDist = ' + 'pgon' + prim.id.substr(0, 7) + ' (uv, vec2(0., 0.));\n'
  startShader += posString

  let fragShader = startShader + endShader

  return fragShader
}

//POLYGON--------------------------------------------------------

//CIRCLE---------------------------------------------------------
//creates function call that draws prim - circle
export function circleCall(prim, glyph) {
  let shader = GLYPH.getFragStub(prim.type, false)
  let parameters = glyph.uniforms.u_eTex
  let dataSize = glyph.uniforms.u_eTex.dataSize

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize))

  let insString = '//$INSERT CALL$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  //create function call
  let posString = '\n'

  let indexX = (0 % dataSize) / dataSize + texelOffset
  let indexY = (Math.floor(0 / dataSize)) / dataSize + texelOffset

  posString += '\tvec2 pos = vec2(' + indexX + ', ' + indexY + ');\n'

  indexX = (1. % dataSize) / dataSize + texelOffset
  indexY = (Math.floor(1. / dataSize)) / dataSize + texelOffset

  posString += '\tvec2 rad = vec2(' + indexX + ', ' + indexY + ');\n'

  posString += '\tfloat radius = distance(texture(u_eTex, pos).xy, texture(u_eTex, rad).xy);\n'
  posString += '\td = sdCircle(uv - vec2(0., 0.), texture(u_eTex, pos).xy, radius);\n'
  posString += '\tfloat stroke = line(d, u_weight, u_dPt.z);\n'
  posString += '\tvec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);\n'
  posString += '\tfloat fill = fillMask(d);'
  posString += '\tvec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);\n'
  posString += '\td = min(stroke, fill);\n'
  posString += '\tif ( d > 1.) discard;\n'
  posString += '\toutColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);\n'

  startShader += posString
  let fragShader = startShader + endShader

  // console.log(posString);

  return fragShader
}
//CIRCLE-------------------------------------------------------------------

//ELLIPSE---------------------------------------------------------
//creates function call that draws prim - circle
export function ellipseCall(prim, glyph) {
  let shader = GLYPH.getFragStub(prim.type, false)
  let parameters = glyph.uniforms.u_eTex
  let dataSize = glyph.uniforms.u_eTex.dataSize

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize))

  let insString = '//$INSERT CALL$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  //create function call
  let posString = '\n'

  let indexX = (0 % dataSize) / dataSize + texelOffset
  let indexY = (Math.floor(0 / dataSize)) / dataSize + texelOffset

  posString += '\tvec2 cIndex = vec2(' + indexX + ', ' + indexY + ');\n'

  indexX = (1. % dataSize) / dataSize + texelOffset
  indexY = (Math.floor(1. / dataSize)) / dataSize + texelOffset

  posString += '\tvec2 dIndex = vec2(' + indexX + ', ' + indexY + ');\n'

  posString += '\tvec2 center = texture(u_eTex, cIndex).xy;\n'
  posString += '\tvec2 dims = texture(u_eTex, dIndex).xy;\n'
  posString += '\td = sdEllipse(uv - vec2(0., 0.) - center, max(abs(dims - center), vec2(0.01,0.01)));\n'
  posString += '\tfloat stroke = line(d, u_weight, u_dPt.z);\n'
  posString += '\tvec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);\n'
  posString += '\tfloat fill = fillMask(d);'
  posString += '\tvec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);\n'
  posString += '\td = min(stroke, fill);\n'
  // posString += '\tif ( d > 1.) discard;\n';
  posString += '\toutColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);\n'

  startShader += posString
  let fragShader = startShader + endShader

  return fragShader
}
//EllIPSE-------------------------------------------------------------------


//RECTANGLE---------------------------------------------------------
//creates function call that draws prim - circle
export function rectangleCall(prim, glyph) {
  let shader = GLYPH.getFragStub(prim.type, false)
  let parameters = glyph.uniforms.u_eTex
  let dataSize = glyph.uniforms.u_eTex.dataSize

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize))

  let insString = '//$INSERT CALL$------'
  let insIndex = shader.indexOf(insString)
  insIndex += insString.length

  let startShader = shader.slice(0, insIndex)
  let endShader = shader.slice(insIndex)

  //create function call
  let posString = '\n'

  let indexX = (0 % dataSize) / dataSize + texelOffset
  let indexY = (Math.floor(0 / dataSize)) / dataSize + texelOffset
  let index = indexX + ', ' + indexY

  posString += '\tvec2 rect1 = texture(u_eTex, vec2(' + index + ')).xy;\n'

  indexX = (1. % dataSize) / dataSize + texelOffset
  indexY = (Math.floor(1. / dataSize)) / dataSize + texelOffset
  index = indexX + ', ' + indexY

  posString += '\tvec2 rect2 = texture(u_eTex, vec2(' + index + ')).xy;\n'
  posString += '\tvec2 center = 0.5 * (rect2 - rect1) + rect1;\n'
  posString += '\tvec2 rPt = abs(rect2 - center);\n'
  posString += '\td = sdBox(uv, center, rPt, u_radius);\n'

  posString += '\tfloat stroke = line(d, u_weight, u_dPt.z);\n'
  posString += '\tvec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);\n'
  posString += '\tfloat fill = fillMask(d);\n'
  posString += '\tvec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);\n'
  // interesting debugging technique 
  // posString += '\tvec4 fillCol = vec4(filterSDF(uv, d), 0.5);\n'
  posString += '\td = min(stroke, fill);\n'
  posString += '\tif ( d > 1.) discard;\n'
  posString += '\toutColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);\n'

  startShader += posString
  let fragShader = startShader + endShader

  // console.log(posString);

  return fragShader
}