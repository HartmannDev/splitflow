import type { FastifyInstance } from 'fastify'
import { buildAuthController } from './controller.ts'
import { loginOptions, meOptions, logoutOptions, signupOptions } from './docs.ts'
import { requireAuth } from './route-validator.ts'
import type { AppDependency } from '../../types/app.js'

export async function authRoute(app: FastifyInstance, deps: AppDependency) {
	const { login, logout, me, signup } = buildAuthController(deps)

	app.post('/login', { schema: loginOptions }, login)
	app.post('/logout', { schema: logoutOptions, preHandler: requireAuth }, logout)
	app.get('/me', { schema: meOptions, preHandler: requireAuth }, me)
	app.post('/signup', { schema: signupOptions }, signup)
}
