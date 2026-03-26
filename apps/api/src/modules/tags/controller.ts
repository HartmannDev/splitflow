import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { TagSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type { CreateTagType, GetTagsQueryType, TagIdType, TagType, UpdateTagType } from './model.ts'

const tagSelectSql = `SELECT
			id,
			user_id as "userId",
			name,
			color,
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM tags`

export const buildTagController = (deps: AppDependency) => {
	const { db } = deps
	const { conflictError, notFoundError, isDatabaseError } = AppError()
	const { TagListSchema, TagSchema, CreateTagResponseSchema } = TagSchemas()

	const getAccessibleTagById = async (tagId: string, userId: string, includeDeleted = false): Promise<TagType | undefined> => {
		const payload = await db.query(
			`${tagSelectSql}
			WHERE id = $1
				AND user_id = $2
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[tagId, userId],
		)

		return payload.rows[0]
	}

	const getTags = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false } = req.query as GetTagsQueryType
		const payload = await db.query(
			`${tagSelectSql}
			WHERE user_id = $1
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}
			ORDER BY created_at DESC`,
			[sessionUser.userId],
		)

		return validatedResponse(res, 200, TagListSchema, payload.rows)
	}

	const createTag = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { name, color } = req.body as CreateTagType
		const tagId = randomUUID()

		try {
			await db.query(
				`INSERT INTO tags (
					id,
					user_id,
					name,
					color
				) VALUES ($1, $2, $3, $4)`,
				[tagId, sessionUser.userId, name.trim(), color.trim()],
			)
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Tag name already in use')
			}

			throw error
		}

		return validatedResponse(res, 201, CreateTagResponseSchema, {
			message: 'Tag created successfully',
			tagId,
		})
	}

	const updateTag = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as TagIdType
		const { name, color } = req.body as UpdateTagType

		const currentTag = await getAccessibleTagById(id, sessionUser.userId)
		if (!currentTag) {
			throw notFoundError('Tag not found')
		}

		try {
			const payload = await db.query(
				`UPDATE tags
				SET name = $2,
					color = $3,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					user_id as "userId",
					name,
					color,
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[id, name?.trim() ?? currentTag.name, color?.trim() ?? currentTag.color],
			)

			return validatedResponse(res, 200, TagSchema, payload.rows[0])
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Tag name already in use')
			}

			throw error
		}
	}

	const deleteTag = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as TagIdType

		const currentTag = await getAccessibleTagById(id, sessionUser.userId)
		if (!currentTag) {
			throw notFoundError('Tag not found')
		}

		await db.query(
			`UPDATE tags
			SET deleted_at = NOW(),
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Tag deleted successfully' })
	}

	return {
		getTags,
		createTag,
		updateTag,
		deleteTag,
	}
}
