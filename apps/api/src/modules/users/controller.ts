import { randomUUID } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { conflictError, forbiddenError, isDatabaseError, notFoundError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import type { AppDependency } from '../../types/app.js'
import { buildHashValidator } from '../auth/hash-validator.ts'
import {
	type CreateManagedUserInput,
	CreateUserResponseSchema,
	type GetUsersQueryInput,
	PublicUserSchema,
	type ResetUserPasswordInput,
	ResetUserPasswordResponseSchema,
	type UpdateManagedUserInput,
	type UpdateOwnUserInput,
	type UserID,
	UserListSchema,
} from './model.ts'

const userSelectSql = `SELECT
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
FROM users`

export const buildUserController = (deps: AppDependency) => {
	const { db } = deps
	const { passwordPepper, nodeEnv } = deps.config
	const hashValidator = buildHashValidator(passwordPepper)
	const buildTemporaryPassword = () => `Temp-${randomUUID()}!Aa1`

	const getUserById = async (id: string, includeDeleted = false) => {
		const payload = await db.query(
			`${userSelectSql}
			WHERE id = $1
			${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[id],
		)

		return payload.rows[0]
	}

	const getUsers = async (req: FastifyRequest, res: FastifyReply) => {
		const { includeInactive = false } = req.query as GetUsersQueryInput
		const payload = await db.query(
			`${userSelectSql}
			${includeInactive ? '' : 'WHERE deleted_at IS NULL'}
			ORDER BY created_at DESC`,
		)

		return validatedResponse(res, 200, UserListSchema, payload.rows)
	}

	const getUser = async (req: FastifyRequest, res: FastifyReply) => {
		const { id } = req.params as UserID
		const user = await getUserById(id)

		if (!user) {
			throw notFoundError('User not found')
		}

		return validatedResponse(res, 200, PublicUserSchema, user)
	}

	const updateManagedUser = async (req: FastifyRequest, res: FastifyReply) => {
		const { id } = req.params as UserID
		const body = req.body as UpdateManagedUserInput
		const sessionUser = req.session.user!

		if (sessionUser.userId === id) {
			throw forbiddenError('Admins cannot manage their own account lifecycle')
		}

		const currentUser = await getUserById(id, true)
		if (!currentUser) {
			throw notFoundError('User not found')
		}

		const nextRole = body.role ?? currentUser.role
		const nextIsActive = body.isActive ?? currentUser.isActive

		const payload = await db.query(
			`UPDATE users
			SET role = $2,
				is_active = $3,
				deleted_at = CASE
					WHEN $3 = true THEN NULL
					WHEN deleted_at IS NULL THEN NOW()
					ELSE deleted_at
				END,
				updated_at = NOW()
			WHERE id = $1
			RETURNING
				id,
				role,
				name,
				last_name as "lastname",
				email,
				is_active as "isActive",
				to_json(email_verified_at) as "emailVerifiedAt",
				to_json(created_at) as "createdAt",
				to_json(updated_at) as "updatedAt",
				to_json(deleted_at) as "deletedAt"`,
			[id, nextRole, nextIsActive],
		)

		return validatedResponse(res, 200, PublicUserSchema, payload.rows[0])
	}

	const createUser = async (req: FastifyRequest, res: FastifyReply) => {
		const { name, lastname, email, role = 'user' } = req.body as CreateManagedUserInput
		const userID = randomUUID()
		const { passwordHash } = await hashValidator.createHash(buildTemporaryPassword())
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
				[userID, role, name, lastname, normalizedEmail, passwordHash, null],
			)
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Email already in use')
			}

			throw error
		}

		return validatedResponse(res, 201, CreateUserResponseSchema, {
			message: 'User created successfully',
			userID,
		})
	}

	const updateOwnUser = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const body = req.body as UpdateOwnUserInput

		const currentUser = await getUserById(sessionUser.userId)
		if (!currentUser) {
			await req.session.destroy()
			throw notFoundError('User not found')
		}

		const nextEmail = body.email ? body.email.toLowerCase() : currentUser.email
		const emailChanged = nextEmail !== currentUser.email
		const nextEmailVerifiedAt = emailChanged ? null : currentUser.emailVerifiedAt

		try {
			const payload = await db.query(
				`UPDATE users
				SET name = $2,
					last_name = $3,
					email = $4,
					email_verified_at = $5,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					role,
					name,
					last_name as "lastname",
					email,
					is_active as "isActive",
					to_json(email_verified_at) as "emailVerifiedAt",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[
					sessionUser.userId,
					body.name ?? currentUser.name,
					body.lastname ?? currentUser.lastname,
					nextEmail,
					nextEmailVerifiedAt,
				],
			)

			const updatedUser = payload.rows[0]

			if (emailChanged && nodeEnv === 'prod') {
				await req.session.destroy()
			} else {
				req.session.user = {
					...sessionUser,
					email: updatedUser.email,
				}
			}

			return validatedResponse(res, 200, PublicUserSchema, updatedUser)
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Email already in use')
			}

			throw error
		}
	}

	const resetUserPassword = async (req: FastifyRequest, res: FastifyReply) => {
		const { id } = req.params as UserID
		const { password } = req.body as ResetUserPasswordInput
		const user = await getUserById(id)
		if (!user) {
			throw notFoundError('User not found')
		}

		const { passwordHash } = await hashValidator.createHash(password)
		await db.query(
			`
			UPDATE users
			SET password_hash = $2,
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id, passwordHash],
		)

		return validatedResponse(res, 200, ResetUserPasswordResponseSchema, {
			message: 'Password reset successfully',
		})
	}

	const deleteUser = async (req: FastifyRequest, res: FastifyReply) => {
		const { id } = req.params as UserID
		const sessionUser = req.session.user!

		if (sessionUser.userId === id) {
			throw forbiddenError('Admins cannot delete their own account')
		}

		const result = await db.query(
			`
			UPDATE users 
			SET deleted_at = NOW(),
				updated_at = NOW(),
				is_active = false
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		if (result.rowCount === 0) {
			throw notFoundError('User not found')
		}

		return res.code(200).send({ message: 'User deleted successfully' })
	}

	return {
		createUser,
		getUser,
		getUsers,
		resetUserPassword,
		deleteUser,
		updateManagedUser,
		updateOwnUser,
	}
}
