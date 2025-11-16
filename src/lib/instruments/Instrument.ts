import type { ParticleEffect } from './ParticleEffect';

/**
 * Base interface for all musical instruments.
 * Instruments handle audio playback and visual particle effects.
 */
export interface Instrument {
	/**
	 * Triggers the instrument to play a sound and spawn particle effects.
	 * @param position Screen coordinates where effect should spawn
	 * @param intensity Optional intensity/velocity value
	 */
	trigger(position: { x: number; y: number }, intensity?: number): void;

	/**
	 * Initialises the instrument by loading audio resources.
	 * Should be called once before the instrument can be used.
	 * @returns Promise that resolves when the instrument is ready
	 */
	initialise(): Promise<void>;

	/**
	 * Cleans up resources when the instrument is no longer needed.
	 */
	cleanup(): void;

	/**
	 * Gets all currently active particle effects from this instrument.
	 * Effects are automatically managed and expired by the instrument.
	 * @param currentTime Current timestamp (performance.now()) for expiry checking
	 * @returns Array of active particle effects
	 */
	getActiveEffects(currentTime: number): ParticleEffect[];

	/**
	 * Indicates whether the instrument has been initialised and is ready to play.
	 */
	readonly isReady: boolean;
}
