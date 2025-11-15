import type { Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { connectionManager } from './connection-manager';

export function webSocketPlugin(): Plugin {
	let wss: WebSocketServer;

	return {
		name: 'websocket-plugin',
		configureServer(server) {
			wss = new WebSocketServer({ noServer: true });

			server.httpServer?.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
				if (request.url === '/ws') {
					wss.handleUpgrade(request, socket, head, (ws) => {
						wss.emit('connection', ws, request);
					});
				}
			});

			wss.on('connection', (ws) => {
				let deviceId: string | null = null;
				let isDashboard = false;
				let isScreen = false;

				ws.on('message', (data) => {
					try {
						const message = JSON.parse(data.toString());

						switch (message.type) {
							case 'connect':
								if (message.deviceId) {
									deviceId = message.deviceId as string;
									connectionManager.registerDevice(deviceId, ws);
									console.log(`Device connected: ${deviceId}`);
								}
								break;

							case 'heartbeat':
								if (message.deviceId) {
									connectionManager.updateHeartbeat(message.deviceId);
								}
								break;

							case 'dashboard':
								isDashboard = true;
								connectionManager.registerDashboard(ws);
								console.log('Dashboard connected');
								break;

							case 'screen':
								isScreen = true;
								connectionManager.registerScreen(ws);
								console.log('Screen connected');
								break;

							case 'accelerometer':
								if (message.deviceId && message.data) {
									connectionManager.updateAccelerometer(message.deviceId, message.data);
								}
								break;
							
							case 'instrument':
								if (message.deviceId && message.data) {
									connectionManager.updateInstrument(message.deviceId, message.data);
								}
								ws.send(JSON.stringify({ type: 'instrument_ack', status: 'received' }));
								break;
				}
			} catch (error) {
				console.error('Error parsing WebSocket message:', error);
			}
		});				ws.on('close', () => {
					if (isDashboard) {
						connectionManager.unregisterDashboard(ws);
						console.log('Dashboard disconnected');
					} else if (isScreen) {
						connectionManager.unregisterScreen(ws);
						console.log('Screen disconnected');
					} else if (deviceId) {
						connectionManager.removeDevice(deviceId);
						console.log(`Device disconnected: ${deviceId}`);
					}
				});

				ws.on('error', (error) => {
					console.error('WebSocket error:', error);
				});
			});

			console.log('WebSocket server initialised on /ws');
		},
		closeBundle() {
			if (wss) {
				wss.close();
				connectionManager.cleanup();
			}
		}
	};
}
