import type { FastifyReply, FastifyRequest } from 'fastify'

import { db } from '../../db/db.ts'
import type { LoginInput } from './model.ts'
import { verifyHash } from './hash-validator.ts'

type LoginRequest = FastifyRequest<{
	Body: LoginInput
}>

export const login = async (req: LoginRequest, res: FastifyReply) => {
	//find user by email
	const { email, password } = req.body as LoginInput

	const payload = await db.query(
		`
		SELECT id, password_hash, password_salt, role FROM users WHERE email = $1
	`,
		[email],
	)

	if (payload.rowCount === 0) {
		return res.status(401).send({ message: 'Invalid email or password' })
	}
	console.log(payload.rows[0])
	//compare password
	const user = payload.rows[0]

	const isValidPassword = await verifyHash(password, user.password_hash)
	if (!isValidPassword) {
		return res.status(401).send({ message: 'Invalid email or password' })
	}

	//generate token
	await req.session.regenerate()
	req.session.user = {
		id: user.id,
		userId: user.id,
		email,
		role: user.role,
	}

	return res.send({ message: 'Login successful' })
}

export const logout = async (req: FastifyRequest, res: FastifyReply) => {
	const sessionUser = req.session.user
	if (!sessionUser) return res.status(401).send({ message: 'No valid session found' })

	await req.session.destroy()
	return res.status(200).send({ message: 'Logged out' })
}

export const me = async (req: FastifyRequest, res: FastifyReply) => {
	const sessionUser = req.session.user
	if (!sessionUser) return res.status(401).send({ message: 'No valid session found' })

	return res.status(200).send({ sessionUser })
}
