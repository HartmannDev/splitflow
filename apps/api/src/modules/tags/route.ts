import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildTagController } from './controller.ts'
import { buildTagDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function tagsRoute(app: FastifyInstance, deps: AppDependency) {
	const { getTags, createTag, updateTag, deleteTag } = buildTagController(deps)
	const { getTagsDocs, createTagDocs, updateTagDocs, deleteTagDocs } = buildTagDocs()

	app.get('/tags', { schema: getTagsDocs, preHandler: requireRole('user') }, getTags)
	app.post('/tags', { schema: createTagDocs, preHandler: requireRole('user') }, createTag)
	app.patch('/tags/:id', { schema: updateTagDocs, preHandler: requireRole('user') }, updateTag)
	app.delete('/tags/:id', { schema: deleteTagDocs, preHandler: requireRole('user') }, deleteTag)
}
