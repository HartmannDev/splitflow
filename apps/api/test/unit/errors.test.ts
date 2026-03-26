import { describe, expect, it } from 'vitest'

import { AppError } from '../../src/common/errors.ts'

const { conflictError, forbiddenError, isDatabaseError, notFoundError, unauthorizedError } = AppError()

describe('error helpers', () => {
	it('creates a conflict error', () => {
		const error = conflictError('Email already in use')

		expect(error).toMatchObject({
			name: 'ConflictError',
			statusCode: 409,
			message: 'Email already in use',
		})
	})

	it('creates a not found error', () => {
		const error = notFoundError('User not found')

		expect(error).toMatchObject({
			name: 'Not Found',
			statusCode: 404,
			message: 'User not found',
		})
	})

	it('creates an unauthorized error', () => {
		const error = unauthorizedError('Login required')

		expect(error).toMatchObject({
			name: 'Unauthorized',
			statusCode: 401,
			message: 'Login required',
		})
	})

	it('creates a forbidden error', () => {
		const error = forbiddenError('Access denied')

		expect(error).toMatchObject({
			name: 'Forbidden',
			statusCode: 403,
			message: 'Access denied',
		})
	})

	it('recognizes database-like errors by code', () => {
		expect(isDatabaseError({ code: '23505' })).toBe(true)
		expect(isDatabaseError(new Error('boom'))).toBe(false)
		expect(isDatabaseError(null)).toBe(false)
	})
})
