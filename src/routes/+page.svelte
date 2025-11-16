<script lang="ts">
	import { browser } from '$app/environment';
	import Instrument from '$lib/components/Instrument.svelte';
	import SettingsIcon from '$lib/components/SettingsIcon.svelte';
	import { onMount } from 'svelte';

	interface AccelerationData {
		x: number | null;
		y: number | null;
		z: number | null;
	}

	// Instrument selection
	const INSTRUMENTS = [
		{
			name: 'Guitar',
			emoji: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3b8.png'
		},
		{
			name: 'Vibraphone',
			emoji: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3b9.png'
		}
	] as const;

	let currentInstrumentIndex = $state(0);
	let selectedInstrument = $derived(INSTRUMENTS[currentInstrumentIndex]);

	let acceleration = $state<AccelerationData>({ x: null, y: null, z: null });
	let permissionNeeded = $state(false);
	let error = $state<string | null>(null);
	let connected = $state(false);

	function cycleInstrument(direction: 'left' | 'right') {
		if (direction === 'left') {
			currentInstrumentIndex =
				(currentInstrumentIndex - 1 + INSTRUMENTS.length) % INSTRUMENTS.length;
		} else {
			currentInstrumentIndex = (currentInstrumentIndex + 1) % INSTRUMENTS.length;
		}
	}

	interface AccelSample {
		x: number;
		y: number;
		z: number;
		timestamp: number;
	}

	// Non-reactive variables for WebSocket management
	let ws: WebSocket | null = null;
	let deviceId = '';
	let heartbeatInterval: number | null = null;
	let reconnectTimeout: number | null = null;
	let isCleaningUp = false;
	let wakeLock: WakeLockSentinel | null = null;

	// Strum detection variables
	let accelHistory: AccelSample[] = [];
	const HISTORY_SIZE = 10; // Keep last 10 samples
	let lastStrumTime = 0;
	const STRUM_DEBOUNCE = 300; // Minimum 300ms between strums
	const JERK_THRESHOLD = 100; // Threshold for jerk magnitude
	const MIN_MOTION_MAGNITUDE = 20; // Minimum acceleration magnitude

	// Generate or retrieve device ID
	function getDeviceId(): string {
		if (!browser) return '';

		let id = localStorage.getItem('deviceId');
		if (!id) {
			// Get device info
			const ua = navigator.userAgent;
			const platform = navigator.platform;

			// Try to determine device type
			let deviceType = 'desktop';
			if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
				if (/iPad|Tablet/i.test(ua)) {
					deviceType = 'tablet';
				} else if (/iPhone/i.test(ua)) {
					deviceType = 'iphone';
				} else if (/Android/i.test(ua)) {
					deviceType = 'android';
				} else {
					deviceType = 'mobile';
				}
			} else if (/Mac/i.test(platform)) {
				deviceType = 'mac';
			} else if (/Win/i.test(platform)) {
				deviceType = 'windows';
			} else if (/Linux/i.test(platform)) {
				deviceType = 'linux';
			}

			// Generate unique suffix
			const uniqueSuffix = Math.random().toString(36).substring(2, 9);

			id = `${deviceType}-${uniqueSuffix}`;
			localStorage.setItem('deviceId', id);
		}
		return id;
	}

	// Initialize WebSocket connection
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
				if (ws && deviceId) {
					ws.send(JSON.stringify({ type: 'connect', deviceId }));
					startHeartbeat();
				}
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);

					if (
						message.type === 'heartbeat_ack' &&
						message.timestamp !== undefined &&
						message.deviceId
					) {
						// Calculate round-trip time from heartbeat echo
						const rtt = Date.now() - message.timestamp;

						// Send calculated ping back to server for storage and broadcast
						if (ws && ws.readyState === WebSocket.OPEN) {
							ws.send(
								JSON.stringify({
									type: 'ping_update',
									deviceId: message.deviceId,
									ping: rtt
								})
							);
						}
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onclose = () => {
				connected = false;
				if (!isCleaningUp) {
					// Attempt to reconnect after 3 seconds
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

	// Send periodic heartbeats every 500ms with timestamp for RTT measurement
	function startHeartbeat() {
		if (heartbeatInterval) clearInterval(heartbeatInterval);

		heartbeatInterval = window.setInterval(() => {
			if (ws && ws.readyState === WebSocket.OPEN && deviceId) {
				ws.send(
					JSON.stringify({
						type: 'heartbeat',
						deviceId,
						timestamp: Date.now()
					})
				);
			}
		}, 500);
	}

	// Request wake lock to prevent screen from sleeping
	async function requestWakeLock() {
		if (!browser || !('wakeLock' in navigator)) return;

		try {
			wakeLock = await navigator.wakeLock.request('screen');
			console.log('Wake lock acquired');

			wakeLock.addEventListener('release', () => {
				console.log('Wake lock released');
			});
		} catch (err) {
			console.error('Failed to acquire wake lock:', err);
		}
	}

	// Initialize on mount
	onMount(() => {
		deviceId = getDeviceId();
		connectWebSocket();
		requestWakeLock();

		if (typeof DeviceMotionEvent !== 'undefined') {
			// @ts-expect-error - requestPermission is iOS-specific
			if (typeof DeviceMotionEvent.requestPermission === 'function') {
				permissionNeeded = true;
			} else {
				// Permission not needed, start listening
				startListening();
			}
		} else {
			error = 'DeviceMotion API not supported';
		}

		// Cleanup function
		return () => {
			isCleaningUp = true;

			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
				heartbeatInterval = null;
			}

			if (reconnectTimeout) {
				clearTimeout(reconnectTimeout);
				reconnectTimeout = null;
			}

			if (ws) {
				ws.close();
				ws = null;
			}

			if (wakeLock) {
				wakeLock.release();
				wakeLock = null;
			}
		};
	});

	async function requestPermission() {
		try {
			// @ts-expect-error - requestPermission is iOS-specific
			const response = await DeviceMotionEvent.requestPermission();
			if (response === 'granted') {
				permissionNeeded = false;
				startListening();
			} else {
				error = 'Permission denied';
			}
		} catch (err) {
			error = `Permission error: ${err}`;
		}
	}

	function startListening() {
		window.addEventListener('devicemotion', handleMotion);
	}

	function detectStrum(): boolean {
		if (accelHistory.length < 3) return false;

		const now = Date.now();

		// Debounce: don't trigger if we just detected a strum
		if (now - lastStrumTime < STRUM_DEBOUNCE) return false;

		// Get the last 3 samples for jerk calculation
		const current = accelHistory[accelHistory.length - 1];
		const previous = accelHistory[accelHistory.length - 2];
		const beforePrevious = accelHistory[accelHistory.length - 3];

		// Calculate time deltas
		const dt1 = (current.timestamp - previous.timestamp) / 1000; // Convert to seconds
		const dt2 = (previous.timestamp - beforePrevious.timestamp) / 1000;

		if (dt1 === 0 || dt2 === 0) return false;

		// Calculate acceleration deltas (jerk = da/dt)
		const jerkX = (current.x - previous.x) / dt1 - (previous.x - beforePrevious.x) / dt2;
		const jerkY = (current.y - previous.y) / dt1 - (previous.y - beforePrevious.y) / dt2;
		const jerkZ = (current.z - previous.z) / dt1 - (previous.z - beforePrevious.z) / dt2;

		// Calculate jerk magnitude
		const jerkMagnitude = Math.sqrt(jerkX * jerkX + jerkY * jerkY + jerkZ * jerkZ);

		// Calculate current acceleration magnitude
		const accelMagnitude = Math.sqrt(
			current.x * current.x + current.y * current.y + current.z * current.z
		);

		// Detect strum: high jerk (sudden change) with sufficient motion
		if (jerkMagnitude > JERK_THRESHOLD && accelMagnitude > MIN_MOTION_MAGNITUDE) {
			// Additional validation: check for dominant axis motion
			// Strums typically have strong motion in one or two axes
			const maxAxisAccel = Math.max(Math.abs(current.x), Math.abs(current.y), Math.abs(current.z));
			const motionConcentration = maxAxisAccel / accelMagnitude;

			// If motion is concentrated in one axis (> 60%), it's likely a deliberate strum
			if (motionConcentration > 0.6) {
				lastStrumTime = now;
				return true;
			}
		}

		return false;
	}

	function handleMotion(event: DeviceMotionEvent) {
		const acc = event.accelerationIncludingGravity;
		if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
			// Update local display
			acceleration = {
				x: acc.x,
				y: acc.y,
				z: acc.z
			};

			// Add to history for strum detection
			accelHistory.push({
				x: acc.x,
				y: acc.y,
				z: acc.z,
				timestamp: Date.now()
			});

			// Keep history at fixed size
			if (accelHistory.length > HISTORY_SIZE) {
				accelHistory.shift();
			}

			// Detect strum and send event immediately
			if (detectStrum()) {
				if (ws && ws.readyState === WebSocket.OPEN && deviceId) {
					ws.send(
						JSON.stringify({
							type: 'strum',
							deviceId,
							instrument: selectedInstrument.name,
							intensity: Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z)
						})
					);
				}
			}
		}
	}
