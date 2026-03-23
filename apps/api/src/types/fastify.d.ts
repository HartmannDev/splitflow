import 'fastify'

declare module 'fastify' {
	interface Session {
		user?: {
			id: string
			userId: string
			email: string
			role: 'user' | 'admin'
		}
	}
}
