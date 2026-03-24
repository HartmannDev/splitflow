import z from 'zod'

import { CreateUserSchema, DeleteUserResponseSchema, UserIDSchema, UserListSchema } from './model.ts'
import {
	ConflictErrorResponseSchema,
	ForbiddenErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const getUsersOptions: FastifyOpenApiSchema = {
	description: 'Get a list of users',
	tags: ['Users'],
	security: [{ cookieAuth: [] }],
	response: {
		200: UserListSchema.describe('Successful response with a list of users'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
		403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}

export const deleteUserOptions: FastifyOpenApiSchema = {
	description: 'Soft delete a user',
	tags: ['Users'],
	params: UserIDSchema,
	security: [{ cookieAuth: [] }],
	response: {
		200: DeleteUserResponseSchema.describe('User deleted successfully'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
		403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
		404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}
