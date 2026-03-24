import { randomUUID } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcrypt'
import { conflictError, isDatabaseError, notFoundError } from '../../common/errors.ts'

import { type CreateUserInput, type UserID, UserIDSchema, UserListSchema } from './model.ts'
import { db } from '../../db/db.ts'
import { validatedResponse } from '../../common/response-validator.ts'

const passwordPepper = process.env.PASSWORD_PEPPER

if (!passwordPepper) {
	throw new Error('PASSWORD_PEPPER environment variable is not set!')
}

export const getUsers = async (_req: FastifyRequest, res: FastifyReply) => {
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

export const createUser = async (req: FastifyRequest, res: FastifyReply) => {
	const { name, lastname, email, password } = req.body as CreateUserInput
	const userID = randomUUID()
	const passwordSalt = await bcrypt.genSalt(10)
	const passwordHash = await bcrypt.hash(password + passwordPepper, passwordSalt)
	const normalizedEmail = email.toLowerCase()

	try {
		await db.query(
			`
				INSERT INTO users (
					id,
					role,
					name,
					last_name,
					email,
					password_hash,
					email_verified_at
				) VALUES
				($1, $2, $3, $4, $5, $6, $7)
			`,
			[userID, 'user', name, lastname, normalizedEmail, passwordHash, null],
		)
		return validatedResponse(res, 201, UserIDSchema, { message: 'User created successfully', userID })
	} catch (error) {
		if (isDatabaseError(error) && error.code === '23505') {
			throw conflictError('Email already in use')
		}

		throw error
	}
}

export const deleteUser = async (req: FastifyRequest, res: FastifyReply) => {
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
