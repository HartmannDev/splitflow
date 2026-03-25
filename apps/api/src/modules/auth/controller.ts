import { randomUUID } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { conflictError, isDatabaseError, unauthorizedError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import type { AppDependency } from '../../types/app.js'
import { type CreateUserInput, PublicUserSchema } from '../users/model.ts'
import { buildHashValidator } from './hash-validator.ts'
import type { LoginInput } from './model.ts'

type LoginRequest = FastifyRequest<{
	Body: LoginInput
}>

type SignupRequest = FastifyRequest<{
	Body: CreateUserInput
}>

export const buildAuthController = (deps: AppDependency) => {
	const db = deps.db
	const { passwordPepper, nodeEnv } = deps.config
	const hashValidator = buildHashValidator(passwordPepper)
	const requiresVerifiedEmailSession = nodeEnv === 'prod'

	const getPublicUserById = async (userId: string) => {
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
			FROM users
			WHERE id = $1
				AND deleted_at IS NULL`,
			[userId],
		)

		return payload.rows[0]
	}

	const login = async (req: LoginRequest, res: FastifyReply) => {
		const { email, password } = req.body as LoginInput

		if (req.session.user) {
			await req.session.destroy()
		}

		const payload = await db.query(
			`
			SELECT
				id,
				email,
				password_hash as "passwordHash",
				role,
				email_verified_at as "emailVerifiedAt"
			FROM users
			WHERE lower(email) = lower($1)
				AND deleted_at IS NULL
				AND is_active = true
		`,
			[email],
		)

		if (payload.rowCount === 0) {
			return res.status(401).send({ message: 'Invalid email or password' })
		}

		const user = payload.rows[0]

		const isValidPassword = await hashValidator.verifyHash(password, user.passwordHash)

		if (!isValidPassword) {
			return res.status(401).send({ message: 'Invalid email or password' })
		}

		if (requiresVerifiedEmailSession && user.emailVerifiedAt === null) {
			return res.status(401).send({ message: 'Email verification required before login' })
		}

		await req.session.regenerate()
		req.session.user = {
			userId: user.id,
			email: user.email,
			role: user.role,
		}

		return res.send({ message: 'Login successful' })
	}

	const logout = async (req: FastifyRequest, res: FastifyReply) => {
		await req.session.destroy()
		return res.status(200).send({ message: 'Logged out' })
	}

	const me = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!

		const user = await getPublicUserById(sessionUser.userId)
		if (!user) {
			await req.session.destroy()
			throw unauthorizedError('You must be logged in to access this route')
		}

		if (requiresVerifiedEmailSession && user.emailVerifiedAt === null) {
			await req.session.destroy()
			throw unauthorizedError('Email verification required before login')
		}

		return validatedResponse(res, 200, PublicUserSchema, user)
	}

	const signup = async (req: SignupRequest, res: FastifyReply) => {
		const { name, lastname, email, password } = req.body as CreateUserInput
		const userID = randomUUID()
		const { passwordHash } = await hashValidator.createHash(password)
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
						($1,'user', $2, $3, $4, $5, $6)
					`,
				[userID, name, lastname, normalizedEmail, passwordHash, null],
			)

			if (!requiresVerifiedEmailSession) {
				await req.session.regenerate()
				req.session.user = {
					userId: userID,
					email: normalizedEmail,
					role: 'user',
				}
			}

			return res.status(201).send({ message: 'User created successfully', userID })
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Email already in use')
			}

			throw error
		}
	}

	return {
		login,
		logout,
		me,
		signup,
	}
}
