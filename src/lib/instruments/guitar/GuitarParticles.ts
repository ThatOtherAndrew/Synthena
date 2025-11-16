import type { ParticleEffect, ParticleEffectFactory, ParticleStyle } from '../ParticleEffect';

export class GuitarParticles implements ParticleEffectFactory {
	private effectIdCounter = 0;

	// Guitar-specific particle configuration
	private readonly PARTICLE_COUNT = 30;
	private readonly EFFECT_DURATION = 2000; // 2 seconds

	// Guitar visual style: vibrant rainbow burst
	private readonly style: ParticleStyle = {
		hueOffset: 0,
		saturation: 0.8,
		rainbow: true, // Each particle gets different hue based on angle
		sizeMultiplier: 1.0,
		showCentralGlow: true,
		glowIntensity: 1.0
	};

	createEffect(position: { x: number; y: number }, intensity?: number): ParticleEffect {
		const id = `guitar-${this.effectIdCounter++}`;

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
