import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { CurrencySchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type { CreateCurrencyType, CurrencyCodeParamType, CurrencyType, GetCurrenciesQueryType, UpdateCurrencyType } from './model.ts'

const currencySelectSql = `SELECT
			code,
			name,
			symbol,
			decimal_places as "decimalPlaces",
			is_active as "isActive",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM currencies`

export const buildCurrencyController = (deps: AppDependency) => {
	const { db } = deps
	const { conflictError, notFoundError, isDatabaseError } = AppError()
	const { CurrencyListSchema, CurrencySchema, CreateCurrencyResponseSchema } = CurrencySchemas()

	const getCurrencyByCode = async (code: string, includeDeleted = false): Promise<CurrencyType | undefined> => {
		const payload = await db.query(
			`${currencySelectSql}
			WHERE code = $1
			${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[code],
		)

		return payload.rows[0]
	}

	const getCurrencies = async (req: FastifyRequest, res: FastifyReply) => {
		const { includeDeleted = false, includeInactive = false } = req.query as GetCurrenciesQueryType
		let sql = `${currencySelectSql}`

		if (includeDeleted) {
			sql += `
				WHERE 1 = 1`
		} else {
			sql += `
				WHERE deleted_at IS NULL`
		}

		if (!includeInactive) {
			sql += `
				AND is_active = true`
		}

		sql += `
			ORDER BY code ASC`

		const payload = await db.query(sql)

		return validatedResponse(res, 200, CurrencyListSchema, payload.rows)
	}

	const createCurrency = async (req: FastifyRequest, res: FastifyReply) => {
		const { code, name, symbol, decimalPlaces } = req.body as CreateCurrencyType

		try {
			await db.query(
				`INSERT INTO currencies (
					code,
					name,
					symbol,
					decimal_places
				) VALUES ($1, $2, $3, $4)`,
				[code, name.trim(), symbol.trim(), decimalPlaces],
			)
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Currency code already exists')
			}

			throw error
		}

		return validatedResponse(res, 201, CreateCurrencyResponseSchema, {
			message: 'Currency created successfully',
			code,
		})
	}

	const updateCurrency = async (req: FastifyRequest, res: FastifyReply) => {
		const { code } = req.params as CurrencyCodeParamType
		const { name, symbol, decimalPlaces, isActive } = req.body as UpdateCurrencyType

		const currentCurrency = await getCurrencyByCode(code, true)
		if (!currentCurrency) {
			throw notFoundError('Currency not found')
		}

		const payload = await db.query(
			`UPDATE currencies
			SET name = $2,
				symbol = $3,
				decimal_places = $4,
				is_active = $5,
				deleted_at = CASE
					WHEN $5 = true THEN NULL
					ELSE deleted_at
				END,
				updated_at = NOW()
			WHERE code = $1
			RETURNING
				code,
				name,
				symbol,
				decimal_places as "decimalPlaces",
				is_active as "isActive",
				to_json(created_at) as "createdAt",
				to_json(updated_at) as "updatedAt",
				to_json(deleted_at) as "deletedAt"`,
			[
				code,
				name?.trim() ?? currentCurrency.name,
				symbol?.trim() ?? currentCurrency.symbol,
				decimalPlaces ?? currentCurrency.decimalPlaces,
				isActive ?? currentCurrency.isActive,
			],
		)

		return validatedResponse(res, 200, CurrencySchema, payload.rows[0])
	}

	const deleteCurrency = async (req: FastifyRequest, res: FastifyReply) => {
		const { code } = req.params as CurrencyCodeParamType

		const currentCurrency = await getCurrencyByCode(code)
		if (!currentCurrency) {
			throw notFoundError('Currency not found')
		}

		await db.query(
			`UPDATE currencies
			SET deleted_at = NOW(),
				is_active = false,
				updated_at = NOW()
			WHERE code = $1
				AND deleted_at IS NULL`,
			[code],
		)

		return res.code(200).send({ message: 'Currency deleted successfully' })
	}

	return {
		getCurrencies,
		createCurrency,
		updateCurrency,
		deleteCurrency,
	}
}
