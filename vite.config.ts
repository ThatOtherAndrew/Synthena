import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { webSocketPlugin } from './src/lib/server/websocket-plugin';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit(), devtoolsJson(), ...(mode === 'development' ? [webSocketPlugin()] : [])],

	server: {
		allowedHosts: ['tunnel.thatother.dev']
	}
}));
