import type { DatabaseError } from 'pg'

export const AppError = () => {
	const isDatabaseError = (error: unknown): error is DatabaseError =>
		typeof error === 'object' && error !== null && 'code' in error

	const conflictError = (message: string) =>
		Object.assign(new Error(message), {
			name: 'ConflictError',
			statusCode: 409,
		})

	const notFoundError = (message: string) =>
		Object.assign(new Error(message), {
			name: 'Not Found',
			statusCode: 404,
		})

	const unauthorizedError = (message: string) =>
		Object.assign(new Error(message), {
			name: 'Unauthorized',
			statusCode: 401,
		})

	const forbiddenError = (message: string) =>
		Object.assign(new Error(message), {
			name: 'Forbidden',
			statusCode: 403,
		})

	const badRequestError = (message: string) =>
		Object.assign(new Error(message), {
			name: 'Bad Request',
			statusCode: 400,
		})

	return {
		isDatabaseError,
		conflictError,
		notFoundError,
		unauthorizedError,
		forbiddenError,
		badRequestError,
	}
}
