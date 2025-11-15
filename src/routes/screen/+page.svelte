<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let connected = $state(false);

	// Non-reactive variables for WebSocket and WebGL management
	let ws: WebSocket | null = null;
	let reconnectTimeout: number | null = null;
	let isCleaningUp = false;
	let gl: WebGLRenderingContext | null = null;
	let program: WebGLProgram | null = null;
	let flashIntensity = 0;
	let animationFrameId: number | null = null;

	// Vertex shader (simple fullscreen quad)
	const vertexShaderSource = `
		attribute vec2 position;
		void main() {
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

	// Fragment shader (black background with flash effect)
	const fragmentShaderSource = `
		precision mediump float;
		uniform float uFlash;
		uniform vec2 uResolution;

		void main() {
			// Base colour is black, flash to white
			vec3 colour = mix(vec3(0.0), vec3(1.0), uFlash);
			gl_FragColor = vec4(colour, 1.0);
		}
	`;

	function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
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

		gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
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
		render();
	}

	function render() {
		if (!gl || !program || isCleaningUp) return;

		// Update flash intensity (decay over time)
		flashIntensity *= 0.92;
		if (flashIntensity < 0.001) flashIntensity = 0;

		// Set uniforms
		const flashLocation = gl.getUniformLocation(program, 'uFlash');
		gl.uniform1f(flashLocation, flashIntensity);

		const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
		gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

		// Clear and draw
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		animationFrameId = requestAnimationFrame(render);
	}

	function triggerFlash() {
		flashIntensity = 1.0;
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
					if (message.type === 'heartbeat_event') {
						triggerFlash();
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
