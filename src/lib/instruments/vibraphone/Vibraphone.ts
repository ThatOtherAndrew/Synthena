import type { Instrument } from '../Instrument';
import type { ParticleEffect } from '../ParticleEffect';
import { VibraphoneParticles } from './VibraphoneParticles';
import vibraphoneUrl from './vibraphone.ogg';

/**
 * Vibraphone instrument implementation.
 * Plays back a pre-recorded vibraphone sample and spawns shimmering particle effects.
 */
export class Vibraphone implements Instrument {
	private audioContext: AudioContext | null = null;
	private audioBuffer: AudioBuffer | null = null;
	private ready = false;
	private particleFactory = new VibraphoneParticles();
	private activeEffects: ParticleEffect[] = [];

	get isReady(): boolean {
		return this.ready;
	}

	async initialise(): Promise<void> {
		if (this.ready) return;

		try {
			this.audioContext = new AudioContext();
			const response = await fetch(vibraphoneUrl);
			const arrayBuffer = await response.arrayBuffer();
			this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
			this.ready = true;
		} catch (error) {
			console.error('Failed to initialise Vibraphone instrument:', error);
			throw error;
		}
	}

	trigger(position: { x: number; y: number }, intensity?: number): void {
		if (!this.audioContext || !this.audioBuffer) {
			console.warn('Vibraphone not initialised. Call initialise() first.');
			return;
		}

		// Create audio
		const source = this.audioContext.createBufferSource();
		source.buffer = this.audioBuffer;

		// Optional: Apply gain based on intensity
		if (intensity !== undefined) {
			const gainNode = this.audioContext.createGain();
			gainNode.gain.value = Math.max(0, Math.min(1, intensity));
			source.connect(gainNode);
			gainNode.connect(this.audioContext.destination);
		} else {
			source.connect(this.audioContext.destination);
		}

		source.start(0);

		// Create particle effect
		const effect = this.particleFactory.createEffect(position, intensity);
		this.activeEffects.push(effect);
	}

	getActiveEffects(currentTime: number): ParticleEffect[] {
		// Remove expired effects
		this.activeEffects = this.activeEffects.filter(
			(effect) => currentTime - effect.startTime < effect.duration
		);

		return this.activeEffects;
	}

	cleanup(): void {
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		this.audioBuffer = null;
		this.activeEffects = [];
		this.ready = false;
	}
}
