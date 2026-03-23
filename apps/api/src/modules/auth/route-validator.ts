import type { FastifyReply, FastifyRequest } from 'fastify'
import { forbiddenError, unauthorizedError } from '../../common/errors.ts'

export const requireAuth = async (req: FastifyRequest, _res: FastifyReply) => {
	if (!req.session.user) {
		throw unauthorizedError('You must be logged in to access this route')
	}
}

export const requireRole = (role: 'user' | 'admin') => {
	return async (req: FastifyRequest, _res: FastifyReply) => {
		const sessionUser = req.session.user

		if (!sessionUser) {
			throw unauthorizedError('You must be logged in to access this route')
		}

		if (sessionUser.role !== role) {
			throw forbiddenError('You do not have permission to access this resource')
		}
	}
}
