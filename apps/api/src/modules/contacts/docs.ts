import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { ContactSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildContactDocs = () => {
	const {
		GetContactsQuerySchema,
		ContactListSchema,
		ContactIdSchema,
		ContactSchema,
		CreateContactSchema,
		UpdateContactSchema,
		CreateContactResponseSchema,
	} = ContactSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getContactsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user contacts',
		tags: ['Contacts'],
		querystring: GetContactsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: ContactListSchema.describe('Successful response with contacts'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createContactDocs: FastifyOpenApiSchema = {
		description: 'Create a contact for the current user',
		tags: ['Contacts'],
		body: CreateContactSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateContactResponseSchema.describe('Contact created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			409: ConflictErrorResponseSchema.describe('Conflict: Contact email already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateContactDocs: FastifyOpenApiSchema = {
		description: 'Update a contact owned by the current user',
		tags: ['Contacts'],
		params: ContactIdSchema,
		body: UpdateContactSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: ContactSchema.describe('Contact updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Contact does not exist'),
			409: ConflictErrorResponseSchema.describe('Conflict: Contact email already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteContactDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a contact owned by the current user',
		tags: ['Contacts'],
		params: ContactIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Contact deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Contact does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getContactsDocs,
		createContactDocs,
		updateContactDocs,
		deleteContactDocs,
	}
}
