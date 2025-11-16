precision mediump float;

uniform vec2 uResolution;
uniform int uNumEffects;
uniform vec2 uEffectPositions[10];
uniform float uEffectTimes[10];
uniform float uEffectIntensities[10];
uniform float uEffectHueOffsets[10];
uniform float uEffectSaturations[10];
uniform float uEffectSizeMultipliers[10];
uniform float uEffectGlowIntensities[10];

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

	// Correct for aspect ratio to prevent stretching
	float aspect = uResolution.x / uResolution.y;
	uv.x *= aspect;

	vec3 color = vec3(0.0);

	// Render each active effect from all instruments
	for (int effectIdx = 0; effectIdx < 10; effectIdx++) {
		if (effectIdx >= uNumEffects) break;

		vec2 effectPos = uEffectPositions[effectIdx] / uResolution;
		effectPos.x *= aspect;
		float effectTime = uEffectTimes[effectIdx];
		float effectIntensity = uEffectIntensities[effectIdx];
		float hueOffset = uEffectHueOffsets[effectIdx];
		float saturation = uEffectSaturations[effectIdx];
		float sizeMultiplier = uEffectSizeMultipliers[effectIdx];
		float glowIntensity = uEffectGlowIntensities[effectIdx];

		if (effectIntensity > 0.01) {
			// Number of particles per effect (fixed for now, could be per-effect)
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
				float t = effectTime * speed;
				vec2 particleOffset = dir * t * effectIntensity;
				vec2 particleWorldPos = effectPos + particleOffset;

				// Distance from current pixel to particle
				float dist = length(uv - particleWorldPos);

				// Particle size decreases over time (with instrument-specific size multiplier)
				float size = 0.02 * sizeMultiplier * (1.0 - t * 0.5) * effectIntensity;

				// Particle intensity (gaussian-like falloff)
				float particleIntensity = exp(-dist * dist / (size * size * 0.5));

				// Color: rainbow effect with instrument-specific hue offset and saturation
				float hue = mod(angle / 6.28318 + hueOffset, 1.0);
				vec3 particleColor = hsv2rgb(vec3(hue, saturation, 1.0));

				// Fade out over time
				float fade = (1.0 - t) * effectIntensity;
				particleIntensity *= fade;

				color += particleColor * particleIntensity;
			}

			// Add a central glow (with instrument-specific intensity)
			vec2 centerDist = uv - effectPos;
			float centerGlow = exp(-length(centerDist) * 15.0) * effectIntensity * glowIntensity;
			color += vec3(1.0) * centerGlow;
		}
	}

	gl_FragColor = vec4(color, 1.0);
}
