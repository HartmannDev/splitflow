import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { AccountSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildAccountDocs = () => {
	const {
		GetAccountsQuerySchema,
		AccountListSchema,
		AccountIdSchema,
		AccountSchema,
		CreateAccountSchema,
		UpdateAccountSchema,
		CreateAccountResponseSchema,
	} = AccountSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getAccountsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user accounts',
		tags: ['Accounts'],
		querystring: GetAccountsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: AccountListSchema.describe('Successful response with accounts'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createAccountDocs: FastifyOpenApiSchema = {
		description: 'Create an account for the current user',
		tags: ['Accounts'],
		body: CreateAccountSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateAccountResponseSchema.describe('Account created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateAccountDocs: FastifyOpenApiSchema = {
		description: 'Update an account owned by the current user',
		tags: ['Accounts'],
		params: AccountIdSchema,
		body: UpdateAccountSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: AccountSchema.describe('Account updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Account does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteAccountDocs: FastifyOpenApiSchema = {
		description: 'Soft delete an account owned by the current user',
		tags: ['Accounts'],
		params: AccountIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Account deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Account does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getAccountsDocs,
		createAccountDocs,
		updateAccountDocs,
		deleteAccountDocs,
	}
}
