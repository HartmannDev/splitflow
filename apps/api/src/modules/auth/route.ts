import type { FastifyInstance } from 'fastify'

import { buildAuthController } from './controller.ts'
import { buildAuthDocs } from './docs.ts'
import { requireAuth } from './route-validator.ts'

import type { AppDependency } from '../../types/app.js'

export async function authRoute(app: FastifyInstance, deps: AppDependency) {
	const { login, logout, me, signup, verifyEmail, resetUserPassword, forgotPassword } = buildAuthController(deps)
	const { loginDocs, logoutDocs, meDocs, signupDocs, verifyEmailDocs, resetUserPasswordDocs, forgotPasswordDocs } =
		buildAuthDocs()

	app.post('/login', { schema: loginDocs }, login)
	app.post('/logout', { schema: logoutDocs, preHandler: requireAuth }, logout)
	app.get('/me', { schema: meDocs, preHandler: requireAuth }, me)
	app.post('/signup', { schema: signupDocs }, signup)
	app.get('/verify-email', { schema: verifyEmailDocs }, verifyEmail)
	app.post('/reset-password', { schema: resetUserPasswordDocs }, resetUserPassword)
	app.post('/forgot-password', { schema: forgotPasswordDocs }, forgotPassword)
}
