<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import vertexShaderSource from './vertex.glsl?raw';
	import fragmentShaderSource from './fragment.glsl?raw';
	import { Guitar } from '$lib/instruments/guitar/Guitar';
	import { Vibraphone } from '$lib/instruments/vibraphone/Vibraphone';
	import type { Instrument } from '$lib/instruments/Instrument';

	let canvas: HTMLCanvasElement;
	let connected = $state(false);

	// Non-reactive variables for WebSocket and WebGL management
	let ws: WebSocket | null = null;
	let reconnectTimeout: number | null = null;
	let isCleaningUp = false;
	let gl: WebGLRenderingContext | null = null;
	let program: WebGLProgram | null = null;
	let animationFrameId: number | null = null;
	let instruments: Map<string, Instrument> = new Map();
	let lastTriggerTime = 0;
	const TRIGGER_DEBOUNCE = 100; // Minimum 100ms between any triggers

	function createShader(
		gl: WebGLRenderingContext,
		type: number,
		source: string
	): WebGLShader | null {
		const shader = gl.createShader(type);
		if (!shader) return null;

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('Shader compile error:', gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	function initWebGL() {
		if (!canvas) return;

		gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
		if (!gl) {
			console.error('WebGL not supported');
			return;
		}

		// Create shaders
		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

		if (!vertexShader || !fragmentShader) return;

		// Create program
		program = gl.createProgram();
		if (!program) return;

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error('Program link error:', gl.getProgramInfoLog(program));
			return;
		}

		gl.useProgram(program);

		// Create fullscreen quad
		const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

		const positionLocation = gl.getAttribLocation(program, 'position');
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		// Start render loop
		animationFrameId = requestAnimationFrame(render);
	}

	function render(timestamp: number) {
		if (!gl || !program || isCleaningUp) return;

		// Get all active effects from all instruments
		const allEffects: any[] = [];
		for (const instrument of instruments.values()) {
			allEffects.push(...instrument.getActiveEffects(timestamp));
		}

		// Prepare effect data for shader (support unlimited effects, but shader has max)
		const MAX_SHADER_EFFECTS = 10;
		const effectPositions: number[] = [];
		const effectTimes: number[] = [];
		const effectIntensities: number[] = [];
		const effectHueOffsets: number[] = [];
		const effectSaturations: number[] = [];
		const effectSizeMultipliers: number[] = [];
		const effectGlowIntensities: number[] = [];

		for (let i = 0; i < MAX_SHADER_EFFECTS; i++) {
			if (i < allEffects.length) {
				const effect = allEffects[i];
				const age = (timestamp - effect.startTime) / 1000; // Convert to seconds
				const intensity = Math.max(0, 1.0 - age / (effect.duration / 1000));

				effectPositions.push(effect.position.x, effect.position.y);
				effectTimes.push(age);
				effectIntensities.push(intensity);
				effectHueOffsets.push(effect.style.hueOffset);
				effectSaturations.push(effect.style.saturation);
				effectSizeMultipliers.push(effect.style.sizeMultiplier);
				effectGlowIntensities.push(effect.style.glowIntensity);
			} else {
				// Fill unused slots with dummy data
				effectPositions.push(0, 0);
				effectTimes.push(0);
				effectIntensities.push(0);
				effectHueOffsets.push(0);
				effectSaturations.push(0);
				effectSizeMultipliers.push(1);
				effectGlowIntensities.push(0);
			}
		}

		// Set uniforms
		const numEffectsLocation = gl.getUniformLocation(program, 'uNumEffects');
		gl.uniform1i(numEffectsLocation, Math.min(allEffects.length, MAX_SHADER_EFFECTS));

		const effectPositionsLocation = gl.getUniformLocation(program, 'uEffectPositions');
		gl.uniform2fv(effectPositionsLocation, effectPositions);

		const effectTimesLocation = gl.getUniformLocation(program, 'uEffectTimes');
		gl.uniform1fv(effectTimesLocation, effectTimes);

		const effectIntensitiesLocation = gl.getUniformLocation(program, 'uEffectIntensities');
		gl.uniform1fv(effectIntensitiesLocation, effectIntensities);

		const effectHueOffsetsLocation = gl.getUniformLocation(program, 'uEffectHueOffsets');
		gl.uniform1fv(effectHueOffsetsLocation, effectHueOffsets);

		const effectSaturationsLocation = gl.getUniformLocation(program, 'uEffectSaturations');
		gl.uniform1fv(effectSaturationsLocation, effectSaturations);

		const effectSizeMultipliersLocation = gl.getUniformLocation(program, 'uEffectSizeMultipliers');
		gl.uniform1fv(effectSizeMultipliersLocation, effectSizeMultipliers);

		const effectGlowIntensitiesLocation = gl.getUniformLocation(program, 'uEffectGlowIntensities');
		gl.uniform1fv(effectGlowIntensitiesLocation, effectGlowIntensities);

		const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
		gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

		// Clear and draw
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		animationFrameId = requestAnimationFrame(render);
	}

	function triggerInstrument(instrumentName: string) {
		const now = performance.now();

		// Global debounce to prevent double-triggering from multiple sources
		if (now - lastTriggerTime < TRIGGER_DEBOUNCE) {
			return;
		}
		lastTriggerTime = now;

		// Trigger specific instrument at random position
		const instrument = instruments.get(instrumentName);

		if (canvas && instrument?.isReady) {
			const position = {
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height
			};
			instrument.trigger(position);
		}
	}

	async function initialiseInstruments(): Promise<void> {
		if (!browser) return;

		try {
			// Initialise all instruments
			const guitar = new Guitar();
			const vibraphone = new Vibraphone();

			await Promise.all([guitar.initialise(), vibraphone.initialise()]);

			instruments.set('Guitar', guitar);
			instruments.set('Vibraphone', vibraphone);
		} catch (error) {
			console.error('Error initialising instruments:', error);
		}
	}

	function resizeCanvas() {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	// Connect to WebSocket as screen client
	function connectWebSocket() {
		if (!browser || isCleaningUp) return;

		// Clear existing connection if any
		if (ws) {
			ws.close();
			ws = null;
		}

		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const wsUrl = `${protocol}//${window.location.host}/ws`;

			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				connected = true;
				if (ws) {
					ws.send(JSON.stringify({ type: 'screen' }));
				}
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);

					switch (message.type) {
						case 'strum_event':
							// Trigger specific instrument if provided, default to Guitar
							const instrumentName = message.instrument || 'Guitar';
							triggerInstrument(instrumentName);
							break;

						default:
							// Ignore unknown message types (including heartbeat_event)
							break;
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onclose = () => {
				connected = false;
				if (!isCleaningUp) {
					reconnectTimeout = window.setTimeout(connectWebSocket, 3000);
				}
			};

			ws.onerror = () => {
				connected = false;
			};
		} catch (err) {
			console.error('WebSocket connection error:', err);
		}
	}

	onMount(() => {
		resizeCanvas();
		initWebGL();
		connectWebSocket();
		initialiseInstruments();

		window.addEventListener('resize', resizeCanvas);

		return () => {
			isCleaningUp = true;

			window.removeEventListener('resize', resizeCanvas);

			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout);
				reconnectTimeout = null;
			}

			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}

			if (ws) {
				ws.close();
				ws = null;
			}

			// Cleanup all instruments
			for (const instrument of instruments.values()) {
				instrument.cleanup();
			}
			instruments.clear();
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<div class="status" class:connected>
	{connected ? '●' : '○'}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
		background-color: #000;
	}

	canvas {
		display: block;
		width: 100vw;
		height: 100vh;
	}

	.status {
		position: fixed;
		top: 1rem;
		right: 1rem;
		font-size: 2rem;
		color: #333;
		transition: color 0.3s;
		z-index: 100;
	}

	.status.connected {
		color: #4ade80;
	}
</style>
