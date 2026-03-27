import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { TransactionSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type {
	CreateTransactionInput,
	CreateTransferInput,
	GetTransactionsQueryType,
	TransactionIdType,
	TransactionType,
	UpdateTransactionInput,
} from './model.ts'

type AccountLookup = {
	id: string
	currencyCode: string
}

type CategoryLookup = {
	id: string
}

type TagLookup = {
	id: string
}

type TransactionRow = Omit<TransactionType, 'tagIds'>
type Queryable = Pick<AppDependency['db'], 'query'>

const transactionSelectSql = `SELECT
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
			to_json(deleted_at) as "deletedAt"
		FROM transactions`

export const buildTransactionController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, notFoundError } = AppError()
	const { TransactionListSchema, TransactionSchema, CreateTransactionResponseSchema, CreateTransferResponseSchema } =
		TransactionSchemas()

	const getTagIdsByTransaction = async (transactionIds: string[]) => {
		if (transactionIds.length === 0) {
			return new Map<string, string[]>()
		}

		const payload = await db.query(
			`SELECT transaction_id as "transactionId", tag_id as "tagId"
			FROM transaction_tags
			WHERE transaction_id = ANY($1)
				AND deleted_at IS NULL
			ORDER BY created_at ASC`,
			[transactionIds],
		)

		const tagIdsByTransaction = new Map<string, string[]>()
		for (const row of payload.rows as Array<{ transactionId: string; tagId: string }>) {
			const tagIds = tagIdsByTransaction.get(row.transactionId) ?? []
			tagIds.push(row.tagId)
			tagIdsByTransaction.set(row.transactionId, tagIds)
		}

		return tagIdsByTransaction
	}

	const hydrateTransactions = async (rows: TransactionRow[]) => {
		const tagIdsByTransaction = await getTagIdsByTransaction(rows.map((row) => row.id))

		return rows.map((row) => ({
			...row,
			tagIds: tagIdsByTransaction.get(row.id) ?? [],
		}))
	}

	const getAccessibleTransactionById = async (
		transactionId: string,
		userId: string,
		includeDeleted = false,
		queryable: Queryable = db,
	) => {
		const payload = await queryable.query(
			`${transactionSelectSql}
			WHERE id = $1
				AND user_id = $2
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[transactionId, userId],
		)

		const row = payload.rows[0] as TransactionRow | undefined
		if (!row) {
			return undefined
		}

		const [transaction] = await hydrateTransactions([row])
		return transaction
	}

	const ensureAccountOwned = async (queryable: Queryable, accountId: string, userId: string) => {
		const payload = await queryable.query(
			`SELECT id, currency_code as "currencyCode"
			FROM accounts
			WHERE id = $1
				AND user_id = $2
				AND deleted_at IS NULL`,
			[accountId, userId],
		)

		const account = payload.rows[0] as AccountLookup | undefined
		if (!account) {
			throw badRequestError('Account not found')
		}

		return account
	}

	const ensureCategoryAccessible = async (queryable: Queryable, categoryId: string | null | undefined, userId: string) => {
		if (!categoryId) {
			return null
		}

		const payload = await queryable.query(
			`SELECT id
			FROM categories
			WHERE id = $1
				AND deleted_at IS NULL
				AND (
					is_default = true
					OR (user_id = $2 AND is_default = false)
				)`,
			[categoryId, userId],
		)

		const category = payload.rows[0] as CategoryLookup | undefined
		if (!category) {
			throw badRequestError('Category not found')
		}

		return category
	}

	const ensureTagsOwned = async (queryable: Queryable, tagIds: string[], userId: string) => {
		const uniqueTagIds = [...new Set(tagIds)]
		if (uniqueTagIds.length !== tagIds.length) {
			throw badRequestError('Tag IDs must be unique')
		}

		if (uniqueTagIds.length === 0) {
			return uniqueTagIds
		}

		const payload = await queryable.query(
			`SELECT id
			FROM tags
			WHERE user_id = $1
				AND deleted_at IS NULL
				AND id = ANY($2)`,
			[userId, uniqueTagIds],
		)

		if (payload.rowCount !== uniqueTagIds.length) {
			throw badRequestError('All tags must belong to the current user')
		}

		return uniqueTagIds as TagLookup['id'][]
	}

	const replaceTransactionTags = async (tx: Pick<AppDependency['db'], 'query'>, transactionId: string, tagIds: string[]) => {
		await tx.query(
			`UPDATE transaction_tags
			SET deleted_at = NOW(),
				updated_at = NOW()
			WHERE transaction_id = $1
				AND deleted_at IS NULL`,
			[transactionId],
		)

		for (const tagId of tagIds) {
			await tx.query(
				`INSERT INTO transaction_tags (
					id,
					transaction_id,
					tag_id
				) VALUES ($1, $2, $3)`,
				[randomUUID(), transactionId, tagId],
			)
		}
	}

	const insertTransaction = async (
		tx: Pick<AppDependency['db'], 'query'>,
		input: {
			id: string
			userId: string
			type: TransactionType['type']
			status: TransactionType['status']
			amount: string
			description: string
			notes: string | null
			transactionDate: string
			accountId: string
			categoryId: string | null
			transferPairId: string | null
			transferDirection: TransactionType['transferDirection']
		},
		tagIds: string[],
	) => {
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
				transfer_pair_id,
				transfer_direction,
				is_from_shared,
				source_shared_transaction_participant_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, NULL)`,
			[
				input.id,
				input.userId,
				input.type,
				input.status,
				input.amount,
				input.description,
				input.notes,
				input.transactionDate,
				input.accountId,
				input.categoryId,
				input.transferPairId,
				input.transferDirection,
			],
		)

		for (const tagId of tagIds) {
			await tx.query(
				`INSERT INTO transaction_tags (
					id,
					transaction_id,
					tag_id
				) VALUES ($1, $2, $3)`,
				[randomUUID(), input.id, tagId],
			)
		}
	}

	const getTransactions = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false, from, to, accountId, type, status, categoryId, tagId } =
			req.query as GetTransactionsQueryType
		const params: unknown[] = [sessionUser.userId]
		const conditions = ['user_id = $1']

		if (!includeDeleted) {
			conditions.push('deleted_at IS NULL')
		}

		if (from) {
			params.push(from)
			conditions.push(`transaction_date >= $${params.length}`)
		}

		if (to) {
			params.push(to)
			conditions.push(`transaction_date <= $${params.length}`)
		}

		if (accountId) {
			params.push(accountId)
			conditions.push(`account_id = $${params.length}`)
		}

		if (type) {
			params.push(type)
			conditions.push(`type = $${params.length}`)
		}

		if (status) {
			params.push(status)
			conditions.push(`status = $${params.length}`)
		}

		if (categoryId) {
			params.push(categoryId)
			conditions.push(`category_id = $${params.length}`)
		}

		if (tagId) {
			params.push(tagId)
			conditions.push(
				`EXISTS (
					SELECT 1
					FROM transaction_tags
					WHERE transaction_id = transactions.id
						AND tag_id = $${params.length}
						AND deleted_at IS NULL
				)`,
			)
		}

		const payload = await db.query(
			`${transactionSelectSql}
			WHERE ${conditions.join('\n\t\t\t\tAND ')}
			ORDER BY transaction_date DESC, created_at DESC`,
			params,
		)

		const transactions = await hydrateTransactions(payload.rows as TransactionRow[])
		return validatedResponse(res, 200, TransactionListSchema, transactions)
	}

	const getTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as TransactionIdType
		const transaction = await getAccessibleTransactionById(id, sessionUser.userId)

		if (!transaction) {
			throw notFoundError('Transaction not found')
		}

		return validatedResponse(res, 200, TransactionSchema, transaction)
	}

	const createTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { type, status = 'done', amount, description, notes, transactionDate, accountId, categoryId, tagIds = [] } =
			req.body as CreateTransactionInput

		const transactionId = randomUUID()

		await db.transaction(async (tx) => {
			await ensureAccountOwned(tx, accountId, sessionUser.userId)
			if (!categoryId) {
				throw badRequestError('Category is required')
			}
			await ensureCategoryAccessible(tx, categoryId, sessionUser.userId)
			const normalizedTagIds = await ensureTagsOwned(tx, tagIds, sessionUser.userId)

			await insertTransaction(
				tx,
				{
					id: transactionId,
					userId: sessionUser.userId,
					type,
					status,
					amount: amount.trim(),
					description: description.trim(),
					notes: notes?.trim() ?? null,
					transactionDate,
					accountId,
					categoryId: categoryId ?? null,
					transferPairId: null,
					transferDirection: null,
				},
				normalizedTagIds,
			)
		})

		return validatedResponse(res, 201, CreateTransactionResponseSchema, {
			message: 'Transaction created successfully',
			transactionId,
		})
	}

	const createTransfer = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const {
			status = 'done',
			fromAccountId,
			toAccountId,
			fromAmount,
			toAmount,
			description,
			notes,
			transactionDate,
			tagIds = [],
		} = req.body as CreateTransferInput

		if (fromAccountId === toAccountId) {
			throw badRequestError('Transfer accounts must be different')
		}

		const transferPairId = randomUUID()
		const outTransactionId = randomUUID()
		const inTransactionId = randomUUID()

		await db.transaction(async (tx) => {
			const fromAccount = await ensureAccountOwned(tx, fromAccountId, sessionUser.userId)
			const toAccount = await ensureAccountOwned(tx, toAccountId, sessionUser.userId)
			const normalizedTagIds = await ensureTagsOwned(tx, tagIds, sessionUser.userId)

			if (fromAccount.currencyCode === toAccount.currencyCode && fromAmount !== toAmount) {
				throw badRequestError('Transfer amounts must match for the same currency')
			}

			await insertTransaction(
				tx,
				{
					id: outTransactionId,
					userId: sessionUser.userId,
					type: 'transfer',
					status,
					amount: fromAmount.trim(),
					description: description.trim(),
					notes: notes?.trim() ?? null,
					transactionDate,
					accountId: fromAccountId,
					categoryId: null,
					transferPairId,
					transferDirection: 'out',
				},
				normalizedTagIds,
			)

			await insertTransaction(
				tx,
				{
					id: inTransactionId,
					userId: sessionUser.userId,
					type: 'transfer',
					status,
					amount: toAmount.trim(),
					description: description.trim(),
					notes: notes?.trim() ?? null,
					transactionDate,
					accountId: toAccountId,
					categoryId: null,
					transferPairId,
					transferDirection: 'in',
				},
				normalizedTagIds,
			)
		})

		return validatedResponse(res, 201, CreateTransferResponseSchema, {
			message: 'Transfer created successfully',
			transferPairId,
			outTransactionId,
			inTransactionId,
		})
	}

	const updateTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as TransactionIdType
		const { status, amount, description, notes, transactionDate, accountId, categoryId, tagIds } =
			req.body as UpdateTransactionInput

		const currentTransaction = await getAccessibleTransactionById(id, sessionUser.userId)
		if (!currentTransaction) {
			throw notFoundError('Transaction not found')
		}

		if (currentTransaction.type === 'transfer') {
			throw badRequestError('Transfer transactions must be managed through the transfer endpoint')
		}

		const nextAccountId = accountId ?? currentTransaction.accountId
		const nextCategoryId = categoryId === undefined ? currentTransaction.categoryId : categoryId
		let payloadRows: TransactionRow[] = []

		await db.transaction(async (tx) => {
			await ensureAccountOwned(tx, nextAccountId, sessionUser.userId)
			if (!nextCategoryId) {
				throw badRequestError('Category is required')
			}
			await ensureCategoryAccessible(tx, nextCategoryId, sessionUser.userId)
			const normalizedTagIds =
				tagIds === undefined ? currentTransaction.tagIds : await ensureTagsOwned(tx, tagIds, sessionUser.userId)

			const payload = await tx.query(
				`UPDATE transactions
				SET status = $2,
					amount = $3,
					description = $4,
					notes = $5,
					transaction_date = $6,
					account_id = $7,
					category_id = $8,
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
					id,
					status ?? currentTransaction.status,
					amount?.trim() ?? currentTransaction.amount,
					description?.trim() ?? currentTransaction.description,
					notes === undefined ? currentTransaction.notes : notes?.trim() ?? null,
					transactionDate ?? currentTransaction.transactionDate,
					nextAccountId,
					nextCategoryId,
				],
			)

			await replaceTransactionTags(tx, id, normalizedTagIds)
			payloadRows = payload.rows as TransactionRow[]
		})

		const [transaction] = await hydrateTransactions(payloadRows)
		return validatedResponse(res, 200, TransactionSchema, transaction)
	}

	const deleteTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as TransactionIdType

		const currentTransaction = await getAccessibleTransactionById(id, sessionUser.userId)
		if (!currentTransaction) {
			throw notFoundError('Transaction not found')
		}

		await db.transaction(async (tx) => {
			const transactionToDelete = await getAccessibleTransactionById(id, sessionUser.userId, false, tx)
			if (!transactionToDelete) {
				throw notFoundError('Transaction not found')
			}

			if (transactionToDelete.transferPairId) {
				await tx.query(
					`UPDATE transactions
					SET deleted_at = NOW(),
						updated_at = NOW()
					WHERE user_id = $1
						AND transfer_pair_id = $2
						AND deleted_at IS NULL`,
					[sessionUser.userId, transactionToDelete.transferPairId],
				)
			} else {
				await tx.query(
					`UPDATE transactions
					SET deleted_at = NOW(),
						updated_at = NOW()
					WHERE id = $1
						AND deleted_at IS NULL`,
					[id],
				)
			}
		})

		return res.code(200).send({ message: 'Transaction deleted successfully' })
	}

	return {
		getTransactions,
		getTransaction,
		createTransaction,
		createTransfer,
		updateTransaction,
		deleteTransaction,
	}
}
