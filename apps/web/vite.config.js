import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': '/src',
		},
	},
	server: {
		host: true,
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				rewrite: (path) => {
					return path.replace(/^\/api/, '')
				},
			},
		},
	},
	test: {
		globals: true,
		setupFiles: './src/test/setup.ts',
		css: true,
	},
})
