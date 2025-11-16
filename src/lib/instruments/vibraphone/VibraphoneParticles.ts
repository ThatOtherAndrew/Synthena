import type { ParticleEffect, ParticleEffectFactory, ParticleStyle } from '../ParticleEffect';

/**
 * Vibraphone-specific particle effect factory.
 * Creates elegant, shimmering particle bursts with cyan/blue tones.
 */
export class VibraphoneParticles implements ParticleEffectFactory {
	private effectIdCounter = 0;

	// Vibraphone-specific particle configuration
	private readonly PARTICLE_COUNT = 60; // More particles for shimmer effect
	private readonly EFFECT_DURATION = 4000; // Longer sustain than guitar (4 seconds)

	// Vibraphone visual style: cyan/blue shimmer
	private readonly style: ParticleStyle = {
		hueOffset: 0.5, // Cyan starting point (shifted from rainbow)
		saturation: 0.9,
		rainbow: true, // Still rainbow, but offset gives blue/cyan/green range
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
			style: this.style
		};
	}
}
