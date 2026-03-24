import type { FastifyInstance } from 'fastify'
import { login, logout, me, signup } from './controller.ts'
import { loginOptions, meOptions, logoutOptions, signupOptions } from './docs.ts'
import { requireAuth } from './route-validator.ts'

export async function authRoute(app: FastifyInstance) {
	app.post('/login', { schema: loginOptions }, login)
	app.post('/logout', { schema: logoutOptions, preHandler: requireAuth }, logout)
	app.get('/me', { schema: meOptions, preHandler: requireAuth }, me)
	app.post('/signup', { schema: signupOptions }, signup)
}
