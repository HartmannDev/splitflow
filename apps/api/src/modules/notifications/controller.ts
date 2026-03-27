import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { NotificationSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type { GetNotificationsQueryType, NotificationIdType, NotificationType, UpdateNotificationInput } from './model.ts'

type NotificationRow = NotificationType

const notificationSelectSql = `SELECT
			id,
			user_id as "userId",
			type,
			title,
			message,
			related_shared_transaction_id as "relatedSharedTransactionId",
			related_shared_participant_id as "relatedSharedParticipantId",
			related_transaction_id as "relatedTransactionId",
			status,
			to_json(created_at) as "createdAt",
			to_json(read_at) as "readAt",
			to_json(acted_at) as "actedAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM notifications`

export const buildNotificationController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, notFoundError } = AppError()
	const { NotificationListSchema, NotificationSchema } = NotificationSchemas()

	const getNotifications = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false, includeResolved = false } = req.query as GetNotificationsQueryType
		let sql = `${notificationSelectSql}
			WHERE user_id = $1`

		if (!includeDeleted) {
			sql += `
				AND deleted_at IS NULL`
		}

		if (!includeResolved) {
			sql += `
				AND status NOT IN ('resolved', 'dismissed', 'superseded')`
		}

		sql += `
			ORDER BY created_at DESC`

		const payload = await db.query(sql, [sessionUser.userId])
		return validatedResponse(res, 200, NotificationListSchema, payload.rows)
	}

	const updateNotification = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as NotificationIdType
		const { status } = req.body as UpdateNotificationInput

		if (status === 'read' || status === 'resolved') {
			const payload = await db.query(
				`UPDATE notifications
				SET status = $3,
					read_at = CASE WHEN $3 = 'read' AND read_at IS NULL THEN NOW() ELSE read_at END,
					acted_at = CASE WHEN $3 = 'resolved' THEN NOW() ELSE acted_at END,
					updated_at = NOW()
				WHERE id = $1
					AND user_id = $2
					AND deleted_at IS NULL
				RETURNING
					id,
					user_id as "userId",
					type,
					title,
					message,
					related_shared_transaction_id as "relatedSharedTransactionId",
					related_shared_participant_id as "relatedSharedParticipantId",
					related_transaction_id as "relatedTransactionId",
					status,
					to_json(created_at) as "createdAt",
					to_json(read_at) as "readAt",
					to_json(acted_at) as "actedAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[id, sessionUser.userId, status],
			)

			if (payload.rowCount === 0) {
				throw notFoundError('Notification not found')
			}

			return validatedResponse(res, 200, NotificationSchema, payload.rows[0] as NotificationRow)
		}

		if (status !== 'dismissed') {
			throw badRequestError('Unsupported notification status')
		}

		const payload = await db.query(
			`UPDATE notifications
			SET status = 'dismissed',
				updated_at = NOW(),
				deleted_at = NOW()
			WHERE id = $1
				AND user_id = $2
				AND deleted_at IS NULL
			RETURNING
				id,
				user_id as "userId",
				type,
				title,
				message,
				related_shared_transaction_id as "relatedSharedTransactionId",
				related_shared_participant_id as "relatedSharedParticipantId",
				related_transaction_id as "relatedTransactionId",
				status,
				to_json(created_at) as "createdAt",
				to_json(read_at) as "readAt",
				to_json(acted_at) as "actedAt",
				to_json(updated_at) as "updatedAt",
				to_json(deleted_at) as "deletedAt"`,
			[id, sessionUser.userId],
		)

		if (payload.rowCount === 0) {
			throw notFoundError('Notification not found')
		}

		return validatedResponse(res, 200, NotificationSchema, payload.rows[0] as NotificationRow)
	}

	return {
		getNotifications,
		updateNotification,
	}
}
