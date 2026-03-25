import { describe, expect, it } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { requireAuth, requireRole } from '../../src/modules/auth/route-validator.ts'

const createRequest = (user?: { userId: string; email: string; role: 'user' | 'admin' }) =>
	({
		session: {
			user,
		},
	}) as FastifyRequest

const reply = {} as FastifyReply

describe('auth route validators', () => {
	it('requireAuth throws when there is no session user', async () => {
		const request = createRequest()

		await expect(requireAuth(request, reply)).rejects.toMatchObject({
			name: 'Unauthorized',
			statusCode: 401,
			message: 'You must be logged in to access this route',
		})
	})

	it('requireAuth resolves when there is a session user', async () => {
		const request = createRequest({
			userId: 'user-1',
			email: 'test@example.com',
			role: 'user',
		})

		await expect(requireAuth(request, reply)).resolves.toBeUndefined()
	})

	it('requireRole throws unauthorized when there is no session user', async () => {
		const request = createRequest()

		await expect(requireRole('admin')(request, reply)).rejects.toMatchObject({
			name: 'Unauthorized',
			statusCode: 401,
		})
	})

	it('requireRole throws forbidden when the user has the wrong role', async () => {
		const request = createRequest({
			userId: 'user-1',
			email: 'test@example.com',
			role: 'user',
		})

		await expect(requireRole('admin')(request, reply)).rejects.toMatchObject({
			name: 'Forbidden',
			statusCode: 403,
			message: 'You do not have permission to access this resource',
		})
	})

	it('requireRole resolves when the user has the expected role', async () => {
		const request = createRequest({
			userId: 'admin-1',
			email: 'admin@example.com',
			role: 'admin',
		})

		await expect(requireRole('admin')(request, reply)).resolves.toBeUndefined()
	})
})
