import type { ParticleEffect, ParticleEffectFactory, ParticleStyle } from '../ParticleEffect';

export class VibraphoneParticles implements ParticleEffectFactory {
	private effectIdCounter = 0;

	// Vibraphone-specific particle configuration
	private readonly PARTICLE_COUNT = 30; // Optimized particle count
	private readonly EFFECT_DURATION = 4000; // Longer sustain than guitar (4 seconds)

	// Vibraphone visual style: cyan/blue shimmer
	private readonly style: ParticleStyle = {
		hueOffset: 0.55, // Cyan/blue hue (cyan is around 0.5 on color wheel)
		saturation: 0.9,
		rainbow: false, // Single colour, not rainbow
		sizeMultiplier: 0.8, // Slightly smaller, more delicate particles
		showCentralGlow: true,
		glowIntensity: 0.7 // Subtler glow than guitar
	};

	createEffect(position: { x: number; y: number }, intensity?: number): ParticleEffect {
		const id = `vibraphone-${this.effectIdCounter++}`;

		return {
			id,
			position,
			startTime: performance.now(),
			duration: this.EFFECT_DURATION,
			particleCount: this.PARTICLE_COUNT,
			style: this.style,
			seed: Math.random() * 1000
		};
	}
}
