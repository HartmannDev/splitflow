import type { DatabaseError } from 'pg'

export const isDatabaseError = (error: unknown): error is DatabaseError =>
	typeof error === 'object' && error !== null && 'code' in error

export const conflictError = (message: string) =>
	Object.assign(new Error(message), {
		name: 'ConflictError',
		statusCode: 409,
	})

export const notFoundError = (message: string) =>
	Object.assign(new Error(message), {
		name: 'Not Found',
		statusCode: 404,
	})

export const unauthorizedError = (message: string) =>
	Object.assign(new Error(message), {
		name: 'Unauthorized',
		statusCode: 401,
	})

export const forbiddenError = (message: string) =>
	Object.assign(new Error(message), {
		name: 'Forbidden',
		statusCode: 403,
	})
