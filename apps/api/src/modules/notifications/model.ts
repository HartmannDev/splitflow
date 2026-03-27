import z from 'zod'

const NotificationTypeSchema = z.enum([
	'share_invite',
	'share_updated',
	'payment_marked',
	'payment_confirm_request',
	'payment_confirmed',
	'recurring_generated',
])

const NotificationStatusSchema = z.enum(['pending', 'read', 'resolved', 'dismissed', 'superseded'])

const NotificationSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	type: NotificationTypeSchema,
	title: z.string(),
	message: z.string(),
	relatedSharedTransactionId: z.uuid().nullable(),
	relatedSharedParticipantId: z.uuid().nullable(),
	relatedTransactionId: z.uuid().nullable(),
	status: NotificationStatusSchema,
	createdAt: z.iso.datetime({ offset: true }),
	readAt: z.iso.datetime({ offset: true }).nullable(),
	actedAt: z.iso.datetime({ offset: true }).nullable(),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const NotificationIdSchema = z.object({
	id: z.uuid(),
})

const GetNotificationsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
	includeResolved: z.coerce.boolean().optional().default(false),
})

const UpdateNotificationSchema = z.object({
	status: z.enum(['read', 'resolved', 'dismissed']),
})

const NotificationListSchema = z.array(NotificationSchema)

export const NotificationSchemas = () => {
	return {
		NotificationTypeSchema,
		NotificationStatusSchema,
		NotificationSchema,
		NotificationIdSchema,
		GetNotificationsQuerySchema,
		UpdateNotificationSchema,
		NotificationListSchema,
	}
}

export type NotificationType = z.infer<typeof NotificationSchema>
export type NotificationIdType = z.infer<typeof NotificationIdSchema>
export type GetNotificationsQueryType = z.infer<typeof GetNotificationsQuerySchema>
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>
