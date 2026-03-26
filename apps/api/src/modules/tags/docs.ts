import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { TagSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildTagDocs = () => {
	const {
		TagSchema,
		TagIdSchema,
		TagListSchema,
		CreateTagSchema,
		UpdateTagSchema,
		GetTagsQuerySchema,
		CreateTagResponseSchema,
	} = TagSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getTagsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user tags',
		tags: ['Tags'],
		querystring: GetTagsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: TagListSchema.describe('Successful response with tags'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createTagDocs: FastifyOpenApiSchema = {
		description: 'Create a tag for the current user',
		tags: ['Tags'],
		body: CreateTagSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateTagResponseSchema.describe('Tag created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			409: ConflictErrorResponseSchema.describe('Conflict: Tag name already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateTagDocs: FastifyOpenApiSchema = {
		description: 'Update a tag owned by the current user',
		tags: ['Tags'],
		params: TagIdSchema,
		body: UpdateTagSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: TagSchema.describe('Tag updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Tag does not exist'),
			409: ConflictErrorResponseSchema.describe('Conflict: Tag name already in use'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteTagDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a tag owned by the current user',
		tags: ['Tags'],
		params: TagIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Tag deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Tag does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getTagsDocs,
		createTagDocs,
		updateTagDocs,
		deleteTagDocs,
	}
}
