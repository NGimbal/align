import { sdArc, filterLine, filterFill, drawPt, transformUV } from './shaderFunctions'

//---------------------------------------------
export const arcEdit =
  `#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;
uniform vec3 u_mPt;

uniform vec4[3] u_ePoints;
uniform int u_cTex;

uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdArc}
${filterLine}
${filterFill}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  ${transformUV}

  float texelOffset = 0.5 * (1. / (16. * 16.));

  vec2 pt1 = u_ePoints[0].xy;
  vec2 pt2 = u_ePoints[1].xy;
  vec2 pt3 = u_ePoints[2].xy;

  float dist = sdArc(uv, u_mPt.xy, 0.125);
  

  //stroke
  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  float fill = fillMask(dist);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);

  dist = min(stroke, fill);

  if ( stroke + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
}`

//---------------------------------------------
export const arcStub =
  `#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_scale;

uniform sampler2D u_eTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;

uniform vec3 u_idCol;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdArc}
${filterLine}
${filterFill}
${drawPt}

void main(){
  outColor = vec4(u_idCol, 0.125);
  vec2 uv = v_texcoord;
  float d = 0.0;

  //$INSERT CALL$------

  //$ENDINSERT CALL$---
  outColorDist = vec4(vec3(d), 1.0);
}`