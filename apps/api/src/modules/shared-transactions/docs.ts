import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { SharedTransactionSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildSharedTransactionDocs = () => {
	const {
		SharedTransactionSchema,
		SharedTransactionParticipantSchema,
		SharedTransactionIdSchema,
		SharedTransactionParticipantIdSchema,
		CreateSharedTransactionSchema,
		UpdateSharedTransactionSchema,
		GetSharedTransactionsQuerySchema,
		AcceptSharedTransactionSchema,
		SharedTransactionListSchema,
		CreateSharedTransactionResponseSchema,
	} = SharedTransactionSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getSharedTransactionsDocs: FastifyOpenApiSchema = {
		description: 'Get shared transactions visible to the current user',
		tags: ['Shared Transactions'],
		querystring: GetSharedTransactionsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionListSchema.describe('Successful response with shared transactions'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getSharedTransactionDocs: FastifyOpenApiSchema = {
		description: 'Get one shared transaction visible to the current user',
		tags: ['Shared Transactions'],
		params: SharedTransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionSchema.describe('Successful response with one shared transaction'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getSharedTransactionParticipantsDocs: FastifyOpenApiSchema = {
		description: 'Get participants for one visible shared transaction',
		tags: ['Shared Transactions'],
		params: SharedTransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: z.array(SharedTransactionParticipantSchema).describe('Successful response with shared transaction participants'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createSharedTransactionDocs: FastifyOpenApiSchema = {
		description: 'Create a shared transaction for an owned group and create the owner ledger transaction immediately',
		tags: ['Shared Transactions'],
		body: CreateSharedTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateSharedTransactionResponseSchema.describe('Shared transaction created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateSharedTransactionDocs: FastifyOpenApiSchema = {
		description: 'Update a shared transaction and reset approvals to the new edit version',
		tags: ['Shared Transactions'],
		params: SharedTransactionIdSchema,
		body: UpdateSharedTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionSchema.describe('Shared transaction updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const acceptSharedTransactionDocs: FastifyOpenApiSchema = {
		description: 'Accept a user-backed participant share and create a pending personal transaction of the same type',
		tags: ['Shared Transactions'],
		params: SharedTransactionParticipantIdSchema,
		body: AcceptSharedTransactionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionParticipantSchema.describe('Participant accepted successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction participant does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const rejectSharedTransactionDocs: FastifyOpenApiSchema = {
		description: 'Reject a user-backed participant share',
		tags: ['Shared Transactions'],
		params: SharedTransactionParticipantIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionParticipantSchema.describe('Participant rejected successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction participant does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const markSharedTransactionPaidDocs: FastifyOpenApiSchema = {
		description: 'Mark a participant share as paid',
		tags: ['Shared Transactions'],
		params: SharedTransactionParticipantIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionParticipantSchema.describe('Participant marked as paid successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction participant does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const confirmSharedTransactionPaidDocs: FastifyOpenApiSchema = {
		description: 'Confirm a participant payment',
		tags: ['Shared Transactions'],
		params: SharedTransactionParticipantIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: SharedTransactionParticipantSchema.describe('Participant payment confirmed successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction participant does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteSharedTransactionDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a shared transaction owned by the current user',
		tags: ['Shared Transactions'],
		params: SharedTransactionIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Shared transaction deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Shared transaction does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getSharedTransactionsDocs,
		getSharedTransactionDocs,
		getSharedTransactionParticipantsDocs,
		createSharedTransactionDocs,
		updateSharedTransactionDocs,
		acceptSharedTransactionDocs,
		rejectSharedTransactionDocs,
		markSharedTransactionPaidDocs,
		confirmSharedTransactionPaidDocs,
		deleteSharedTransactionDocs,
	}
}
