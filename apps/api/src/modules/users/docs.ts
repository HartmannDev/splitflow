import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	ForbiddenErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { UserSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildUserControllerDocs = () => {
	const {
		GetUsersQuerySchema,
		UserListSchema,
		UserIdSchema,
		UserSchema,
		CreateManagedUserSchema,
		UpdateOwnUserSchema,
		UpdateManagedUserSchema,
		PasswordSchema,
		CreateUserResponseSchema,
	} = UserSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getUsersDocs: FastifyOpenApiSchema = {
		description: 'Get a list of users for account management',
		tags: ['Users'],
		querystring: GetUsersQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: UserListSchema.describe('Successful response with a list of users'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getUserDocs: FastifyOpenApiSchema = {
		description: 'Get one user for account management',
		tags: ['Users'],
		params: UserIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: UserSchema.describe('Successful response with one user'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createUserDocs: FastifyOpenApiSchema = {
		description: 'Create a user for account management',
		tags: ['Users'],
		body: CreateManagedUserSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateUserResponseSchema.describe('User created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			409: ConflictErrorResponseSchema.describe('Conflict: Email already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateOwnUserDocs: FastifyOpenApiSchema = {
		description: 'Update the current user profile',
		tags: ['Users'],
		body: UpdateOwnUserSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: UserSchema.describe('User updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			409: ConflictErrorResponseSchema.describe('Conflict: Email already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateManagedUserDocs: FastifyOpenApiSchema = {
		description: 'Update user management data',
		tags: ['Users'],
		params: UserIdSchema,
		body: UpdateManagedUserSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: UserSchema.describe('User management data updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const resetUserPasswordDocs: FastifyOpenApiSchema = {
		description: 'Reset the password of a user',
		tags: ['Users'],
		params: UserIdSchema,
		body: PasswordSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Password reset successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteUserDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a user',
		tags: ['Users'],
		params: UserIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('User deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getUsersDocs,
		getUserDocs,
		createUserDocs,
		updateOwnUserDocs,
		updateManagedUserDocs,
		resetUserPasswordDocs,
		deleteUserDocs,
	}
}
