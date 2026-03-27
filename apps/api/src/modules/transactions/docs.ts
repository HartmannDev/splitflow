import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { TransactionSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildTransactionDocs = () => {
	const {
		TransactionSchema,
		TransactionIdSchema,
		TransactionListSchema,
		CreateTransactionSchema,
		UpdateTransactionSchema,
		CreateTransferSchema,
		GetTransactionsQuerySchema,
		CreateTransactionResponseSchema,
		CreateTransferResponseSchema,
	} = TransactionSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getTransactionsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user transactions',
		tags: ['Transactions'],
		querystring: GetTransactionsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: TransactionListSchema.describe('Successful response with transactions'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getTransactionDocs: FastifyOpenApiSchema = {
		description: 'Get one transaction owned by the current user',
		tags: ['Transactions'],
		params: TransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: TransactionSchema.describe('Successful response with one transaction'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createTransactionDocs: FastifyOpenApiSchema = {
		description: 'Create a normal income or expense transaction',
		tags: ['Transactions'],
		body: CreateTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateTransactionResponseSchema.describe('Transaction created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createTransferDocs: FastifyOpenApiSchema = {
		description: 'Create a transfer pair between two accounts',
		tags: ['Transactions'],
		body: CreateTransferSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateTransferResponseSchema.describe('Transfer created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateTransactionDocs: FastifyOpenApiSchema = {
		description: 'Update a normal income or expense transaction',
		tags: ['Transactions'],
		params: TransactionIdSchema,
		body: UpdateTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: TransactionSchema.describe('Transaction updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteTransactionDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a transaction, or a full transfer pair when applicable',
		tags: ['Transactions'],
		params: TransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Transaction deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getTransactionsDocs,
		getTransactionDocs,
		createTransactionDocs,
		createTransferDocs,
		updateTransactionDocs,
		deleteTransactionDocs,
	}
}
