function readEnv(name: string, fallback: string) {
	const value = import.meta.env[name]

	if (typeof value === 'string' && value.trim().length > 0) {
		return value
	}

	return fallback
}

export const appConfig = {
	apiBaseUrl: readEnv('VITE_API_BASE_URL', '/api'),
	appBaseUrl: readEnv('VITE_APP_BASE_URL', 'http://localhost:5173'),
}
