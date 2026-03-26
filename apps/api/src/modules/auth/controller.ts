import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { UserSchemas } from '../users/model.ts'
import { buildHashValidator } from './hash-validator.ts'

import type { AppDependency } from '../../types/app.js'
import type { CreateUserType } from '../users/model.ts'
import type { EmailType, LoginType, ResetPasswordType, TokenType } from './model.ts'

type VerifyEmailReqType = FastifyRequest<{
	Querystring: {
		token: TokenType
	}
}>

type ForgotPasswordReqType = FastifyRequest<{
	Body: EmailType
}>

type ResetPasswordReqType = FastifyRequest<{
	Body: ResetPasswordType
}>

const TOKEN_EXPIRY_TIME = 1000 * 60 * 10 // 10 minutes

export const buildAuthController = (deps: AppDependency) => {
	const db = deps.db
	const emailTransporter = deps.emailTransporter
	const { passwordPepper, nodeEnv } = deps.config
	const requiresVerifiedEmailSession = nodeEnv === 'prod'

	const { UserSchema } = UserSchemas()

	const { createHash, verifyHash, hashToken, createRandomToken } = buildHashValidator(passwordPepper)
	const { badRequestError, unauthorizedError, conflictError, isDatabaseError } = AppError()

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

	const login = async (req: FastifyRequest, res: FastifyReply) => {
		const { email, password } = req.body as LoginType

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

		const user = payload.rows[0]
		if (payload.rowCount === 0) {
			throw unauthorizedError('Invalid email or password')
		}

		const isValidPassword = await verifyHash(password, user.passwordHash)
		if (!isValidPassword) {
			throw unauthorizedError('Invalid email or password')
		}

		if (requiresVerifiedEmailSession && user.emailVerifiedAt === null) {
			throw unauthorizedError('Email verification required before login')
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

		return validatedResponse(res, 200, UserSchema, user)
	}

	const signup = async (req: FastifyRequest, res: FastifyReply) => {
		const { name, lastname, email, password } = req.body as CreateUserType
		const userID = randomUUID()
		const { passwordHash } = await createHash(password)
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

			await sendVerificationEmail(userID, normalizedEmail)

			return res.status(201).send({ message: `User created successfully. Verification email sent.`, userID })
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Email already in use')
			}

			throw error
		}
	}

	const verifyEmail = async (req: VerifyEmailReqType, res: FastifyReply) => {
		const { token } = req.query
		const tokenHash = hashToken(token)

		const payload = await db.query(
			`
			SELECT user_id
			FROM verification_tokens
			WHERE token = $1
			AND expires_at > NOW()
			`,
			[tokenHash],
		)

		if (payload.rowCount === 0) {
			throw badRequestError('Invalid or expired token')
		}

		const { user_id } = payload.rows[0]

		await db.transaction(async (pool) => {
			await pool.query(
				`
				UPDATE users
				SET email_verified_at = NOW()
				WHERE id = $1
			`,
				[user_id],
			)

			await pool.query(
				`
				DELETE FROM verification_tokens
				WHERE user_id = $1
			`,
				[user_id],
			)
		})

		return res.status(200).send({ message: 'Email verified successfully' })
	}

	const forgotPassword = async (req: ForgotPasswordReqType, res: FastifyReply) => {
		const { email } = req.body
		const normalizedEmail = email.toLowerCase()

		const payload = await db.query(
			`
				SELECT id
				FROM users
				WHERE lower(email) = lower($1)
					AND deleted_at IS NULL
			`,
			[normalizedEmail],
		)

		if (payload.rowCount === 0) {
			return res.status(200).send({ message: 'Confirmation email was sent to reset the password.' })
		}

		const { id: userId } = payload.rows[0]

		await sendResetPasswordEmail(userId, normalizedEmail)

		return res.status(200).send({ message: 'Confirmation email was sent to reset the password.' })
	}

	const resetUserPassword = async (req: ResetPasswordReqType, res: FastifyReply) => {
		const { password, token } = req.body
		const tokenHash = hashToken(token)
		const { passwordHash } = await createHash(password)

		const payload = await db.query(
			`
			SELECT user_id
			FROM verification_tokens
			WHERE token = $1
			AND expires_at > NOW()
			`,
			[tokenHash],
		)

		if (payload.rowCount === 0) {
			throw badRequestError('Invalid or expired token')
		}

		const { user_id } = payload.rows[0]

		await db.transaction(async (pool) => {
			await pool.query(
				`
					UPDATE users
					SET password_hash = $1,
						updated_at = NOW()
					WHERE id = $2
						AND deleted_at IS NULL
				`,
				[passwordHash, user_id],
			)

			await pool.query(
				`
					DELETE FROM verification_tokens
					WHERE token = $1
				`,
				[tokenHash],
			)
		})

		return res.status(200).send({ message: 'Password updated.' })
	}

	const sendVerificationEmail = async (userId: string, email: string) => {
		const { token, tokenHash } = await createRandomToken()

		await db.query(
			`
			INSERT INTO verification_tokens (user_id, token, expires_at)
			VALUES ($1, $2, now() + $3::INTERVAL)
		`,
			[userId, tokenHash, `${TOKEN_EXPIRY_TIME}ms`],
		)

		const emailInfo = await emailTransporter.sendMail({
			from: 'Splitflow <noreply@splitflow.com>',
			to: email,
			subject: 'Verify your email address',
			html: `
				<p>Click the link below to verify your email address:</p>
				<p>
					<a href="http://localhost:3000/verify-email?token=${token}">Verify Email</a>
				</p>
				<p>This link will expire in 10 minutes.</p>`,
		})

		return emailInfo
	}

	const sendResetPasswordEmail = async (userId: string, email: string) => {
		const { token, tokenHash } = await createRandomToken()

		await db.query(
			`
			INSERT INTO verification_tokens (user_id, token, expires_at)
			VALUES ($1, $2, now() + $3::INTERVAL)
		`,
			[userId, tokenHash, `${TOKEN_EXPIRY_TIME}ms`],
		)

		const emailInfo = await emailTransporter.sendMail({
			from: 'Splitflow <noreply@splitflow.com>',
			to: email,
			subject: 'Reset your password',
			html: `
				<p>Click the link below to reset your password:</p>
				<p>
					<a href="http://localhost:3000/reset-password?token=${token}">Reset Password</a>
				</p>
				<p>This link will expire in 10 minutes.</p>`,
		})

		return emailInfo
	}

	return {
		login,
		logout,
		me,
		signup,
		verifyEmail,
		resetUserPassword,
		forgotPassword,
	}
}
