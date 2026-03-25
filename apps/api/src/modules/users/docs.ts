import z from 'zod'

import {
	CreateManagedUserSchema,
	CreateUserResponseSchema,
	DeleteUserResponseSchema,
	GetUsersQuerySchema,
	PublicUserSchema,
	ResetUserPasswordResponseSchema,
	ResetUserPasswordSchema,
	UpdateOwnUserSchema,
	UserIDSchema,
	UserListSchema,
} from './model.ts'
import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	ForbiddenErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const getUsersOptions: FastifyOpenApiSchema = {
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

export const getUserOptions: FastifyOpenApiSchema = {
	description: 'Get one user for account management',
	tags: ['Users'],
	params: UserIDSchema,
	security: [{ cookieAuth: [] }],
	response: {
		200: PublicUserSchema.describe('Successful response with one user'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
		403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
		404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}

export const createUserOptions: FastifyOpenApiSchema = {
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

export const updateOwnUserOptions: FastifyOpenApiSchema = {
	description: 'Update the current user profile',
	tags: ['Users'],
	body: UpdateOwnUserSchema,
	security: [{ cookieAuth: [] }],
	response: {
		200: PublicUserSchema.describe('User updated successfully'),
		400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
		409: ConflictErrorResponseSchema.describe('Conflict: Email already in use'),
		500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
	},
}

export const resetUserPasswordOptions: FastifyOpenApiSchema = {
	description: 'Reset the password of a user',
	tags: ['Users'],
	params: UserIDSchema,
	body: ResetUserPasswordSchema,
	security: [{ cookieAuth: [] }],
	response: {
		200: ResetUserPasswordResponseSchema.describe('Password reset successfully'),
		400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
		401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
		403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
		404: NotFoundErrorResponseSchema.describe('Not Found: User does not exist'),
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
