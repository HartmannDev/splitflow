import type { FastifyReply, FastifyRequest } from 'fastify'

import { notFoundError } from '../../common/errors.ts'
import { UserListSchema, type UserID } from './model.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import type { AppDependency } from '../../types/app.js'

export const buildUserController = (deps: AppDependency) => {
	const { db } = deps

	const getUsers = async (_req: FastifyRequest, res: FastifyReply) => {
		const payload = await db.query(
			`SELECT
				id,
				role,
				name,
				last_name as "lastname",
				email,
				is_active as "isActive",
				to_json(email_verified_at) as "emailVerifiedAt",
				to_json(created_at) as "createdAt",
				to_json(updated_at) as "updatedAt",
				to_json(deleted_at) as "deletedAt"
			FROM users`,
		)

		return validatedResponse(res, 200, UserListSchema, payload.rows)
	}

	const deleteUser = async (req: FastifyRequest, res: FastifyReply) => {
		const { id } = req.params as UserID
		const result = await db.query(
			`
			UPDATE users 
			SET deleted_at = NOW(),
				updated_at = NOW(),
				is_active = false
			WHERE id = $1`,
			[id],
		)

		if (result.rowCount === 0) {
			throw notFoundError('User not found')
		}

		return res.code(200).send({ message: 'User deleted successfully' })
	}

	return {
		getUsers,
		deleteUser,
	}
}
