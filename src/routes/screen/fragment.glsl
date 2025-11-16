precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform int uNumEffects;
uniform vec2 uEffectPositions[10];
uniform float uEffectTimes[10];
uniform float uEffectIntensities[10];
uniform float uEffectHueOffsets[10];
uniform float uEffectSaturations[10];
uniform float uEffectSizeMultipliers[10];
uniform float uEffectGlowIntensities[10];
uniform float uEffectRainbow[10]; // 1.0 for rainbow, 0.0 for single colour
uniform float uEffectSeeds[10]; // Random seed per effect for variation

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

    // Animated background gradient
    vec2 center = vec2(0.5 * aspect, 0.5);
    float dist = length(uv - center);

    // Create animated gradient with noise
    float noise1 = random(vec2(uv.x * 3.0, uv.y * 3.0 + uTime * 0.1));
    float noise2 = random(vec2(uv.x * 5.0 - uTime * 0.05, uv.y * 5.0));

    // Dark blue to purple gradient with subtle noise
    vec3 bgColor1 = vec3(0.02, 0.02, 0.08); // Very dark blue
    vec3 bgColor2 = vec3(0.08, 0.02, 0.12); // Very dark purple
    float gradient = dist + noise1 * 0.1 + noise2 * 0.05;
    vec3 color = mix(bgColor1, bgColor2, gradient);

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
        float rainbow = uEffectRainbow[effectIdx];
        float seed = uEffectSeeds[effectIdx];

        if (effectIntensity > 0.01) {
            // Number of particles per effect (fixed for now, could be per-effect)
            const int numParticles = 50;

            for (int i = 0; i < numParticles; i++) {
                float fi = float(i);

                // Evenly distribute angles around the circle, with slight randomization
                // Use effect seed for unique pattern per trigger
                float baseAngle = (fi / float(numParticles)) * 6.28318;
                float angleVariation = (random(vec2(fi * 12.345 + seed, fi * 67.890 + seed)) - 0.5) * 0.3;
                float angle = baseAngle + angleVariation;
                float speed = 0.15 + random(vec2(fi * 23.456 + seed, fi * 89.012 + seed)) * 0.25;

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

                // Color: rainbow effect or single color based on instrument
                float angleHue = angle / 6.28318; // Hue based on particle angle
                float hue = mix(hueOffset, mod(angleHue + hueOffset, 1.0), rainbow);
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
