import { sdCircle, filterFill, drawPt, transformUV, invTransformUV } from './shaderFunctions'

export const pointLightEdit =
  `#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision highp float;

in vec2 v_texcoord;

uniform vec3 u_resolution;

uniform vec3 u_mPt;
uniform vec3 u_dPt;

uniform vec3 u_scale;

// might be worth it to pack multiple lights into the same shader
uniform sampler2D u_eTex;
uniform sampler2D u_distTex;

uniform float u_cTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;
uniform float u_radius;

// uniform vec3 u_idCol;

out vec4 outColor;

${sdCircle}
${filterFill}
${drawPt}

float sceneDist(vec2 uv) {
// reverse transformation of uv
	${invTransformUV}

	// flip y
	uv.y = 1.0 - uv.y;
  
  float d = 0.0 - texture(u_distTex, uv).x;
  return d;
}

float shadow(vec2 p, vec2 pos, float radius)
{
	vec2 dir = normalize(pos - p);
	float dl = length(p - pos);
	// fraction of light visible, starts at one radius (second half added in the end);
	float lf = radius * dl;
	// distance traveled
	float dt = 0.000001;
	for (int i = 0; i < 1000; ++i)
	{
		// distance to scene at current position
		float sd = sceneDist(p + dir * dt);

    if (sd < 0.){
      return 0.0;
    }
		// width of cone-overlap at light
		// 0 in center, so 50% overlap: add one radius outside of loop to get total coverage
		// should be '(sd / dt) * dl', but '*dl' outside of loop
		lf = min(lf, sd / dt);
		// move ahead
		// dt += max(0.000001, abs(sd));
    dt += clamp(abs(sd), 0.0000001, 0.001);
    // dt += 0.00001;
		if (dt > dl) break;
	}
	// multiply by dl to get the real projected overlap (moved out of loop)
	// add one radius, before between -radius and + radius
	// normalize to 1 ( / 2*radius)
	lf = clamp((lf * dl + radius) / (2.0 * radius), 0.0, 1.0);
	lf = smoothstep(0.00, 1.0, lf);
	return lf;
}

vec4 drawLight(vec2 p, vec2 pos, vec3 color, float range, float radius)
{
	// distance to light
	float ld = length(p - pos);
	// out of range
	if (ld > range) return vec4(0.0);
	// shadow and falloff
	float shad = shadow(p, pos, range);
	float fall = (range - ld)/range;
	fall *= fall;
	float source = fillMask(sdCircle(p - pos, vec2(0.,0.), radius));
  return vec4((shad * fall + source) * color, shad * fall);
}

float luminance(vec3 col)
{
	return 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
}

vec3 setLuminance(vec3 col, float lum)
{
	lum /= luminance(col);
	return col *= lum;
}

void main(){
  outColor = vec4(0.0);
  vec2 uv = v_texcoord;
  ${transformUV}

	vec2 q = v_texcoord;

  //--- if we want to draw multiple point lights from the same texture?
  //--- could be a cool optimization for many lights
  //--- would need a texture(s) for color / radius
  // float texelOffset = 0.5 * (1. / (16. * 16.));

  //fill color
  //set luminance
  // vec4 col = vec4(1.0);

  // for (float i = 0.; i < 16.; i++ ){
  //   float yIndex = i / 16. + texelOffset;

  //   for (float j = 0.; j < 16.; j++ ){
  //     float xIndex = j / 16.  + texelOffset;
  //     vec2 vIndex = vec2(xIndex, yIndex);
  //     vec2 tPt = texture(u_eTex, vIndex).xy;

  //     if (tPt == vec2(0.)){ break; }

  //     // dist = min(dist, sdLine(uv, prevPt, tPt, u_weight, 0.0));
  //     // dSh = min(dSh, sdLine(uv - dShTrans, prevPt, tPt, u_weight, 0.0));
  //     col *= drawLight(uv, tPt, setLuminance(u_fill, 0.9), u_weight * 100., u_weight);
  //   }
  // }
  // ----
 
  //fill color
  //set luminance
  vec4 col = drawLight(uv, u_mPt.xy, setLuminance(u_fill, 0.9), u_weight * 100., u_weight);

	//vignette
  float vignette = clamp(pow( 256.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), .125 ),0.,1.)*.5;

  outColor = col + vec4(vec3(vignette), abs(vignette - 1.0));
}
`