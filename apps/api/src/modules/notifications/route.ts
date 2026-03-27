import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildNotificationController } from './controller.ts'
import { buildNotificationDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function notificationsRoute(app: FastifyInstance, deps: AppDependency) {
	const { getNotifications, updateNotification } = buildNotificationController(deps)
	const { getNotificationsDocs, updateNotificationDocs } = buildNotificationDocs()

	app.get('/notifications', { schema: getNotificationsDocs, preHandler: requireRole('user') }, getNotifications)
	app.patch('/notifications/:id', { schema: updateNotificationDocs, preHandler: requireRole('user') }, updateNotification)
}