</script>

<div class="container">
	<div class="status" class:connected>
		{connected ? '●' : '○'}
	</div>

	<div class="status-id" class:connected>{deviceId}</div>

	<SettingsIcon></SettingsIcon>

	{#if error}
		<div class="error">{error}</div>
	{:else if permissionNeeded}
		<div class="permission">
			<p>Accelerometer access required</p>
			<button onclick={requestPermission}>Enable Accelerometer</button>
		</div>
	{:else}
		<Instrument
			instrumentName={selectedInstrument.name}
			imgUrl={selectedInstrument.emoji}
			onCycleLeft={() => cycleInstrument('left')}
			onCycleRight={() => cycleInstrument('right')}
		/>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	.container {
		width: 100vw;
		height: 100vh;
		background-color: #000;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: monospace;
		font-size: 1.5rem;
	}

	.permission,
	.error {
		text-align: center;
		padding: 2rem;
	}

	.permission p {
		margin-bottom: 1.5rem;
		font-size: 1.2rem;
	}

	button {
		background-color: #fff;
		color: #000;
		border: none;
		padding: 1rem 2rem;
		font-size: 1rem;
		font-family: monospace;
		cursor: pointer;
		border-radius: 0.5rem;
	}

	button:active {
		transform: scale(0.95);
	}

	.error {
		color: #ff6b6b;
	}

	.status {
		position: absolute;
		top: 1rem;
		left: 1rem;
		font-size: 2rem;
		color: #666;
		transition: color 0.3s;
		line-height: 16px;
	}

	.status-id {
		position: absolute;
		top: 1.04rem;
		left: 2.75rem;
		font-size: 1rem;
		color: #666;
		transition: color 0.3s;
	}

	.status.connected,
	.status-id.connected {
		color: #4ade80;
	}
</style>
