import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { NotificationSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildNotificationDocs = () => {
	const {
		NotificationSchema,
		NotificationIdSchema,
		NotificationListSchema,
		GetNotificationsQuerySchema,
		UpdateNotificationSchema,
	} = NotificationSchemas()

	const getNotificationsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user notifications',
		tags: ['Notifications'],
		querystring: GetNotificationsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: NotificationListSchema.describe('Successful response with notifications'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateNotificationDocs: FastifyOpenApiSchema = {
		description: 'Update the current user notification status',
		tags: ['Notifications'],
		params: NotificationIdSchema,
		body: UpdateNotificationSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: NotificationSchema.describe('Notification updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Notification does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getNotificationsDocs,
		updateNotificationDocs,
	}
}
