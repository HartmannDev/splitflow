import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { CategorySchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type {
	CategoryIdType,
	CategoryTypeModel,
	CreateCategoryType,
	GetCategoriesQueryType,
	UpdateCategoryType,
} from './model.ts'

const categorySelectSql = `SELECT
			id,
			user_id as "userId",
			type,
			name,
			icon,
			color,
			is_default as "isDefault",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM categories`

export const buildCategoryController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, conflictError, notFoundError, forbiddenError, isDatabaseError } = AppError()
	const { CategoryListSchema, CategorySchema, CreateCategoryResponseSchema } = CategorySchemas()

	const getAccessibleCategoryById = async (categoryId: string, sessionUser: NonNullable<FastifyRequest['session']['user']>) => {
		const isAdmin = sessionUser.role === 'admin'
		const payload = await db.query(
			`${categorySelectSql}
			WHERE id = $1
				AND deleted_at IS NULL
				AND (
					(is_default = true AND $2 = true)
					OR (user_id = $3 AND is_default = false)
				)`,
			[categoryId, isAdmin, sessionUser.userId],
		)

		return payload.rows[0] as CategoryTypeModel | undefined
	}

	const getCategories = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { scope = 'all', type } = req.query as GetCategoriesQueryType
		const isAdmin = sessionUser.role === 'admin'

		if (isAdmin && scope === 'personal') {
			throw badRequestError('Admins cannot access personal categories')
		}

		let sql = `${categorySelectSql}
			WHERE deleted_at IS NULL`
		const params: unknown[] = []

		if (isAdmin) {
			sql += `
				AND is_default = true`
		} else if (scope === 'default') {
			sql += `
				AND is_default = true`
		} else if (scope === 'personal') {
			sql += `
				AND user_id = $1
				AND is_default = false`
			params.push(sessionUser.userId)
		} else {
			sql += `
				AND (
					is_default = true
					OR (user_id = $1 AND is_default = false)
				)`
			params.push(sessionUser.userId)
		}

		if (type) {
			sql += `
				AND type = $${params.length + 1}`
			params.push(type)
		}

		sql += `
			ORDER BY is_default DESC, lower(name) ASC, created_at ASC`

		const payload = await db.query(sql, params)

		return validatedResponse(res, 200, CategoryListSchema, payload.rows)
	}

	const createCategory = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { name, type, icon, color, isDefault } = req.body as CreateCategoryType
		const isAdmin = sessionUser.role === 'admin'
		const categoryId = randomUUID()
		const normalizedName = name.trim()
		const normalizedIcon = icon.trim()
		const normalizedColor = color.trim()

		if (isAdmin && isDefault === false) {
			throw forbiddenError('Admins can only create default categories')
		}

		if (!isAdmin && isDefault === true) {
			throw forbiddenError('Users can only create personal categories')
		}

		const nextIsDefault = isAdmin
		const userId = isAdmin ? null : sessionUser.userId

		try {
			await db.query(
				`INSERT INTO categories (
					id,
					user_id,
					type,
					name,
					icon,
					color,
					is_default
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[categoryId, userId, type, normalizedName, normalizedIcon, normalizedColor, nextIsDefault],
			)
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Category name already in use for this type')
			}

			throw error
		}

		return validatedResponse(res, 201, CreateCategoryResponseSchema, {
			message: 'Category created successfully',
			categoryId,
		})
	}

	const updateCategory = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as CategoryIdType
		const { name, type, icon, color } = req.body as UpdateCategoryType

		const currentCategory = await getAccessibleCategoryById(id, sessionUser)
		if (!currentCategory) {
			throw notFoundError('Category not found')
		}

		const nextName = name?.trim() ?? currentCategory.name
		const nextType = type ?? currentCategory.type
		const nextIcon = icon?.trim() ?? currentCategory.icon
		const nextColor = color?.trim() ?? currentCategory.color

		try {
			const payload = await db.query(
				`UPDATE categories
				SET name = $2,
					type = $3,
					icon = $4,
					color = $5,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					user_id as "userId",
					type,
					name,
					icon,
					color,
					is_default as "isDefault",
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[id, nextName, nextType, nextIcon, nextColor],
			)

			return validatedResponse(res, 200, CategorySchema, payload.rows[0])
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Category name already in use for this type')
			}

			throw error
		}
	}

	const deleteCategory = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as CategoryIdType

		const currentCategory = await getAccessibleCategoryById(id, sessionUser)
		if (!currentCategory) {
			throw notFoundError('Category not found')
		}

		await db.query(
			`UPDATE categories
			SET deleted_at = NOW(),
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Category deleted successfully' })
	}

	return {
		getCategories,
		createCategory,
		updateCategory,
		deleteCategory,
	}
}
