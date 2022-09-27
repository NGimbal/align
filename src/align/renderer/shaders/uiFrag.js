import { SCALE } from '../../constants'
import { invTransformPt, transformPt } from './shaderFunctions'
import { sdCircle, filterLine, drawPt, sdBox, transformUV } from './shaders'

export const uiFrag =
  `#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_mPt;

uniform sampler2D u_eTex;
// uniform sampler2D u_distTex;

uniform float u_weight;
uniform vec3 u_stroke;
uniform float u_opacity;

uniform vec3 u_boxSel;
uniform float u_boxState;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;

${sdCircle}
${sdBox}
${filterLine}
${drawPt}
${invTransformPt}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;

  float texelOffset = 0.5 * (1. / (16. * 16.));

  vec2 mousePt = invTransformPt(u_mPt.xy);

  // vec2 index = u_mPt.xy;
  // index.y = 1.0 - index.y;
  // float radius = (texture(u_distTex, index).x - 0.5) * u_resolution.x / u_resolution.y;

  float dist = line(sdCircle(uv, mousePt, 0.008 + u_weight), 0.00075);

  vec2 boxPt = invTransformPt(u_boxSel.xy);

  vec2 center = 0.5 * (mousePt - boxPt) + boxPt;
  vec2 rPt = abs(mousePt - center);
  float box = sdBox(uv, center, rPt, 0.001);

  float stroke = line(box, 0.0);
  vec3 strokeCol = mix(vec3(1.), vec3(0.2745, 0.5098, 0.7059), stroke);
  strokeCol *= u_boxState;
  
  dist = max(dist, min(stroke, u_boxState));

  vec3 col = mix(vec3(1.0),u_stroke, dist);

  if ( dist < 0.0001) discard;

  outColor = vec4(col, dist);
}`

export const gridFrag =
  `#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;

float gridMnr(float x) { return abs(fract(x*0.5+0.5)-0.5) * 2.; }

void main() {
  // outColor = vec4(1.00);

  vec2 uv = v_texcoord;
  ${transformUV}
  uv *= ${SCALE}.;

  vec2 q = v_texcoord;

  //https://www.shadertoy.com/view/XtVcWc - beautiful grid
  
  // red lines
  // vec3(x) is background color
  vec3 col = vec3(1.0) - smoothstep( (u_dPt.z * 0.001),0.0, abs(gridMnr(uv.x)))*vec3(.25,0.15,0.02);
  col -= smoothstep((u_dPt.z * 0.001), 0.0, abs(gridMnr(uv.y)))*vec3(.25,0.15,0.02);
  
  // blue lines
  col -= (smoothstep( (u_dPt.z * 0.00015),0.0, abs(gridMnr(uv.x / 12.)))*vec3(0.,0.77,0.7)) * 0.25;
  col -= (smoothstep((u_dPt.z * 0.00015), 0.0, abs(gridMnr(uv.y / 12.)))*vec3(0.,0.77,0.7)) * 0.25;
  
  // subtle paper texture
  //col *= (smoothstep(0.26,.25,(fract(sin(dot(uv.x, uv.y))*150130.1)))*0.03+0.97)*vec3(1.005,1.,0.99);
  //vignette
  //col *= clamp(pow( 256.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), .09 ),0.,1.)*.325+0.7;

  outColor = vec4(col,1.0);
}`