import type { ParticleEffect, ParticleEffectFactory, ParticleStyle } from '../ParticleEffect';

export class BassParticles implements ParticleEffectFactory {
	private effectIdCounter = 0;

	// Bass-specific particle configuration
	private readonly PARTICLE_COUNT = 30;
	private readonly EFFECT_DURATION = 2333; // ~2.3 seconds

	// Bass visual style: deep purple/magenta burst
	private readonly style: ParticleStyle = {
		hueOffset: 0.83, // Deep purple/magenta
		saturation: 0.85,
		rainbow: false, // Single deep colour
		sizeMultiplier: 1.3, // Larger, heavier particles
		showCentralGlow: true,
		glowIntensity: 0.8
	};

	createEffect(position: { x: number; y: number }, intensity?: number): ParticleEffect {
		const id = `bass-${this.effectIdCounter++}`;

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
