import { createServer } from 'http';
import { handler } from './build/handler.js';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server with SvelteKit handler
const server = createServer(handler);

// Setup WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Connection tracking
const devices = new Map();
const dashboards = new Set();
const screens = new Set();
let heartbeatInterval = null;
let initialised = false;

function initConnectionManager() {
	if (initialised) return;
	initialised = true;

	// Check for stale connections every 5 seconds
	heartbeatInterval = setInterval(() => {
		const now = Date.now();
		for (const [deviceId, device] of devices.entries()) {
			if (now - device.lastSeen > 15000) {
				devices.delete(deviceId);
				broadcastDeviceList();
			}
		}
	}, 5000);
}

function broadcastDeviceList() {
	const deviceList = Array.from(devices.values()).map(({ id, connectedAt, lastSeen, ping }) => ({
		id,
		connectedAt,
		lastSeen,
		ping
	}));

	for (const dashboard of dashboards) {
		try {
			dashboard.send(JSON.stringify({ type: 'devices', devices: deviceList }));
		} catch (error) {
			console.error('Error sending device list:', error);
		}
	}
}

function broadcastToScreens(message) {
	for (const screen of screens) {
		try {
			screen.send(JSON.stringify(message));
		} catch (error) {
			console.error('Error broadcasting to screen:', error);
		}
	}
}

// Handle HTTP upgrade for WebSocket
server.on('upgrade', (request, socket, head) => {
	if (request.url === '/ws') {
		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit('connection', ws, request);
		});
	}
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
	let deviceId = null;
	let isDashboard = false;
	let isScreen = false;

	ws.on('message', (data) => {
		try {
			const message = JSON.parse(data.toString());

			switch (message.type) {
				case 'connect':
					if (message.deviceId) {
						initConnectionManager();
						deviceId = message.deviceId;
						devices.set(deviceId, {
							id: deviceId,
							connectedAt: Date.now(),
							lastSeen: Date.now(),
							ws
						});
						broadcastDeviceList();
						console.log(`Device connected: ${deviceId}`);
					}
					break;

				case 'heartbeat':
					if (message.deviceId) {
						const device = devices.get(message.deviceId);
						if (device) {
							device.lastSeen = Date.now();
							broadcastDeviceList();
							broadcastToScreens({ type: 'heartbeat_event', deviceId: message.deviceId });
						}

						// Echo timestamp back for RTT measurement
						if (message.timestamp !== undefined) {
							try {
								ws.send(
									JSON.stringify({
										type: 'heartbeat_ack',
										deviceId: message.deviceId,
										timestamp: message.timestamp
									})
								);
							} catch (error) {
								console.error('Error sending heartbeat ack:', error);
							}
						}
					}
					break;

				case 'dashboard':
					initConnectionManager();
					isDashboard = true;
					dashboards.add(ws);
					broadcastDeviceList();
					console.log('Dashboard connected');
					break;

				case 'screen':
					initConnectionManager();
					isScreen = true;
					screens.add(ws);
					console.log('Screen connected');
					break;

				case 'strum':
					if (message.deviceId && message.instrument) {
						const device = devices.get(message.deviceId);
						if (device) {
							device.lastSeen = Date.now();
							broadcastToScreens({
								type: 'strum_event',
								deviceId: message.deviceId,
								instrument: message.instrument,
								intensity: message.intensity || 1.0
							});
						}
					}
					break;

				case 'ping_update':
					if (message.deviceId && message.ping !== undefined) {
						const device = devices.get(message.deviceId);
						if (device) {
							device.ping = message.ping;
							broadcastDeviceList();
						}
					}
					break;
			}
		} catch (error) {
			console.error('Error parsing WebSocket message:', error);
		}
	});

	ws.on('close', () => {
		if (isDashboard) {
			dashboards.delete(ws);
			console.log('Dashboard disconnected');
		} else if (isScreen) {
			screens.delete(ws);
			console.log('Screen disconnected');
		} else if (deviceId) {
			devices.delete(deviceId);
			broadcastDeviceList();
			console.log(`Device disconnected: ${deviceId}`);
		}
	});

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
});

console.log('WebSocket server initialised on /ws');

// Start server
server.listen(PORT, HOST, () => {
	console.log(`Server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
	console.log('\nShutting down server...');

	if (heartbeatInterval) {
		clearInterval(heartbeatInterval);
	}

	wss.close();

	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
