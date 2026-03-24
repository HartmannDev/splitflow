import z from 'zod'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'
import { LoginSchema } from './model.ts'
import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'

export const loginOptions: FastifyOpenApiSchema = {
	description: 'Login to the application',
	tags: ['Auth'],
	body: LoginSchema,
	response: {
		200: z
			.object({
				message: z.string(),
			})
			.describe('Successful login response'),
		400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: Invalid email or password'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}

export const logoutOptions: FastifyOpenApiSchema = {
	description: 'Logout from the application',
	tags: ['Auth'],
	security: [{ cookieAuth: [] }],
	response: {
		200: z.object({ message: z.string() }).describe('Successful logout response'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: No valid session found'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}

export const meOptions: FastifyOpenApiSchema = {
	description: 'Get current logged in user',
	tags: ['Auth'],
	security: [{ cookieAuth: [] }],
	response: {
		200: z
			.object({ sessionUser: z.object({ userId: z.string(), email: z.string(), role: z.enum(['user', 'admin']) }) })
			.describe('Current logged in user'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: No valid session found'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}
