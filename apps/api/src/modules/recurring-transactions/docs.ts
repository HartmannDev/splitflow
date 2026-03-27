import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { RecurringTransactionSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildRecurringTransactionDocs = () => {
	const {
		RecurringTransactionSchema,
		RecurringTransactionIdSchema,
		RecurringTransactionListSchema,
		CreateRecurringTransactionSchema,
		UpdateRecurringTransactionSchema,
		GetRecurringTransactionsQuerySchema,
		GenerateDueRecurringTransactionsSchema,
		CreateRecurringTransactionResponseSchema,
		GenerateDueRecurringTransactionsResponseSchema,
	} = RecurringTransactionSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getRecurringTransactionsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user recurring transaction templates',
		tags: ['Recurring Transactions'],
		querystring: GetRecurringTransactionsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: RecurringTransactionListSchema.describe('Successful response with recurring transactions'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getRecurringTransactionDocs: FastifyOpenApiSchema = {
		description: 'Get one recurring transaction template owned by the current user',
		tags: ['Recurring Transactions'],
		params: RecurringTransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: RecurringTransactionSchema.describe('Successful response with one recurring transaction'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Recurring transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createRecurringTransactionDocs: FastifyOpenApiSchema = {
		description: 'Create a recurring transaction template',
		tags: ['Recurring Transactions'],
		body: CreateRecurringTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateRecurringTransactionResponseSchema.describe('Recurring transaction created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateRecurringTransactionDocs: FastifyOpenApiSchema = {
		description: 'Update a recurring transaction template for future occurrences',
		tags: ['Recurring Transactions'],
		params: RecurringTransactionIdSchema,
		body: UpdateRecurringTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: RecurringTransactionSchema.describe('Recurring transaction updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Recurring transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const generateDueRecurringTransactionsDocs: FastifyOpenApiSchema = {
		description: 'Generate due real transactions from recurring templates',
		tags: ['Recurring Transactions'],
		body: GenerateDueRecurringTransactionsSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: GenerateDueRecurringTransactionsResponseSchema.describe('Due recurring transactions generated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteRecurringTransactionDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a recurring transaction template',
		tags: ['Recurring Transactions'],
		params: RecurringTransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Recurring transaction deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Recurring transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getRecurringTransactionsDocs,
		getRecurringTransactionDocs,
		createRecurringTransactionDocs,
		updateRecurringTransactionDocs,
		generateDueRecurringTransactionsDocs,
		deleteRecurringTransactionDocs,
	}
}
