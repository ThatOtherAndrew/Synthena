precision mediump float;

uniform float uFlash;
uniform vec2 uResolution;

void main() {
	// Base colour is black, flash to white
	vec3 colour = mix(vec3(0.0), vec3(1.0), uFlash);
	gl_FragColor = vec4(colour, 1.0);
}
