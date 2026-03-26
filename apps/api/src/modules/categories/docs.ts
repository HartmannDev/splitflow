import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	ConflictErrorResponseSchema,
	ForbiddenErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { CategorySchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildCategoryDocs = () => {
	const {
		GetCategoriesQuerySchema,
		CategoryListSchema,
		CategoryIdSchema,
		CategorySchema,
		CreateCategorySchema,
		UpdateCategorySchema,
		CreateCategoryResponseSchema,
	} = CategorySchemas()

	const messageSchema = z.object({ message: z.string() })

	const getCategoriesDocs: FastifyOpenApiSchema = {
		description: 'Get categories available to the current session',
		tags: ['Categories'],
		querystring: GetCategoriesQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: CategoryListSchema.describe('Successful response with categories'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid filter combination'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createCategoryDocs: FastifyOpenApiSchema = {
		description: 'Create a category according to the current session role',
		tags: ['Categories'],
		body: CreateCategorySchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateCategoryResponseSchema.describe('Category created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			403: ForbiddenErrorResponseSchema.describe('Forbidden: Current role cannot create that category scope'),
			409: ConflictErrorResponseSchema.describe('Conflict: Category name already in use for this type'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateCategoryDocs: FastifyOpenApiSchema = {
		description: 'Update a category owned by the current session role',
		tags: ['Categories'],
		params: CategoryIdSchema,
		body: UpdateCategorySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: CategorySchema.describe('Category updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Category does not exist'),
			409: ConflictErrorResponseSchema.describe('Conflict: Category name already in use for this type'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteCategoryDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a category owned by the current session role',
		tags: ['Categories'],
		params: CategoryIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Category deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Category does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getCategoriesDocs,
		createCategoryDocs,
		updateCategoryDocs,
		deleteCategoryDocs,
	}
}
