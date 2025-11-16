/**
 * MidiManager handles Web MIDI API connections and tracks currently held notes.
 * Provides reactive state that can be used by instruments.
 */
export class MidiManager {
	private heldNotes: Set<number> = new Set();
	private midiAccess: MIDIAccess | null = null;
	private listeners: Array<(notes: Set<number>) => void> = [];

	/**
	 * Initialise MIDI access and set up note event listeners
	 */
	async initialise(): Promise<boolean> {
		if (!navigator.requestMIDIAccess) {
			console.warn('Web MIDI API not supported in this browser');
			return false;
		}

		try {
			this.midiAccess = await navigator.requestMIDIAccess();
			this.setupInputListeners();
			console.log('MIDI access initialised');
			return true;
		} catch (error) {
			console.error('Failed to get MIDI access:', error);
			return false;
		}
	}

	/**
	 * Set up listeners for all connected MIDI input devices
	 */
	private setupInputListeners(): void {
		if (!this.midiAccess) return;

		for (const input of this.midiAccess.inputs.values()) {
			input.onmidimessage = this.handleMidiMessage.bind(this);
			console.log(`Connected to MIDI input: ${input.name}`);
		}

		// Listen for new device connections
		this.midiAccess.onstatechange = (event: MIDIConnectionEvent) => {
			const port = event.port as MIDIPort;
			if (port.type === 'input' && port.state === 'connected') {
				(port as MIDIInput).onmidimessage = this.handleMidiMessage.bind(this);
				console.log(`New MIDI input connected: ${port.name}`);
			}
		};
	}

	/**
	 * Handle incoming MIDI messages (note on/off)
	 */
	private handleMidiMessage(event: MIDIMessageEvent): void {
		if (!event.data || event.data.length < 3) return;

		const [status, note, velocity] = event.data;
		const command = status >> 4;

		// Note On (command 9) with velocity > 0
		if (command === 9 && velocity > 0) {
			this.heldNotes.add(note);
			this.notifyListeners();
		}
		// Note Off (command 8) or Note On with velocity 0
		else if (command === 8 || (command === 9 && velocity === 0)) {
			this.heldNotes.delete(note);
			this.notifyListeners();
		}
	}

	/**
	 * Subscribe to held notes changes
	 */
	subscribe(listener: (notes: Set<number>) => void): () => void {
		this.listeners.push(listener);
		// Return unsubscribe function
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Notify all listeners of held notes change
	 */
	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(new Set(this.heldNotes));
		}
	}

	/**
	 * Get current held notes (returns a copy for immutability)
	 */
	getHeldNotes(): Set<number> {
		return new Set(this.heldNotes);
	}

	/**
	 * Clean up MIDI connections
	 */
	cleanup(): void {
		if (this.midiAccess) {
			for (const input of this.midiAccess.inputs.values()) {
				input.onmidimessage = null;
			}
			this.midiAccess = null;
		}
		this.heldNotes.clear();
		this.listeners = [];
		console.log('MIDI manager cleaned up');
	}
}
