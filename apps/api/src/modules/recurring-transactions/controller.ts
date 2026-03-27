import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { RecurringTransactionSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type {
	CreateRecurringTransactionInput,
	GenerateDueRecurringTransactionsInput,
	GetRecurringTransactionsQueryType,
	RecurringTransactionIdType,
	RecurringTransactionType,
	UpdateRecurringTransactionInput,
} from './model.ts'

type Queryable = Pick<AppDependency['db'], 'query'>
type RecurringRow = RecurringTransactionType

const recurringSelectSql = `SELECT
			id,
			user_id as "userId",
			type,
			mode,
			frequency,
			template_description as "templateDescription",
			template_amount::text as "templateAmount",
			template_notes as "templateNotes",
			template_category_id as "templateCategoryId",
			template_account_id as "templateAccountId",
			starts_on::text as "startsOn",
			next_generation_date::text as "nextGenerationDate",
			total_occurrences as "totalOccurrences",
			current_version as "currentVersion",
			is_active as "isActive",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM recurring_transactions`

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10)
const toRecurringTransactionDate = (value: string) => `${value}T00:00:00.000Z`

const addFrequency = (dateValue: string, frequency: RecurringTransactionType['frequency']) => {
	const date = new Date(`${dateValue}T00:00:00.000Z`)

	switch (frequency) {
		case 'daily':
			date.setUTCDate(date.getUTCDate() + 1)
			break
		case 'weekly':
			date.setUTCDate(date.getUTCDate() + 7)
			break
		case 'fortnightly':
			date.setUTCDate(date.getUTCDate() + 14)
			break
		case 'monthly':
			date.setUTCMonth(date.getUTCMonth() + 1)
			break
		case 'quarterly':
			date.setUTCMonth(date.getUTCMonth() + 3)
			break
		case 'semiannually':
			date.setUTCMonth(date.getUTCMonth() + 6)
			break
		case 'annually':
			date.setUTCFullYear(date.getUTCFullYear() + 1)
			break
	}

	return toIsoDate(date)
}

