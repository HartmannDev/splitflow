import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { ContactSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type { ContactIdType, ContactType, CreateContactType, GetContactsQueryType, UpdateContactType } from './model.ts'

const contactSelectSql = `SELECT
			id,
			user_id as "userId",
			name,
			email,
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM contacts`

export const buildContactController = (deps: AppDependency) => {
	const { db } = deps
	const { conflictError, notFoundError, isDatabaseError } = AppError()
	const { ContactListSchema, ContactSchema, CreateContactResponseSchema } = ContactSchemas()

	const getAccessibleContactById = async (contactId: string, userId: string, includeDeleted = false): Promise<ContactType | undefined> => {
		const payload = await db.query(
			`${contactSelectSql}
			WHERE id = $1
				AND user_id = $2
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[contactId, userId],
		)

		return payload.rows[0]
	}

	const getContacts = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false } = req.query as GetContactsQueryType
		const payload = await db.query(
			`${contactSelectSql}
			WHERE user_id = $1
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}
			ORDER BY created_at DESC`,
			[sessionUser.userId],
		)

		return validatedResponse(res, 200, ContactListSchema, payload.rows)
	}

	const createContact = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { name, email } = req.body as CreateContactType
		const contactId = randomUUID()
		const normalizedEmail = email?.toLowerCase() ?? null

		try {
			await db.query(
				`INSERT INTO contacts (
					id,
					user_id,
					name,
					email
				) VALUES ($1, $2, $3, $4)`,
				[contactId, sessionUser.userId, name.trim(), normalizedEmail],
			)
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Contact email already in use')
			}

			throw error
		}

		return validatedResponse(res, 201, CreateContactResponseSchema, {
			message: 'Contact created successfully',
			contactId,
		})
	}

	const updateContact = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as ContactIdType
		const { name, email } = req.body as UpdateContactType

		const currentContact = await getAccessibleContactById(id, sessionUser.userId)
		if (!currentContact) {
			throw notFoundError('Contact not found')
		}

		const nextEmail = email === undefined ? currentContact.email : email?.toLowerCase() ?? null

		try {
			const payload = await db.query(
				`UPDATE contacts
				SET name = $2,
					email = $3,
					updated_at = NOW()
				WHERE id = $1
					AND deleted_at IS NULL
				RETURNING
					id,
					user_id as "userId",
					name,
					email,
					to_json(created_at) as "createdAt",
					to_json(updated_at) as "updatedAt",
					to_json(deleted_at) as "deletedAt"`,
				[id, name?.trim() ?? currentContact.name, nextEmail],
			)

			return validatedResponse(res, 200, ContactSchema, payload.rows[0])
		} catch (error) {
			if (isDatabaseError(error) && error.code === '23505') {
				throw conflictError('Contact email already in use')
			}

			throw error
		}
	}

	const deleteContact = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as ContactIdType

		const currentContact = await getAccessibleContactById(id, sessionUser.userId)
		if (!currentContact) {
			throw notFoundError('Contact not found')
		}

		await db.query(
			`UPDATE contacts
			SET deleted_at = NOW(),
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Contact deleted successfully' })
	}

	return {
		getContacts,
		createContact,
		updateContact,
		deleteContact,
	}
}
