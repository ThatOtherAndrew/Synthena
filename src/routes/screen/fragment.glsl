precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uParticlePos;
uniform float uFlash;

// Random function
float random(vec2 st) {
	return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
	vec2 uv = gl_FragCoord.xy / uResolution;
	vec2 particleUv = uParticlePos / uResolution;

	// Correct for aspect ratio to prevent stretching
	float aspect = uResolution.x / uResolution.y;
	uv.x *= aspect;
	particleUv.x *= aspect;

	vec3 color = vec3(0.0);
	float intensity = 0.0;

	if (uFlash > 0.01) {
		// Number of particles
		const int numParticles = 50;

		for (int i = 0; i < numParticles; i++) {
			float fi = float(i);

			// Evenly distribute angles around the circle, with slight randomization
			float baseAngle = (fi / float(numParticles)) * 6.28318;
			float angleVariation = (random(vec2(fi * 12.345, fi * 67.890)) - 0.5) * 0.3;
			float angle = baseAngle + angleVariation;
			float speed = 0.3 + random(vec2(fi * 23.456, fi * 89.012)) * 0.5;

			// Particle position over time
			vec2 dir = vec2(cos(angle), sin(angle));
			float t = uTime * speed;
			vec2 particleOffset = dir * t * uFlash;
			vec2 particleWorldPos = particleUv + particleOffset;

			// Distance from current pixel to particle
			float dist = length(uv - particleWorldPos);

			// Particle size decreases over time
			float size = 0.02 * (1.0 - t * 0.5) * uFlash;

			// Particle intensity (gaussian-like falloff)
			float particleIntensity = exp(-dist * dist / (size * size * 0.5));

			// Color based on angle (rainbow effect)
			float hue = angle / 6.28318;
			vec3 particleColor = hsv2rgb(vec3(hue, 0.8, 1.0));

			// Fade out over time
			float fade = (1.0 - t) * uFlash;
			particleIntensity *= fade;

			color += particleColor * particleIntensity;
			intensity += particleIntensity;
		}

		// Add a central glow
		vec2 centerDist = uv - particleUv;
		float centerGlow = exp(-length(centerDist) * 15.0) * uFlash;
		color += vec3(1.0) * centerGlow;
	}

	gl_FragColor = vec4(color, 1.0);
}
