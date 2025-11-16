import type { Instrument } from '../Instrument';
import type { ParticleEffect } from '../ParticleEffect';
import { GuitarParticles } from './GuitarParticles';
import guitarStrumUrl from './guitar_strum.wav';

/**
 * Guitar instrument implementation.
 * Plays back a pre-recorded guitar strum sample and spawns colourful particle effects.
 */
export class Guitar implements Instrument {
	private audioContext: AudioContext | null = null;
	private audioBuffer: AudioBuffer | null = null;
	private ready = false;
	private particleFactory = new GuitarParticles();
	private activeEffects: ParticleEffect[] = [];

	get isReady(): boolean {
		return this.ready;
	}

	async initialise(): Promise<void> {
		if (this.ready) return;

		try {
			this.audioContext = new AudioContext();
			const response = await fetch(guitarStrumUrl);
			const arrayBuffer = await response.arrayBuffer();
			this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
			this.ready = true;
		} catch (error) {
			console.error('Failed to initialise Guitar instrument:', error);
			throw error;
		}
	}

	trigger(position: { x: number; y: number }, intensity?: number, heldNotes?: Set<number>): void {
		if (!this.audioContext || !this.audioBuffer) {
			console.warn('Guitar not initialised. Call initialise() first.');
			return;
		}

		// Create audio
		const source = this.audioContext.createBufferSource();
		source.buffer = this.audioBuffer;

		if (heldNotes && heldNotes.size > 0) {
			const lowestNote = Math.min(...heldNotes);
			const semitoneOffset = lowestNote - 63; // E flat
			source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
		}

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
