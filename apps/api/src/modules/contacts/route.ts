import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildContactController } from './controller.ts'
import { buildContactDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function contactsRoute(app: FastifyInstance, deps: AppDependency) {
	const { getContacts, createContact, updateContact, deleteContact } = buildContactController(deps)
	const { getContactsDocs, createContactDocs, updateContactDocs, deleteContactDocs } = buildContactDocs()

	app.get('/contacts', { schema: getContactsDocs, preHandler: requireRole('user') }, getContacts)
	app.post('/contacts', { schema: createContactDocs, preHandler: requireRole('user') }, createContact)
	app.patch('/contacts/:id', { schema: updateContactDocs, preHandler: requireRole('user') }, updateContact)
	app.delete('/contacts/:id', { schema: deleteContactDocs, preHandler: requireRole('user') }, deleteContact)
}
