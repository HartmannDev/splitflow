import type { FastifyInstance } from 'fastify'
import { createUser, deleteUser, getUsers } from './controller.ts'
import { createUserOptions, deleteUserOptions, getUsersOptions } from './docs.ts'

export async function UsersRoute(app: FastifyInstance) {
	app.get('/users', { schema: getUsersOptions }, getUsers)

	app.post('/users', { schema: createUserOptions }, createUser)
	app.delete('/users/:id', { schema: deleteUserOptions }, deleteUser)
}
