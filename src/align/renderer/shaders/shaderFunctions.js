import { SCALE } from '../../constants'

//SDF Functions
export const sdCircle = `
float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}
`

// https://www.shadertoy.com/view/WtGXRc
export const sdArc = `
vec3 sdgArc( in vec2 p, in vec2 sca, in vec2 scb, in float ra, in float rb )
{
    vec2 q = p;

    mat2 ma = mat2(sca.x,-sca.y,sca.y,sca.x);
    p = ma*p;

    float s = sign(p.x); p.x = abs(p.x);
    
    if( scb.y*p.x > scb.x*p.y )
    {
        vec2  w = p - ra*scb;
        float d = length(w);
        return vec3( d-rb, vec2(s*w.x,w.y)*ma/d );
    }
    else
    {
        float l = length(q);
        float w = l - ra;
        return vec3( abs(w)-rb, sign(w)*q/l );
    }
}
`

export const sdBox = `
//uv, p translation point, b 1/2 length, width, r radius
float sdBox( in vec2 uv, in vec2 p, in vec2 b , in float r)
{
    b -= r;
    uv = (uv-p);
    vec2 d = abs(uv)-b;
    return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0) - r;
}
`

export const _sdLine = `
//https://www.shadertoy.com/view/4tc3DX
float sdLine(vec2 uv, vec2 pA, vec2 pB, float thick, float dashOn) {
    // float rounded = thick;

    vec2 mid = (pB + pA) * 0.5;
    vec2 delta = pB - pA;
    float lenD = length(delta);
    vec2 unit = delta / lenD;

    // Check for when line endpoints are the same
    if (lenD < 0.0001) unit = vec2(1.0, 0.0);	// if pA and pB are same
    
    // Perpendicular vector to unit - also length 1.0
    vec2 perp = unit.yx * vec2(-1.0, 1.0);
    
    // position along line from midpoint
    float dpx = dot(unit, uv - mid);
    
    // distance away from line at a right angle
    float dpy = dot(perp, uv - mid);
    
    // Make a distance function that is 0 at the transition from black to white
    float disty = abs(dpy) - thick + thick;
    float distx = abs(dpx) - lenD * 0.5 - thick + thick;

    float dist = length(vec2(max(0.0, distx), max(0.0,disty))) - thick;
    dist = min(dist, max(distx, disty));

    return dist;
}
`

export const sdLine = `
float sdLine( vec2 p, vec2 a, vec2 b, float th, float dashOn )
{
    vec2 ba = b-a;
    vec2 pa = p-a;
    float h =clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length(pa-h*ba) - th;
}
`

export const sdEllipse = `
// https://www.shadertoy.com/view/tt3yz7
float sdEllipse( vec2 p, vec2 e )
{
    vec2 pAbs = abs(p);
    vec2 ei = 1.0 / e;
    vec2 e2 = e*e;
    vec2 ve = ei * vec2(e2.x - e2.y, e2.y - e2.x);
    
    vec2 t = vec2(0.70710678118654752, 0.70710678118654752);
    for (int i = 0; i < 3; i++) {
        vec2 v = ve*t*t*t;
        vec2 u = normalize(pAbs - v) * length(t * e - v);
        vec2 w = ei * (v + u);
        t = normalize(clamp(w, 0.0, 1.0));
    }
    
    vec2 nearestAbs = t * e;
    float dist = length(pAbs - nearestAbs);
    return dot(pAbs, pAbs) < dot(nearestAbs, nearestAbs) ? -dist : dist;
}
`

// Filters
// d = 1.0 - smoothstep(0.0, 0.003, abs(d));
export const filterLine = `
float line(float d, float w, float zoom){
  d = clamp(abs(d) - w, 0.0, 1.0);
  d = 1.0 - smoothstep(0.0, 0.00008 * zoom, abs(d));
  return d;
}
`

export const filterFill = `
// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}
`

export const filterSDF = `
//smooth sdf Iso
vec3 filterSDF(vec2 uv, float d){
  vec3 col = vec3(1.0) - sign(d)*vec3(0.1,0.4,0.7);
	col *= 1.0 - exp(-3.0*abs(d));
	col *= 0.8 + 0.2*cos(150.0*d);
	col = mix( col, vec3(1.0), 1.0-smoothstep(0.0,0.003,abs(d)));
  return col;
}
`

// Helpers
export const drawPt = `
vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
  vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
  return color;
}
`

export const transformPt = `
  vec2 transformPt(vec2 pt) {
    pt.x *= u_resolution.x / u_resolution.y;
    pt -= u_dPt.xy;
    pt *= u_dPt.z / ${SCALE}.;
    return pt;
  }
`

// this function is used in conjunction with the ui shader
// to transform point locations from scene space to screen space
// uv needs be multiplied by res.x / res.y, and can only happen once
export const invTransformPt = `
  vec2 invTransformPt(vec2 pt) {
    pt *= ${SCALE}. / u_dPt.z;
    pt += u_dPt.xy;
    // pt.x *= u_resolution.y / u_resolution.x;
    return pt;
  }
`

// 
export const transformUV = `
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= u_dPt.z / ${SCALE}.;
`

// from screen space to scene space
export const invTransformUV = `
  uv *= ${SCALE}. / u_dPt.z;
  uv += u_dPt.xy;
  uv.x *= u_resolution.y / u_resolution.x;
`

export const discardCondition =`
  if ( stroke + fill < 0.01) discard;
`