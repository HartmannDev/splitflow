import type { FastifyInstance } from 'fastify'
import { login, logout, me } from './controller.ts'
import { loginOptions, meOptions, logoutOptions } from './docs.ts'

export async function authRoute(app: FastifyInstance) {
	app.post('/login', { schema: loginOptions }, login)
	app.post('/logout', { schema: logoutOptions }, logout)
	app.get('/me', { schema: meOptions }, me)
}
