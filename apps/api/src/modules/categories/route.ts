import type { FastifyInstance } from 'fastify'

import { requireAuth } from '../auth/route-validator.ts'
import { buildCategoryController } from './controller.ts'
import { buildCategoryDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function categoriesRoute(app: FastifyInstance, deps: AppDependency) {
	const { getCategories, createCategory, updateCategory, deleteCategory } = buildCategoryController(deps)
	const { getCategoriesDocs, createCategoryDocs, updateCategoryDocs, deleteCategoryDocs } = buildCategoryDocs()

	app.get('/categories', { schema: getCategoriesDocs, preHandler: requireAuth }, getCategories)
	app.post('/categories', { schema: createCategoryDocs, preHandler: requireAuth }, createCategory)
	app.patch('/categories/:id', { schema: updateCategoryDocs, preHandler: requireAuth }, updateCategory)
	app.delete('/categories/:id', { schema: deleteCategoryDocs, preHandler: requireAuth }, deleteCategory)
}
