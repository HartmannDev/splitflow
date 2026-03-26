import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	ForbiddenErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { CurrencySchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildCurrencyDocs = () => {
	const {
		GetCurrenciesQuerySchema,
		CurrencyListSchema,
		CurrencyCodeParamSchema,
		CurrencySchema,
		CreateCurrencySchema,
		UpdateCurrencySchema,
		CreateCurrencyResponseSchema,
	} = CurrencySchemas()

	const messageSchema = z.object({ message: z.string() })

	const getCurrenciesDocs: FastifyOpenApiSchema = {
		description: 'Get currencies for admin management',
		tags: ['Currencies'],
		querystring: GetCurrenciesQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: CurrencyListSchema.describe('Successful response with currencies'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createCurrencyDocs: FastifyOpenApiSchema = {
		description: 'Create a currency for admin management',
		tags: ['Currencies'],
		body: CreateCurrencySchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateCurrencyResponseSchema.describe('Currency created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			409: ConflictErrorResponseSchema.describe('Conflict: Currency code already exists'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateCurrencyDocs: FastifyOpenApiSchema = {
		description: 'Update currency management fields',
		tags: ['Currencies'],
		params: CurrencyCodeParamSchema,
		body: UpdateCurrencySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: CurrencySchema.describe('Currency updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Currency does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteCurrencyDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a currency',
		tags: ['Currencies'],
		params: CurrencyCodeParamSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Currency deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: You do not have permission to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Currency does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getCurrenciesDocs,
		createCurrencyDocs,
		updateCurrencyDocs,
		deleteCurrencyDocs,
	}
}
