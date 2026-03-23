import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '../../db/db.ts'
import type { LoginInput } from './model.ts'
import { verifyHash } from './hash-validator.ts'

type LoginRequest = FastifyRequest<{
	Body: LoginInput
}>

export const login = async (req: LoginRequest, res: FastifyReply) => {
	const { email, password } = req.body as LoginInput

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
		id: user.id,
		userId: user.id,
		email: user.email,
		role: user.role,
	}

	return res.send({ message: 'Login successful' })
}

export const logout = async (req: FastifyRequest, res: FastifyReply) => {
	await req.session.destroy()
	return res.status(200).send({ message: 'Logged out' })
}

export const me = async (req: FastifyRequest, res: FastifyReply) => {
	return res.status(200).send({ sessionUser: req.session.user })
}
