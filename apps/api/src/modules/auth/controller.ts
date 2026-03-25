import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'

import type { LoginInput } from './model.ts'

import { verifyHash } from './hash-validator.ts'
import type { CreateUserInput } from '../users/model.ts'
import { conflictError, isDatabaseError } from '../../common/errors.ts'
import type { AppDependency } from '../../types/app.js'

type LoginRequest = FastifyRequest<{
	Body: LoginInput
}>

type SignupRequest = FastifyRequest<{
	Body: CreateUserInput
}>

export const buildAuthController = (deps: AppDependency) => {
	const db = deps.db
	const passwordPepper = deps.config.passwordPepper

	const login = async (req: LoginRequest, res: FastifyReply) => {
		const { email, password } = req.body as LoginInput

		if (req.session.user) {
			await req.session.destroy()
		}

		const payload = await db.query(
			`
			SELECT id, email, password_hash, role
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

		const isValidPassword = await verifyHash(password, user.password_hash)
		if (!isValidPassword) {
			return res.status(401).send({ message: 'Invalid email or password' })
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
		return res.status(200).send({ sessionUser: req.session.user })
	}

	const signup = async (req: SignupRequest, res: FastifyReply) => {
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
						($1,'user', $2, $3, $4, $5, $6)
					`,
				[userID, name, lastname, normalizedEmail, passwordHash, null],
			)

			await req.session.regenerate()
			req.session.user = {
				userId: userID,
				email: normalizedEmail,
				role: 'user',
			}

			return res.status(201).send({ message: 'User created successfully', id: userID })
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
