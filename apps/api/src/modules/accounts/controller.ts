import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { AccountSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type { AccountIdType, AccountType, CreateAccountType, GetAccountsQueryType, UpdateAccountType } from './model.ts'

const accountSelectSql = `SELECT
			id,
			user_id as "userId",
			currency_code as "currencyCode",
			name,
			icon,
			color,
			initial_value::text as "initialValue",
			is_archived as "isArchived",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM accounts`

export const buildAccountController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, notFoundError } = AppError()
	const { AccountListSchema, AccountSchema, CreateAccountResponseSchema } = AccountSchemas()

	const ensureCurrencyExists = async (currencyCode: string) => {
		const payload = await db.query(
			`SELECT code
			FROM currencies
			WHERE code = $1
				AND is_active = true`,
			[currencyCode],
		)

		if (payload.rowCount === 0) {
			throw badRequestError('Currency not found')
		}
	}

	const getAccessibleAccountById = async (accountId: string, userId: string) => {
		const payload = await db.query(
			`${accountSelectSql}
			WHERE id = $1
				AND user_id = $2
				AND deleted_at IS NULL`,
			[accountId, userId],
		)

		return payload.rows[0] as AccountType | undefined
	}

	const getAccounts = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeArchived = false } = req.query as GetAccountsQueryType
		const params: unknown[] = [sessionUser.userId]
		let sql = `${accountSelectSql}
			WHERE user_id = $1
				AND deleted_at IS NULL`

		if (!includeArchived) {
			sql += `
				AND is_archived = false`
		}

		sql += `
			ORDER BY is_archived ASC, created_at DESC`

		const payload = await db.query(sql, params)

		return validatedResponse(res, 200, AccountListSchema, payload.rows)
	}

	const createAccount = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { currencyCode, name, icon, color, initialValue } = req.body as CreateAccountType
		const accountId = randomUUID()
		const normalizedCurrencyCode = currencyCode.toUpperCase()

		await ensureCurrencyExists(normalizedCurrencyCode)

		await db.query(
			`INSERT INTO accounts (
				id,
				user_id,
				currency_code,
				name,
				icon,
				color,
				initial_value
			) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[accountId, sessionUser.userId, normalizedCurrencyCode, name.trim(), icon.trim(), color.trim(), initialValue.trim()],
		)

		return validatedResponse(res, 201, CreateAccountResponseSchema, {
			message: 'Account created successfully',
			accountId,
		})
	}

	const updateAccount = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as AccountIdType
		const { currencyCode, name, icon, color, initialValue, isArchived } = req.body as UpdateAccountType

		const currentAccount = await getAccessibleAccountById(id, sessionUser.userId)
		if (!currentAccount) {
			throw notFoundError('Account not found')
		}

		const nextCurrencyCode = currencyCode?.toUpperCase() ?? currentAccount.currencyCode
		if (nextCurrencyCode !== currentAccount.currencyCode) {
			await ensureCurrencyExists(nextCurrencyCode)
		}

		const payload = await db.query(
			`UPDATE accounts
			SET currency_code = $2,
				name = $3,
				icon = $4,
				color = $5,
				initial_value = $6,
				is_archived = $7,
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL
			RETURNING
				id,
				user_id as "userId",
				currency_code as "currencyCode",
				name,
				icon,
				color,
				initial_value::text as "initialValue",
				is_archived as "isArchived",
				to_json(created_at) as "createdAt",
				to_json(updated_at) as "updatedAt",
				to_json(deleted_at) as "deletedAt"`,
			[
				id,
				nextCurrencyCode,
				name?.trim() ?? currentAccount.name,
				icon?.trim() ?? currentAccount.icon,
				color?.trim() ?? currentAccount.color,
				initialValue?.trim() ?? currentAccount.initialValue,
				isArchived ?? currentAccount.isArchived,
			],
		)

		return validatedResponse(res, 200, AccountSchema, payload.rows[0])
	}

	const deleteAccount = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as AccountIdType

		const currentAccount = await getAccessibleAccountById(id, sessionUser.userId)
		if (!currentAccount) {
			throw notFoundError('Account not found')
		}

		await db.query(
			`UPDATE accounts
			SET deleted_at = NOW(),
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Account deleted successfully' })
	}

	return {
		getAccounts,
		createAccount,
		updateAccount,
		deleteAccount,
	}
}
