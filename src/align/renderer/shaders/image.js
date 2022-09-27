export const imgFrag =
  `#version 300 es
precision highp float;

in vec2 v_texcoord;

uniform sampler2D u_img;
uniform sampler2D u_distImg;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;
 
void main() {
  vec2 uv = v_texcoord;

  // TODO: eventually we'll have u_dist texture
  // when a new image is loaded some kind of distance texture will
  // be generated, may or may not be useful
  
  outColorDist = texture(u_distImg, uv);
  outColor = texture(u_img, uv);
}`