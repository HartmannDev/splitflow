import type { FastifyInstance } from 'fastify'
import { createUser, deleteUser, getUsers } from './controller.ts'
import { createUserOptions, deleteUserOptions, getUsersOptions } from './docs.ts'
import { requireAuth, requireRole } from '../auth/route-validator.ts'

export async function UsersRoute(app: FastifyInstance) {
	app.get('/users', { schema: getUsersOptions, preHandler: [requireAuth, requireRole('admin')] }, getUsers)

	app.post('/users', { schema: createUserOptions }, createUser)
	app.delete('/users/:id', { schema: deleteUserOptions, preHandler: [requireAuth, requireRole('admin')] }, deleteUser)
}
