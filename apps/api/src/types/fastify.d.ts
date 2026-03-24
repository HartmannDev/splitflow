import 'fastify'

declare module 'fastify' {
	interface Session {
		user?: {
			userId: string
			email: string
			role: 'user' | 'admin'
		}
	}
}
