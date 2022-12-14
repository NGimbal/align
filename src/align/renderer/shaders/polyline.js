import { sdCircle, filterLine, drawPt, sdLine, transformUV } from './shaderFunctions'

export const pLineEdit = `
#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_mPt;

uniform sampler2D u_eTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform float u_opacity;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdLine}
${sdCircle}
${filterLine}
${drawPt}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  ${transformUV}

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = 10.0;

  vec2 prevPt = texture(u_eTex, vec2(texelOffset, texelOffset)).xy;
  float one = 1.0;

  if(prevPt == vec2(0.)) {discard;}

  //drop shadow
  vec2 dShTrans = normalize(vec2(-1. * u_weight, u_weight))*u_weight;
  float dSh = 10.0;

  for (float i = 0.; i < 16.; i++ ){
    float yIndex = i / 16. + texelOffset;

    for (float j = 0.; j < 16.; j++ ){
      //this is to skip the first point only;
      j += one;
      one = 0.;

      float xIndex = j / 16.  + texelOffset;
      vec2 vIndex = vec2(xIndex, yIndex);
      vec2 tPt = texture(u_eTex, vIndex).xy;

      if (tPt == vec2(0.)){ break; }

      dist = min(dist, sdLine(uv, prevPt, tPt, u_weight, 0.0));
      dSh = min(dSh, sdLine(uv - dShTrans, prevPt, tPt, u_weight, 0.0));

      prevPt = tPt;
    }
  }

  dist = min(dist, sdLine(uv, prevPt, u_mPt.xy, u_weight, 0.0));
  dSh = min(dSh, sdLine(uv - dShTrans, prevPt, u_mPt.xy, u_weight, 0.0));
  
  //ideally you'd map the distance from -1 to 1 then add 0.5
  //dont know what the range for d is tho... have a feeling it's actually pretty small
  outColorDist = vec4(vec3(clamp(dist + 0.5,0.0,1.0)),1.0);

  dist = line(dist, u_weight, u_dPt.z);
  vec3 col = mix(vec3(1.0), u_stroke, dist);
  dSh = (1. - smoothstep(0., 0.15, sqrt(dSh)))*.25;

  if ( dist + dSh < 0.001) discard;

  outColor = vec4(col * vec3(max(dSh, dist)), (dist + dSh) * u_opacity);
}`

//---------------------------------------------
export const pLineStub = `
#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform sampler2D u_eTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform float u_opacity;

uniform vec3 u_idCol;
uniform float u_sel;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdLine}
${sdCircle}
${filterLine}
${drawPt}

//$INSERT FUNCTION$------

//$ENDINSERT FUNCTION$---

vec4 sceneDist(vec2 uv) {
  float d = 1.0;
  //xyz:color, w:cumulative distance 
  vec4 colDist = vec4(1.);
  //index in parameters texture
  vec2 index = vec2(0.);
  //$INSERT CALL$------
  //$ENDINSERT CALL$---
  return colDist;
}

void main(){
  outColor = vec4(u_idCol, 1.0);
  vec2 uv = v_texcoord;

  vec4 scene = sceneDist(uv);

  vec3 col = scene.xyz;
  float dist = line(scene.w, u_weight, u_dPt.z);

  // comment out for background color
  // if ( dist < 0.001){
  //   discard;
  // }

  // typ. rendering style
  outColor = vec4(col * vec3(dist), dist * u_opacity);
  outColorDist = vec4(vec3(clamp(scene.w + 0.5,0.0,1.0)), 1.0 - clamp(scene.w, 0.0, 1.0));

  // uncomment for background color
  // outColor = vec4(mix(u_idCol, col, dist), dist * u_opacity, 0.375));
}`