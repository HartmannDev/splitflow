import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { SharedTransactionSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type {
	AcceptSharedTransactionInput,
	CreateSharedTransactionInput,
	GetSharedTransactionsQueryType,
	SharedTransactionDetailType,
	SharedTransactionIdType,
	SharedTransactionParticipantIdType,
	SharedTransactionParticipantType,
	SharedTransactionType,
	UpdateSharedTransactionInput,
} from './model.ts'

type Queryable = Pick<AppDependency['db'], 'query'>
	type SharedTransactionRow = Omit<SharedTransactionDetailType, 'participants' | 'ownerAccountId' | 'ownerCategoryId'>
type ParticipantRow = SharedTransactionParticipantType
type GroupMemberLookup = {
	id: string
	memberUserId: string | null
	memberContactId: string | null
}
	type ContactLookup = {
		id: string
		linkedUserId: string | null
	}

	type PreviousParticipantCarryOver = {
		userTransactionId: string | null
	}
type NotificationInputType = {
	userId: string
	type: 'share_invite' | 'share_updated' | 'payment_confirm_request' | 'payment_confirmed'
	title: string
	message: string
	relatedSharedTransactionId: string | null
	relatedSharedParticipantId: string | null
	relatedTransactionId: string | null
}

const sharedTransactionSelectSql = `SELECT
			id,
			owner_user_id as "ownerUserId",
			group_id as "groupId",
			type,
			total_amount::text as "totalAmount",
			description,
			notes,
			to_json(transaction_date) as "transactionDate",
			split_method as "splitMethod",
			status,
			current_edit_version as "currentEditVersion",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM shared_transactions`

const sharedParticipantSelectSql = `SELECT
			id,
			shared_transaction_id as "sharedTransactionId",
			participant_user_id as "participantUserId",
			participant_contact_id as "participantContactId",
			amount::text as "amount",
			approval_status as "approvalStatus",
			approval_version as "approvalVersion",
			to_json(approved_at) as "approvedAt",
			payment_status as "paymentStatus",
			to_json(payment_marked_at) as "paymentMarkedAt",
			to_json(payment_confirmed_at) as "paymentConfirmedAt",
			user_transaction_id as "userTransactionId",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM shared_transaction_participants`

const decimalToMicros = (value: string) => {
	const [whole, fraction = ''] = value.trim().split('.')
	return BigInt(whole) * 1000000n + BigInt((fraction + '000000').slice(0, 6))
}

const microsToDecimal = (value: bigint) => {
	const whole = value / 1000000n
	const fraction = (value % 1000000n).toString().padStart(6, '0')
	return `${whole.toString()}.${fraction}`.replace(/\.?0+$/, '')
}

export const buildSharedTransactionController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, notFoundError, forbiddenError } = AppError()
	const {
		SharedTransactionListSchema,
		SharedTransactionDetailSchema,
		SharedTransactionSchema,
		SharedTransactionParticipantSchema,
		CreateSharedTransactionResponseSchema,
	} = SharedTransactionSchemas()

	const loadParticipants = async (sharedTransactionIds: string[], queryable: Queryable = db) => {
		if (sharedTransactionIds.length === 0) {
			return new Map<string, ParticipantRow[]>()
		}

		const payload = await queryable.query(
			`${sharedParticipantSelectSql}
			WHERE shared_transaction_id = ANY($1)
				AND deleted_at IS NULL
			ORDER BY created_at ASC`,
			[sharedTransactionIds],
		)

		const participantsBySharedTransaction = new Map<string, ParticipantRow[]>()
		for (const row of payload.rows as Array<ParticipantRow & { sharedTransactionId: string }>) {
			const participants = participantsBySharedTransaction.get(row.sharedTransactionId) ?? []
			participants.push({
				id: row.id,
				participantUserId: row.participantUserId,
				participantContactId: row.participantContactId,
				amount: row.amount,
				approvalStatus: row.approvalStatus,
				approvalVersion: row.approvalVersion,
				approvedAt: row.approvedAt,
				paymentStatus: row.paymentStatus,
				paymentMarkedAt: row.paymentMarkedAt,
				paymentConfirmedAt: row.paymentConfirmedAt,
				userTransactionId: row.userTransactionId,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				deletedAt: row.deletedAt,
			})
			participantsBySharedTransaction.set(row.sharedTransactionId, participants)
		}

		return participantsBySharedTransaction
	}

	const hydrateSharedTransactions = async (rows: SharedTransactionRow[], queryable: Queryable = db) => {
		const participantsBySharedTransaction = await loadParticipants(
			rows.map((row) => row.id),
			queryable,
		)

		return rows.map((row) => ({
			...row,
			participants: participantsBySharedTransaction.get(row.id) ?? [],
		}))
	}

	const attachOwnerLedgerClassification = async (
		sharedTransaction: SharedTransactionType,
		requestUserId: string,
		queryable: Queryable = db,
	) => {
		if (sharedTransaction.ownerUserId !== requestUserId) {
			return sharedTransaction
		}

		const ownerParticipant = sharedTransaction.participants.find((participant) => participant.participantUserId === requestUserId)
		if (!ownerParticipant?.userTransactionId) {
			return sharedTransaction
		}

		const payload = await queryable.query(
			`SELECT
				account_id as "ownerAccountId",
				category_id as "ownerCategoryId"
			FROM transactions
			WHERE id = $1
				AND user_id = $2
				AND deleted_at IS NULL`,
			[ownerParticipant.userTransactionId, requestUserId],
		)

		const ownerLedger = payload.rows[0] as { ownerAccountId: string; ownerCategoryId: string | null } | undefined
		if (!ownerLedger?.ownerCategoryId) {
			return sharedTransaction
		}

		return {
			...sharedTransaction,
			ownerAccountId: ownerLedger.ownerAccountId,
			ownerCategoryId: ownerLedger.ownerCategoryId,
		}
	}

	const getSharedTransactionById = async (sharedTransactionId: string, queryable: Queryable = db) => {
		const payload = await queryable.query(
			`${sharedTransactionSelectSql}
			WHERE id = $1`,
			[sharedTransactionId],
		)

		return payload.rows[0] as SharedTransactionRow | undefined
	}

	const ensureUserCanAccessSharedTransaction = async (
		sharedTransactionId: string,
		userId: string,
		includeDeleted = false,
		queryable: Queryable = db,
	) => {
		const payload = await queryable.query(
			`${sharedTransactionSelectSql}
			WHERE id = $1
				AND (
					owner_user_id = $2
					OR EXISTS (
						SELECT 1
						FROM shared_transaction_participants
						WHERE shared_transaction_id = shared_transactions.id
							AND participant_user_id = $2
							AND deleted_at IS NULL
					)
				)
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[sharedTransactionId, userId],
		)

		const sharedTransaction = payload.rows[0] as SharedTransactionRow | undefined
		if (!sharedTransaction) {
			return undefined
		}

		const [hydrated] = await hydrateSharedTransactions([sharedTransaction], queryable)
		return hydrated
	}

	const ensureOwnedGroup = async (queryable: Queryable, groupId: string, userId: string) => {
		const payload = await queryable.query(
			`SELECT id
			FROM groups
			WHERE id = $1
				AND owner_user_id = $2
				AND deleted_at IS NULL`,
			[groupId, userId],
		)

		if (payload.rowCount === 0) {
			throw badRequestError('Group not found')
		}
	}

	const getGroupMembers = async (queryable: Queryable, groupId: string) => {
		const payload = await queryable.query(
			`SELECT
				id,
				member_user_id as "memberUserId",
				member_contact_id as "memberContactId"
			FROM group_members
			WHERE group_id = $1
				AND deleted_at IS NULL
			ORDER BY created_at ASC`,
			[groupId],
		)

		return payload.rows as GroupMemberLookup[]
	}

	const ensureAccountOwned = async (queryable: Queryable, accountId: string, userId: string) => {
		const payload = await queryable.query(
			`SELECT id
			FROM accounts
			WHERE id = $1
				AND user_id = $2
				AND deleted_at IS NULL`,
			[accountId, userId],
		)

		if (payload.rowCount === 0) {
			throw badRequestError('Account not found')
		}
	}

	const ensureCategoryAccessible = async (
		queryable: Queryable,
		categoryId: string | null | undefined,
		userId: string,
		type: SharedTransactionType['type'],
	) => {
		if (!categoryId) {
			return
		}

		const payload = await queryable.query(
			`SELECT id
			FROM categories
			WHERE id = $1
				AND type = $2
				AND deleted_at IS NULL
				AND (
					is_default = true
					OR (user_id = $3 AND is_default = false)
				)`,
			[categoryId, type, userId],
		)

		if (payload.rowCount === 0) {
			throw badRequestError('Category not found')
		}
	}

	const getContactLookup = async (queryable: Queryable, contactId: string, ownerUserId: string) => {
		const payload = await queryable.query(
			`SELECT
				id,
				linked_user_id as "linkedUserId"
			FROM contacts
			WHERE id = $1
				AND user_id = $2
				AND deleted_at IS NULL`,
			[contactId, ownerUserId],
		)

		const contact = payload.rows[0] as ContactLookup | undefined
		if (!contact) {
			throw badRequestError('Group contains an invalid contact member')
		}

		return contact
	}

	const createNotification = async (queryable: Queryable, input: NotificationInputType) => {
		await queryable.query(
			`INSERT INTO notifications (
				id,
				user_id,
				type,
				title,
				message,
				related_shared_transaction_id,
				related_shared_participant_id,
				related_transaction_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				randomUUID(),
				input.userId,
				input.type,
				input.title,
				input.message,
				input.relatedSharedTransactionId,
				input.relatedSharedParticipantId,
				input.relatedTransactionId,
			],
		)
	}

	const supersedePendingApprovalNotifications = async (
		queryable: Queryable,
		sharedTransactionId: string,
		userId: string,
	) => {
		await queryable.query(
			`UPDATE notifications
			SET status = 'superseded',
				updated_at = NOW()
			WHERE user_id = $1
				AND related_shared_transaction_id = $2
				AND type IN ('share_invite', 'share_updated')
				AND status = 'pending'
				AND deleted_at IS NULL`,
			[userId, sharedTransactionId],
		)
	}

	const recomputeSharedTransactionStatus = async (queryable: Queryable, sharedTransactionId: string) => {
		const payload = await queryable.query(
			`${sharedParticipantSelectSql}
			WHERE shared_transaction_id = $1
				AND deleted_at IS NULL`,
			[sharedTransactionId],
		)

		const participants = payload.rows as Array<ParticipantRow & { sharedTransactionId: string }>
		const actionableParticipants = participants.filter((participant) => participant.participantUserId !== null)
		let nextStatus: SharedTransactionType['status'] = 'accepted'

		if (
			actionableParticipants.some((participant) => participant.approvalStatus === 'rejected') ||
			actionableParticipants.every((participant) => participant.approvalStatus === 'pending')
		) {
			nextStatus = 'pending'
		} else if (actionableParticipants.some((participant) => participant.approvalStatus !== 'accepted')) {
			nextStatus = 'partially_accepted'
		}

		await queryable.query(
			`UPDATE shared_transactions
			SET status = $2,
				updated_at = NOW()
			WHERE id = $1`,
			[sharedTransactionId, nextStatus],
		)
	}

	const buildParticipantDefinitions = async (
		queryable: Queryable,
		groupId: string,
		ownerUserId: string,
		totalAmount: string,
		splitMethod: SharedTransactionType['splitMethod'],
		participantAmounts: Array<{ groupMemberId: string; amount: string }>,
	) => {
		const groupMembers = await getGroupMembers(queryable, groupId)
		if (groupMembers.length === 0) {
			throw badRequestError('Group must have at least one member')
		}

		const normalizedAmounts = new Map(
			participantAmounts.map((participantAmount) => [participantAmount.groupMemberId, participantAmount.amount.trim()]),
		)
		const amountByGroupMemberId = new Map<string, string>()

		if (splitMethod === 'equal') {
			const totalMicros = decimalToMicros(totalAmount)
			const memberCount = BigInt(groupMembers.length)
			const baseAmount = totalMicros / memberCount
			let remainder = totalMicros % memberCount

			for (const member of groupMembers) {
				let amount = baseAmount
				if (member.memberUserId === ownerUserId && remainder > 0n) {
					amount += remainder
					remainder = 0n
				}

				amountByGroupMemberId.set(member.id, microsToDecimal(amount))
			}
		} else {
			if (normalizedAmounts.size !== groupMembers.length) {
				throw badRequestError('Fixed split requires one amount per group member')
			}

			for (const member of groupMembers) {
				const amount = normalizedAmounts.get(member.id)
				if (!amount) {
					throw badRequestError('Fixed split requires one amount per group member')
				}

				amountByGroupMemberId.set(member.id, amount)
			}

			const summedAmount = [...amountByGroupMemberId.values()].reduce(
				(acc, amount) => acc + decimalToMicros(amount),
				0n,
			)
			if (summedAmount !== decimalToMicros(totalAmount)) {
				throw badRequestError('Fixed split amounts must match the total amount')
			}
		}

		const definitions: Array<{
			groupMemberId: string
			participantUserId: string | null
			participantContactId: string | null
			amount: string
			approvalStatus: ParticipantRow['approvalStatus']
		}> = []

		for (const member of groupMembers) {
			const amount = amountByGroupMemberId.get(member.id)
			if (!amount) {
				throw badRequestError('Unable to compute participant amount')
			}

			if (member.memberUserId === ownerUserId) {
				definitions.push({
					groupMemberId: member.id,
					participantUserId: ownerUserId,
					participantContactId: null,
					amount,
					approvalStatus: 'accepted',
				})
				continue
			}

			if (!member.memberContactId) {
				throw badRequestError('Only owner and contact members are supported')
			}

			const contact = await getContactLookup(queryable, member.memberContactId, ownerUserId)
			if (contact.linkedUserId) {
				definitions.push({
					groupMemberId: member.id,
					participantUserId: contact.linkedUserId,
					participantContactId: null,
					amount,
					approvalStatus: 'pending',
				})
				continue
			}

			definitions.push({
				groupMemberId: member.id,
				participantUserId: null,
				participantContactId: member.memberContactId,
				amount,
				approvalStatus: 'accepted',
			})
		}

		return definitions
	}

	const insertParticipants = async (
		queryable: Queryable,
		sharedTransactionId: string,
		ownerUserId: string,
		sharedTransaction: {
			type: SharedTransactionType['type']
			description: string
			notes: string | null
			transactionDate: string
			currentEditVersion: number
		},
		definitions: Awaited<ReturnType<typeof buildParticipantDefinitions>>,
		options?: {
			notificationType?: 'share_invite' | 'share_updated'
			previousCarryOverByParticipantKey?: Map<string, PreviousParticipantCarryOver>
			ownerLedgerInput?: {
				accountId: string
				categoryId: string
			}
		},
	) => {
		for (const definition of definitions) {
			const participantId = randomUUID()
			const participantKey = definition.participantUserId
				? `user:${definition.participantUserId}`
				: `contact:${definition.participantContactId!}`
			const previousCarryOver = options?.previousCarryOverByParticipantKey?.get(participantKey)

			let userTransactionId = previousCarryOver?.userTransactionId ?? null
			const isOwnerParticipant = definition.participantUserId === ownerUserId

			if (isOwnerParticipant && userTransactionId) {
				const updatePayload = await queryable.query(
					`UPDATE transactions
					SET type = $2,
						status = 'done',
						amount = $3,
						description = $4,
						notes = $5,
						transaction_date = $6,
						account_id = $7,
						category_id = $8,
						source_shared_transaction_participant_id = $9,
						updated_at = NOW()
					WHERE id = $1
						AND user_id = $10
						AND deleted_at IS NULL
					RETURNING id`,
					[
						userTransactionId,
						sharedTransaction.type,
						definition.amount,
						sharedTransaction.description,
						sharedTransaction.notes,
						sharedTransaction.transactionDate,
						options.ownerLedgerInput?.accountId,
						options.ownerLedgerInput?.categoryId,
						participantId,
						ownerUserId,
					],
				)

				if (updatePayload.rowCount === 0) {
					throw badRequestError('Owner transaction not found')
				}
			} else if (isOwnerParticipant) {
				if (!options?.ownerLedgerInput) {
					throw badRequestError('Owner account and category are required')
				}

				userTransactionId = randomUUID()
				await queryable.query(
					`INSERT INTO transactions (
						id,
						user_id,
						type,
						status,
						amount,
						description,
						notes,
						transaction_date,
						account_id,
						category_id,
						recurring_transaction_id,
						recurring_version,
						transfer_pair_id,
						transfer_direction,
						is_from_shared,
						source_shared_transaction_participant_id
					) VALUES ($1, $2, $3, 'done', $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, NULL, true, $10)`,
					[
						userTransactionId,
						ownerUserId,
						sharedTransaction.type,
						definition.amount,
						sharedTransaction.description,
						sharedTransaction.notes,
						sharedTransaction.transactionDate,
						options.ownerLedgerInput.accountId,
						options.ownerLedgerInput.categoryId,
						participantId,
					],
				)
			}

			await queryable.query(
				`INSERT INTO shared_transaction_participants (
					id,
					shared_transaction_id,
					participant_user_id,
					participant_contact_id,
					amount,
					approval_status,
					approval_version,
					approved_at,
					payment_status,
					payment_marked_at,
					payment_confirmed_at,
					user_transaction_id
				) VALUES (
					$1,
					$2,
					$3,
					$4,
					$5,
					$6,
					$7,
					CASE WHEN $6 = 'accepted' THEN NOW() ELSE NULL END,
					$8,
					CASE WHEN $8 = 'confirmed_paid' THEN NOW() ELSE NULL END,
					CASE WHEN $8 = 'confirmed_paid' THEN NOW() ELSE NULL END,
					$9
				)`,
				[
					participantId,
					sharedTransactionId,
					definition.participantUserId,
					definition.participantContactId,
					definition.amount,
					definition.approvalStatus,
					sharedTransaction.currentEditVersion,
					isOwnerParticipant ? 'confirmed_paid' : 'unpaid',
					userTransactionId,
				],
			)

			if (
				definition.participantUserId &&
				definition.participantUserId !== ownerUserId &&
				definition.approvalStatus === 'pending'
			) {
				await supersedePendingApprovalNotifications(queryable, sharedTransactionId, definition.participantUserId)
				await createNotification(queryable, {
					userId: definition.participantUserId,
					type: options?.notificationType ?? 'share_invite',
					title: options?.notificationType === 'share_updated' ? 'Shared transaction updated' : 'New shared transaction',
					message:
						options?.notificationType === 'share_updated'
							? `The shared transaction "${sharedTransaction.description}" was updated`
							: `You were added to "${sharedTransaction.description}"`,
					relatedSharedTransactionId: sharedTransactionId,
					relatedSharedParticipantId: participantId,
					relatedTransactionId: userTransactionId,
				})
			}
		}
	}

	const getSharedTransactions = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false, groupId, status } = req.query as GetSharedTransactionsQueryType
		const params: unknown[] = [sessionUser.userId]
		const conditions = [
			`(
				owner_user_id = $1
				OR EXISTS (
					SELECT 1
					FROM shared_transaction_participants
					WHERE shared_transaction_id = shared_transactions.id
						AND participant_user_id = $1
						AND deleted_at IS NULL
				)
			)`,
		]

		if (!includeDeleted) {
			conditions.push('deleted_at IS NULL')
		}

		if (groupId) {
			params.push(groupId)
			conditions.push(`group_id = $${params.length}`)
		}

		if (status) {
			params.push(status)
			conditions.push(`status = $${params.length}`)
		}

		const payload = await db.query(
			`${sharedTransactionSelectSql}
			WHERE ${conditions.join('\n\t\t\t\tAND ')}
			ORDER BY transaction_date DESC, created_at DESC`,
			params,
		)

		const sharedTransactions = await hydrateSharedTransactions(payload.rows as SharedTransactionRow[])
		return validatedResponse(res, 200, SharedTransactionListSchema, sharedTransactions)
	}

	const getSharedTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as SharedTransactionIdType
		const sharedTransaction = await ensureUserCanAccessSharedTransaction(id, sessionUser.userId)

		if (!sharedTransaction) {
			throw notFoundError('Shared transaction not found')
		}

		const response = await attachOwnerLedgerClassification(sharedTransaction, sessionUser.userId)
		return validatedResponse(res, 200, SharedTransactionDetailSchema, response)
	}

	const getSharedTransactionParticipants = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as SharedTransactionIdType
		const sharedTransaction = await ensureUserCanAccessSharedTransaction(id, sessionUser.userId)

		if (!sharedTransaction) {
			throw notFoundError('Shared transaction not found')
		}

		return validatedResponse(
			res,
			200,
			SharedTransactionSchemas().SharedTransactionSchema.shape.participants,
			sharedTransaction.participants,
		)
	}

	const createSharedTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { groupId, type, ownerAccountId, ownerCategoryId, totalAmount, description, notes, transactionDate, splitMethod, participantAmounts } =
			req.body as CreateSharedTransactionInput

		const sharedTransactionId = randomUUID()

		await db.transaction(async (tx) => {
			await ensureOwnedGroup(tx, groupId, sessionUser.userId)
			await ensureAccountOwned(tx, ownerAccountId, sessionUser.userId)
			await ensureCategoryAccessible(tx, ownerCategoryId, sessionUser.userId, type)
			const definitions = await buildParticipantDefinitions(
				tx,
				groupId,
				sessionUser.userId,
				totalAmount.trim(),
				splitMethod,
				participantAmounts,
			)

			await tx.query(
				`INSERT INTO shared_transactions (
					id,
					owner_user_id,
					group_id,
					type,
					total_amount,
					description,
					notes,
					transaction_date,
					split_method,
					status,
					current_edit_version
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 1)`,
				[
					sharedTransactionId,
					sessionUser.userId,
					groupId,
					type,
					totalAmount.trim(),
					description.trim(),
					notes?.trim() ?? null,
					transactionDate,
					splitMethod,
				],
			)

			await insertParticipants(
				tx,
				sharedTransactionId,
				sessionUser.userId,
				{
					type,
					description: description.trim(),
					notes: notes?.trim() ?? null,
					transactionDate,
					currentEditVersion: 1,
				},
				definitions,
				{
					ownerLedgerInput: {
						accountId: ownerAccountId,
						categoryId: ownerCategoryId,
					},
				},
			)
			await recomputeSharedTransactionStatus(tx, sharedTransactionId)
		})

		return validatedResponse(res, 201, CreateSharedTransactionResponseSchema, {
			message: 'Shared transaction created successfully',
			sharedTransactionId,
		})
	}

	const updateSharedTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as SharedTransactionIdType
		const input = req.body as UpdateSharedTransactionInput
		let payloadRows: SharedTransactionRow[] = []

		await db.transaction(async (tx) => {
			const current = await getSharedTransactionById(id, tx)
			if (!current || current.ownerUserId !== sessionUser.userId || current.deletedAt !== null) {
				throw notFoundError('Shared transaction not found')
			}
			const currentParticipants = await loadParticipants([id], tx)
			const previousCarryOverByParticipantKey = new Map<string, PreviousParticipantCarryOver>()

			for (const participant of currentParticipants.get(id) ?? []) {
				const participantKey = participant.participantUserId
					? `user:${participant.participantUserId}`
					: `contact:${participant.participantContactId!}`
				previousCarryOverByParticipantKey.set(participantKey, {
					userTransactionId: participant.userTransactionId,
				})
			}

			const nextTotalAmount = input.totalAmount?.trim() ?? current.totalAmount
			const nextDescription = input.description?.trim() ?? current.description
			const nextNotes = input.notes === undefined ? current.notes : (input.notes?.trim() ?? null)
			const nextTransactionDate = input.transactionDate ?? current.transactionDate
			const nextSplitMethod = input.splitMethod ?? current.splitMethod
			const nextOwnerAccountId = input.ownerAccountId
			const nextOwnerCategoryId = input.ownerCategoryId
			const nextVersion = current.currentEditVersion + 1

			if ((nextOwnerAccountId && !nextOwnerCategoryId) || (!nextOwnerAccountId && nextOwnerCategoryId)) {
				throw badRequestError('Owner account and category must be provided together')
			}

			if (nextOwnerAccountId && nextOwnerCategoryId) {
				await ensureAccountOwned(tx, nextOwnerAccountId, sessionUser.userId)
				await ensureCategoryAccessible(tx, nextOwnerCategoryId, sessionUser.userId, current.type)
			}

			const definitions = await buildParticipantDefinitions(
				tx,
				current.groupId,
				sessionUser.userId,
				nextTotalAmount,
				nextSplitMethod,
				input.participantAmounts ?? [],
			)

			await tx.query(
				`UPDATE shared_transaction_participants
				SET deleted_at = NOW(),
					approval_status = 'superseded',
					updated_at = NOW()
				WHERE shared_transaction_id = $1
					AND deleted_at IS NULL`,
				[id],
			)

			const payload = await tx.query(
				`UPDATE shared_transactions
				SET total_amount = $2,
					description = $3,
					notes = $4,
					transaction_date = $5,
					split_method = $6,
					status = 'pending',
					current_edit_version = $7,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					owner_user_id as "ownerUserId",
					group_id as "groupId",
					type,
					total_amount::text as "totalAmount",
					description,
					notes,
					to_json(transaction_date) as "transactionDate",
					split_method as "splitMethod",
					status,
					current_edit_version as "currentEditVersion",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[id, nextTotalAmount, nextDescription, nextNotes, nextTransactionDate, nextSplitMethod, nextVersion],
			)

			await insertParticipants(
				tx,
				id,
				sessionUser.userId,
				{
					type: current.type,
					description: nextDescription,
					notes: nextNotes,
					transactionDate: nextTransactionDate,
					currentEditVersion: nextVersion,
				},
				definitions,
				{
					notificationType: 'share_updated',
					previousCarryOverByParticipantKey,
					ownerLedgerInput:
						nextOwnerAccountId && nextOwnerCategoryId
							? {
									accountId: nextOwnerAccountId,
									categoryId: nextOwnerCategoryId,
								}
							: undefined,
				},
			)
			await recomputeSharedTransactionStatus(tx, id)
			payloadRows = payload.rows as SharedTransactionRow[]
		})

		const [sharedTransaction] = await hydrateSharedTransactions(payloadRows)
		return validatedResponse(res, 200, SharedTransactionSchema, sharedTransaction)
	}

	const getAccessibleParticipant = async (
		queryable: Queryable,
		sharedTransactionId: string,
		participantId: string,
		userId: string,
	) => {
		const sharedTransaction = await ensureUserCanAccessSharedTransaction(sharedTransactionId, userId, false, queryable)
		if (!sharedTransaction) {
			throw notFoundError('Shared transaction not found')
		}

		const participant = sharedTransaction.participants.find((candidate) => candidate.id === participantId)
		if (!participant) {
			throw notFoundError('Shared transaction participant not found')
		}

		return { sharedTransaction, participant }
	}

	const acceptSharedTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id, participantId } = req.params as SharedTransactionParticipantIdType
		const { accountId, categoryId } = req.body as AcceptSharedTransactionInput
		let participantRow: ParticipantRow | undefined

		await db.transaction(async (tx) => {
			const { sharedTransaction, participant } = await getAccessibleParticipant(
				tx,
				id,
				participantId,
				sessionUser.userId,
			)
			if (
				participant.participantUserId !== sessionUser.userId ||
				sharedTransaction.ownerUserId === sessionUser.userId
			) {
				throw forbiddenError('You do not have permission to accept this participant share')
			}

			await ensureAccountOwned(tx, accountId, sessionUser.userId)
			await ensureCategoryAccessible(tx, categoryId, sessionUser.userId, sharedTransaction.type)

			let userTransactionId = participant.userTransactionId
			if (!userTransactionId) {
				userTransactionId = randomUUID()
				await tx.query(
					`INSERT INTO transactions (
						id,
						user_id,
						type,
						status,
						amount,
						description,
						notes,
						transaction_date,
						account_id,
						category_id,
						recurring_transaction_id,
						recurring_version,
						transfer_pair_id,
						transfer_direction,
						is_from_shared,
						source_shared_transaction_participant_id
					) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, NULL, true, $10)`,
					[
						userTransactionId,
						sessionUser.userId,
						sharedTransaction.type,
						participant.amount,
						sharedTransaction.description,
						sharedTransaction.notes,
						sharedTransaction.transactionDate,
						accountId,
						categoryId,
						participant.id,
					],
				)
			} else {
				await tx.query(
					`UPDATE transactions
					SET status = 'pending',
						amount = $2,
						description = $3,
						notes = $4,
						transaction_date = $5,
						account_id = $6,
						category_id = $7,
						updated_at = NOW()
					WHERE id = $1
						AND deleted_at IS NULL
					RETURNING
						id,
						user_id as "userId",
						type,
						status,
						amount::text as "amount",
						description,
						notes,
						to_json(transaction_date) as "transactionDate",
						account_id as "accountId",
						category_id as "categoryId",
						recurring_transaction_id as "recurringTransactionId",
						recurring_version as "recurringVersion",
						transfer_pair_id as "transferPairId",
						transfer_direction as "transferDirection",
						is_from_shared as "isFromShared",
						source_shared_transaction_participant_id as "sourceSharedTransactionParticipantId",
						to_json(created_at) as "createdAt",
						to_json(updated_at) as "updatedAt",
						to_json(deleted_at) as "deletedAt"`,
					[
						userTransactionId,
						participant.amount,
						sharedTransaction.description,
						sharedTransaction.notes,
						sharedTransaction.transactionDate,
						accountId,
						categoryId,
					],
				)
			}

			const payload = await tx.query(
				`UPDATE shared_transaction_participants
				SET approval_status = 'accepted',
					approved_at = NOW(),
					user_transaction_id = $2,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					shared_transaction_id as "sharedTransactionId",
					participant_user_id as "participantUserId",
					participant_contact_id as "participantContactId",
					amount::text as "amount",
					approval_status as "approvalStatus",
					approval_version as "approvalVersion",
					to_json(approved_at) as "approvedAt",
					payment_status as "paymentStatus",
					to_json(payment_marked_at) as "paymentMarkedAt",
					to_json(payment_confirmed_at) as "paymentConfirmedAt",
					user_transaction_id as "userTransactionId",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[participant.id, userTransactionId],
			)

			await recomputeSharedTransactionStatus(tx, id)
			participantRow = payload.rows[0] as ParticipantRow
		})

		return validatedResponse(res, 200, SharedTransactionParticipantSchema, participantRow!)
	}

	const rejectSharedTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id, participantId } = req.params as SharedTransactionParticipantIdType
		let participantRow: ParticipantRow | undefined

		await db.transaction(async (tx) => {
			const { sharedTransaction, participant } = await getAccessibleParticipant(
				tx,
				id,
				participantId,
				sessionUser.userId,
			)
			if (
				participant.participantUserId !== sessionUser.userId ||
				sharedTransaction.ownerUserId === sessionUser.userId
			) {
				throw forbiddenError('You do not have permission to reject this participant share')
			}

			const payload = await tx.query(
				`UPDATE shared_transaction_participants
				SET approval_status = 'rejected',
					approved_at = NULL,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					shared_transaction_id as "sharedTransactionId",
					participant_user_id as "participantUserId",
					participant_contact_id as "participantContactId",
					amount::text as "amount",
					approval_status as "approvalStatus",
					approval_version as "approvalVersion",
					to_json(approved_at) as "approvedAt",
					payment_status as "paymentStatus",
					to_json(payment_marked_at) as "paymentMarkedAt",
					to_json(payment_confirmed_at) as "paymentConfirmedAt",
					user_transaction_id as "userTransactionId",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[participant.id],
			)

			await recomputeSharedTransactionStatus(tx, id)
			participantRow = payload.rows[0] as ParticipantRow
		})

		return validatedResponse(res, 200, SharedTransactionParticipantSchema, participantRow!)
	}

	const markSharedTransactionPaid = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id, participantId } = req.params as SharedTransactionParticipantIdType
		let participantRow: ParticipantRow | undefined

		await db.transaction(async (tx) => {
			const { sharedTransaction, participant } = await getAccessibleParticipant(
				tx,
				id,
				participantId,
				sessionUser.userId,
			)

			const canOwnerMarkContact =
				sharedTransaction.ownerUserId === sessionUser.userId && participant.participantContactId !== null
			const canUserMarkOwn =
				participant.participantUserId === sessionUser.userId && sharedTransaction.ownerUserId !== sessionUser.userId

			if (!canOwnerMarkContact && !canUserMarkOwn) {
				throw forbiddenError('You do not have permission to mark this participant share as paid')
			}

			const nextPaymentStatus = canOwnerMarkContact ? 'confirmed_paid' : 'marked_paid'
			const payload = await tx.query(
				`UPDATE shared_transaction_participants
				SET payment_status = $2,
					payment_marked_at = NOW(),
					payment_confirmed_at = CASE WHEN $2 = 'confirmed_paid' THEN NOW() ELSE payment_confirmed_at END,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					shared_transaction_id as "sharedTransactionId",
					participant_user_id as "participantUserId",
					participant_contact_id as "participantContactId",
					amount::text as "amount",
					approval_status as "approvalStatus",
					approval_version as "approvalVersion",
					to_json(approved_at) as "approvedAt",
					payment_status as "paymentStatus",
					to_json(payment_marked_at) as "paymentMarkedAt",
					to_json(payment_confirmed_at) as "paymentConfirmedAt",
					user_transaction_id as "userTransactionId",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[participant.id, nextPaymentStatus],
			)

			participantRow = payload.rows[0] as ParticipantRow

			if (canUserMarkOwn) {
				await createNotification(tx, {
					userId: sharedTransaction.ownerUserId,
					type: 'payment_confirm_request',
					title: 'Payment confirmation requested',
					message: `${sharedTransaction.description} was marked as paid`,
					relatedSharedTransactionId: id,
					relatedSharedParticipantId: participant.id,
					relatedTransactionId: participant.userTransactionId,
				})
			}
		})

		return validatedResponse(res, 200, SharedTransactionParticipantSchema, participantRow!)
	}

	const confirmSharedTransactionPaid = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id, participantId } = req.params as SharedTransactionParticipantIdType
		let participantRow: ParticipantRow | undefined

		await db.transaction(async (tx) => {
			const { sharedTransaction, participant } = await getAccessibleParticipant(
				tx,
				id,
				participantId,
				sessionUser.userId,
			)
			if (sharedTransaction.ownerUserId !== sessionUser.userId) {
				throw forbiddenError('You do not have permission to confirm this participant payment')
			}

			if (participant.paymentStatus !== 'marked_paid') {
				throw badRequestError('Participant payment must be marked before it can be confirmed')
			}

			const payload = await tx.query(
				`UPDATE shared_transaction_participants
				SET payment_status = 'confirmed_paid',
					payment_confirmed_at = NOW(),
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					shared_transaction_id as "sharedTransactionId",
					participant_user_id as "participantUserId",
					participant_contact_id as "participantContactId",
					amount::text as "amount",
					approval_status as "approvalStatus",
					approval_version as "approvalVersion",
					to_json(approved_at) as "approvedAt",
					payment_status as "paymentStatus",
					to_json(payment_marked_at) as "paymentMarkedAt",
					to_json(payment_confirmed_at) as "paymentConfirmedAt",
					user_transaction_id as "userTransactionId",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[participant.id],
			)

			participantRow = payload.rows[0] as ParticipantRow

			if (participant.userTransactionId) {
				await tx.query(
					`UPDATE transactions
					SET status = 'done',
						updated_at = NOW()
					WHERE id = $1
						AND deleted_at IS NULL`,
					[participant.userTransactionId],
				)
			}

			if (participant.participantUserId) {
				await createNotification(tx, {
					userId: participant.participantUserId,
					type: 'payment_confirmed',
					title: 'Payment confirmed',
					message: `${sharedTransaction.description} payment was confirmed`,
					relatedSharedTransactionId: id,
					relatedSharedParticipantId: participant.id,
					relatedTransactionId: participant.userTransactionId,
				})
			}
		})

		return validatedResponse(res, 200, SharedTransactionParticipantSchema, participantRow!)
	}

	const deleteSharedTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as SharedTransactionIdType

		const current = await getSharedTransactionById(id)
		if (!current || current.ownerUserId !== sessionUser.userId || current.deletedAt !== null) {
			throw notFoundError('Shared transaction not found')
		}

		await db.query(
			`UPDATE shared_transactions
			SET deleted_at = NOW(),
				status = 'cancelled',
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Shared transaction deleted successfully' })
	}

	return {
		getSharedTransactions,
		getSharedTransaction,
		getSharedTransactionParticipants,
		createSharedTransaction,
		updateSharedTransaction,
		acceptSharedTransaction,
		rejectSharedTransaction,
		markSharedTransactionPaid,
		confirmSharedTransactionPaid,
		deleteSharedTransaction,
	}
}