export const buildRecurringTransactionController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, notFoundError } = AppError()
	const {
		RecurringTransactionListSchema,
		RecurringTransactionSchema,
		CreateRecurringTransactionResponseSchema,
		GenerateDueRecurringTransactionsResponseSchema,
	} = RecurringTransactionSchemas()

	const getAccessibleRecurringTransactionById = async (
		recurringTransactionId: string,
		userId: string,
		includeDeleted = false,
		queryable: Queryable = db,
	) => {
		const payload = await queryable.query(
			`${recurringSelectSql}
			WHERE id = $1
				AND user_id = $2
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[recurringTransactionId, userId],
		)

		return payload.rows[0] as RecurringRow | undefined
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
		type: RecurringTransactionType['type'],
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

	const countGeneratedOccurrences = async (queryable: Queryable, recurringTransactionId: string) => {
		const payload = await queryable.query(
			`SELECT COUNT(*)::int as "count"
			FROM transactions
			WHERE recurring_transaction_id = $1
				AND deleted_at IS NULL`,
			[recurringTransactionId],
		)

		return payload.rows[0]?.count ?? 0
	}

	const getRecurringTransactions = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false, includeInactive = false } = req.query as GetRecurringTransactionsQueryType
		let sql = `${recurringSelectSql}
			WHERE user_id = $1`

		if (!includeDeleted) {
			sql += `
				AND deleted_at IS NULL`
		}

		if (!includeInactive) {
			sql += `
				AND is_active = true`
		}

		sql += `
			ORDER BY created_at DESC`

		const payload = await db.query(sql, [sessionUser.userId])
		return validatedResponse(res, 200, RecurringTransactionListSchema, payload.rows)
	}

	const getRecurringTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as RecurringTransactionIdType
		const recurringTransaction = await getAccessibleRecurringTransactionById(id, sessionUser.userId)

		if (!recurringTransaction) {
			throw notFoundError('Recurring transaction not found')
		}

		return validatedResponse(res, 200, RecurringTransactionSchema, recurringTransaction)
	}

	const createRecurringTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const {
			type,
			mode,
			frequency,
			templateDescription,
			templateAmount,
			templateNotes,
			templateCategoryId,
			templateAccountId,
			startsOn,
			totalOccurrences = null,
		} = req.body as CreateRecurringTransactionInput

		const recurringTransactionId = randomUUID()

		await db.transaction(async (tx) => {
			await ensureAccountOwned(tx, templateAccountId, sessionUser.userId)
			await ensureCategoryAccessible(tx, templateCategoryId, sessionUser.userId, type)

			await tx.query(
				`INSERT INTO recurring_transactions (
					id,
					user_id,
					type,
					mode,
					frequency,
					template_description,
					template_amount,
					template_notes,
					template_category_id,
					template_account_id,
					starts_on,
					next_generation_date,
					total_occurrences
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)`,
				[
					recurringTransactionId,
					sessionUser.userId,
					type,
					mode,
					frequency,
					templateDescription.trim(),
					templateAmount.trim(),
					templateNotes?.trim() ?? null,
					templateCategoryId ?? null,
					templateAccountId,
					startsOn,
					totalOccurrences,
				],
			)
		})

		return validatedResponse(res, 201, CreateRecurringTransactionResponseSchema, {
			message: 'Recurring transaction created successfully',
			recurringTransactionId,
		})
	}

	const updateRecurringTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as RecurringTransactionIdType
		const input = req.body as UpdateRecurringTransactionInput

		let payloadRows: RecurringRow[] = []

		await db.transaction(async (tx) => {
			const currentRecurringTransaction = await getAccessibleRecurringTransactionById(id, sessionUser.userId, false, tx)
			if (!currentRecurringTransaction) {
				throw notFoundError('Recurring transaction not found')
			}

			const nextType = input.type ?? currentRecurringTransaction.type
			const nextStartsOn = input.startsOn ?? currentRecurringTransaction.startsOn
			const nextFrequency = input.frequency ?? currentRecurringTransaction.frequency
			const nextTemplateAccountId = input.templateAccountId ?? currentRecurringTransaction.templateAccountId
			const nextTemplateCategoryId =
				input.templateCategoryId === undefined ? currentRecurringTransaction.templateCategoryId : input.templateCategoryId

			await ensureAccountOwned(tx, nextTemplateAccountId, sessionUser.userId)
			await ensureCategoryAccessible(tx, nextTemplateCategoryId, sessionUser.userId, nextType)

			const currentGeneratedCount = await countGeneratedOccurrences(tx, currentRecurringTransaction.id)
			const nextTotalOccurrences =
				input.totalOccurrences === undefined ? currentRecurringTransaction.totalOccurrences : input.totalOccurrences

			if (nextTotalOccurrences !== null && nextTotalOccurrences < currentGeneratedCount) {
				throw badRequestError('Total occurrences cannot be less than already generated occurrences')
			}

			const nextGenerationDate =
				currentRecurringTransaction.nextGenerationDate < nextStartsOn ? nextStartsOn : currentRecurringTransaction.nextGenerationDate

			const payload = await tx.query(
				`UPDATE recurring_transactions
				SET type = $2,
					mode = $3,
					frequency = $4,
					template_description = $5,
					template_amount = $6,
					template_notes = $7,
					template_category_id = $8,
					template_account_id = $9,
					starts_on = $10,
					next_generation_date = $11,
					total_occurrences = $12,
					current_version = current_version + 1,
					is_active = $13,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					user_id as "userId",
					type,
					mode,
					frequency,
					template_description as "templateDescription",
					template_amount::text as "templateAmount",
					template_notes as "templateNotes",
					template_category_id as "templateCategoryId",
					template_account_id as "templateAccountId",
					starts_on::text as "startsOn",
					next_generation_date::text as "nextGenerationDate",
					total_occurrences as "totalOccurrences",
					current_version as "currentVersion",
					is_active as "isActive",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[
					id,
					nextType,
					input.mode ?? currentRecurringTransaction.mode,
					nextFrequency,
					input.templateDescription?.trim() ?? currentRecurringTransaction.templateDescription,
					input.templateAmount?.trim() ?? currentRecurringTransaction.templateAmount,
					input.templateNotes === undefined
						? currentRecurringTransaction.templateNotes
						: input.templateNotes?.trim() ?? null,
					nextTemplateCategoryId,
					nextTemplateAccountId,
					nextStartsOn,
					nextGenerationDate,
					nextTotalOccurrences,
					input.isActive ?? currentRecurringTransaction.isActive,
				],
			)

			payloadRows = payload.rows as RecurringRow[]
		})

		return validatedResponse(res, 200, RecurringTransactionSchema, payloadRows[0])
	}

	const generateDueRecurringTransactions = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { throughDate = toIsoDate(new Date()) } = (req.body ?? {}) as GenerateDueRecurringTransactionsInput
		const generatedTransactionIds: string[] = []

		await db.transaction(async (tx) => {
			const payload = await tx.query(
				`${recurringSelectSql}
				WHERE user_id = $1
					AND deleted_at IS NULL
					AND is_active = true
					AND next_generation_date <= $2
				ORDER BY next_generation_date ASC, created_at ASC`,
				[sessionUser.userId, throughDate],
			)

			for (const recurringTransaction of payload.rows as RecurringRow[]) {
				let nextGenerationDate = recurringTransaction.nextGenerationDate
				let generatedCount = await countGeneratedOccurrences(tx, recurringTransaction.id)

				while (nextGenerationDate <= throughDate) {
					if (recurringTransaction.totalOccurrences !== null && generatedCount >= recurringTransaction.totalOccurrences) {
						await tx.query(
							`UPDATE recurring_transactions
							SET is_active = false,
								updated_at = NOW()
							WHERE id = $1`,
							[recurringTransaction.id],
						)
						break
					}

					const transactionId = randomUUID()
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
						) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, NULL, NULL, false, NULL)`,
						[
							transactionId,
							sessionUser.userId,
							recurringTransaction.type,
							recurringTransaction.templateAmount,
							recurringTransaction.templateDescription,
							recurringTransaction.templateNotes,
							toRecurringTransactionDate(nextGenerationDate),
							recurringTransaction.templateAccountId,
							recurringTransaction.templateCategoryId,
							recurringTransaction.id,
							recurringTransaction.currentVersion,
						],
					)

					generatedTransactionIds.push(transactionId)
					generatedCount += 1

					const followingGenerationDate = addFrequency(nextGenerationDate, recurringTransaction.frequency)
					nextGenerationDate = followingGenerationDate

					await tx.query(
						`UPDATE recurring_transactions
						SET next_generation_date = $2,
							is_active = $3,
							updated_at = NOW()
						WHERE id = $1`,
						[
							recurringTransaction.id,
							followingGenerationDate,
							recurringTransaction.totalOccurrences === null || generatedCount < recurringTransaction.totalOccurrences,
						],
					)
				}
			}
		})

		return validatedResponse(res, 200, GenerateDueRecurringTransactionsResponseSchema, {
			message: 'Due recurring transactions generated successfully',
			generatedCount: generatedTransactionIds.length,
			transactionIds: generatedTransactionIds,
		})
	}

	const deleteRecurringTransaction = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as RecurringTransactionIdType

		const recurringTransaction = await getAccessibleRecurringTransactionById(id, sessionUser.userId)
		if (!recurringTransaction) {
			throw notFoundError('Recurring transaction not found')
		}

		await db.query(
			`UPDATE recurring_transactions
			SET deleted_at = NOW(),
				is_active = false,
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Recurring transaction deleted successfully' })
	}

	return {
		getRecurringTransactions,
		getRecurringTransaction,
		createRecurringTransaction,
		updateRecurringTransaction,
		generateDueRecurringTransactions,
		deleteRecurringTransaction,
	}
}
