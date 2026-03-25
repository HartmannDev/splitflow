import { describe, expect, it, vi, afterEach } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { errorHandler } from '../../src/common/error-handler.ts'

const createReply = () => {
	const state: { statusCode?: number; payload?: unknown } = {}

	const reply = {
		status(code: number) {
			state.statusCode = code
			return reply
		},
		send(payload: unknown) {
			state.payload = payload
			return reply
		},
	} as FastifyReply

	return { reply, state }
}

const request = {
	log: {
		error: vi.fn(),
	},
} as unknown as FastifyRequest

afterEach(() => {
	vi.restoreAllMocks()
})

describe('errorHandler', () => {
	it('maps validation errors to 400', () => {
		const { reply, state } = createReply()
		const error = {
			message: 'body/email Invalid email',
			validation: [{}],
		} as any

		errorHandler(error, request, reply)

		expect(state.statusCode).toBe(400)
		expect(state.payload).toEqual({
			statusCode: 400,
			error: 'Bad Request',
			message: 'body/email Invalid email',
		})
	})

	it('maps response Zod errors to 500 with validation details', () => {
		const { reply, state } = createReply()
		vi.spyOn(console, 'log').mockImplementation(() => {})

		const error = new ZodError([
			{
				code: 'invalid_type',
				expected: 'string',
				input: 123,
				path: ['email'],
				message: 'Invalid input: expected string, received number',
			},
		])

		errorHandler(error as any, request, reply)

		expect(state.statusCode).toBe(500)
		expect(state.payload).toEqual({
			statusCode: 500,
			error: 'Internal Server Error - Response Validation Failed',
			message: "Field 'email' => Invalid input: expected string, received number | ",
		})
	})

	it('preserves explicit 4xx application errors', () => {
		const { reply, state } = createReply()
		const error = Object.assign(new Error('Email already in use'), {
			name: 'ConflictError',
			statusCode: 409,
		})

		errorHandler(error as any, request, reply)

		expect(state.statusCode).toBe(409)
		expect(state.payload).toEqual({
			statusCode: 409,
			error: 'ConflictError',
			message: 'Email already in use',
		})
	})

	it('hides unexpected server errors behind a generic 500', () => {
		const { reply, state } = createReply()
		const error = new Error('database connection exploded')

		errorHandler(error as any, request, reply)

		expect(state.statusCode).toBe(500)
		expect(state.payload).toEqual({
			statusCode: 500,
			error: 'Internal Server Error',
			message: 'Unexpected error',
		})
	})
})
