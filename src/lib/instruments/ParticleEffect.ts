/**
 * Configuration for a single particle within an effect.
 */
export interface ParticleConfig {
	/** Base angle in radians for particle direction */
	baseAngle: number;
	/** Variation to add to base angle */
	angleVariation: number;
	/** Speed multiplier for this particle */
	speed: number;
	/** Random seed for this particle */
	seed: number;
}

/**
 * Visual styling for a particle effect.
 */
export interface ParticleStyle {
	/** Hue offset (0-1) for color calculation */
	hueOffset: number;
	/** Saturation (0-1) */
	saturation: number;
	/** Whether to use rainbow colors (hue varies by angle) */
	rainbow: boolean;
	/** Base size multiplier */
	sizeMultiplier: number;
	/** Whether to show central glow */
	showCentralGlow: boolean;
	/** Central glow intensity */
	glowIntensity: number;
}

/**
 * Represents a complete particle effect that can be rendered.
 * Each instrument creates these when triggered.
 */
export interface ParticleEffect {
	/** Unique identifier for this effect */
	id: string;
	/** Screen position in pixels {x, y} */
	position: { x: number; y: number };
	/** Timestamp when effect was created (performance.now()) */
	startTime: number;
	/** Duration in milliseconds before effect expires */
	duration: number;
	/** Number of particles in this effect */
	particleCount: number;
	/** Visual styling for this effect */
	style: ParticleStyle;
	/** Random seed for particle pattern variation */
	seed: number;
	/** Optional: Pre-computed particle configurations for deterministic rendering */
	particles?: ParticleConfig[];
}

/**
 * Factory for creating particle effects.
 * Each instrument implements this to define its unique particle behavior.
 */
export interface ParticleEffectFactory {
	/**
	 * Creates a new particle effect at the specified position.
	 * @param position Screen coordinates where effect should spawn
	 * @param intensity Optional intensity value affecting effect properties
	 * @returns Complete particle effect configuration
	 */
	createEffect(position: { x: number; y: number }, intensity?: number): ParticleEffect;
}
