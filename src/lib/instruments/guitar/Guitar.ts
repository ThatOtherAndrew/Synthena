import type { Instrument } from '../Instrument';
import type { ParticleEffect } from '../ParticleEffect';
import { GuitarParticles } from './GuitarParticles';
import sampleUrl from './guitar_pluck.wav';

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
			const response = await fetch(sampleUrl);
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

		if (heldNotes && heldNotes.size > 0) {
			// Sort notes from lowest to highest for upwards strum
			const sortedNotes = Array.from(heldNotes).sort((a, b) => a - b);
			const STRUM_DELAY_MS = 30;

			sortedNotes.forEach((note, index) => {
				const source = this.audioContext!.createBufferSource();
				source.buffer = this.audioBuffer;

				// Calculate pitch shift from base note (E3 = MIDI 52)
				const semitoneOffset = note - 52;
				source.playbackRate.value = Math.pow(2, semitoneOffset / 12);

				// Apply gain based on intensity
				if (intensity !== undefined) {
					const gainNode = this.audioContext!.createGain();
					gainNode.gain.value = Math.max(0, Math.min(1, intensity));
					source.connect(gainNode);
					gainNode.connect(this.audioContext!.destination);
				} else {
					source.connect(this.audioContext!.destination);
				}

				const now = this.audioContext!.currentTime;
				const randomVariance = Math.random() * 10;
				const startTime = now + (index * STRUM_DELAY_MS + randomVariance) / 1000;
				source.start(startTime);
			});
		} else {
			// No held notes - play base note
			const source = this.audioContext.createBufferSource();
			source.buffer = this.audioBuffer;

			if (intensity !== undefined) {
				const gainNode = this.audioContext.createGain();
				gainNode.gain.value = Math.max(0, Math.min(1, intensity));
				source.connect(gainNode);
				gainNode.connect(this.audioContext.destination);
			} else {
				source.connect(this.audioContext.destination);
			}

			source.start(0);
		}

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
