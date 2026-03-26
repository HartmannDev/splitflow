import { randomUUID } from 'node:crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import { AppError } from '../../common/errors.ts'
import { validatedResponse } from '../../common/response-validator.ts'
import { GroupSchemas } from './model.ts'

import type { AppDependency } from '../../types/app.js'
import type {
	AddGroupMemberType,
	CreateGroupType,
	CreateGroupVersionType,
	GetGroupsQueryType,
	GroupIdType,
	GroupMemberIdType,
	GroupType,
	UpdateGroupType,
} from './model.ts'

type GroupRow = Omit<GroupType, 'members'>
type GroupMemberRow = GroupType['members'][number]

const groupSelectSql = `SELECT
			id,
			owner_user_id as "ownerUserId",
			previous_group_id as "previousGroupId",
			name,
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM groups`

const groupMemberSelectSql = `SELECT
			id,
			group_id as "groupId",
			member_user_id as "memberUserId",
			member_contact_id as "memberContactId",
			to_json(created_at) as "createdAt",
			to_json(updated_at) as "updatedAt",
			to_json(deleted_at) as "deletedAt"
		FROM group_members`

export const buildGroupController = (deps: AppDependency) => {
	const { db } = deps
	const { badRequestError, notFoundError } = AppError()
	const { GroupListSchema, GroupSchema, CreateGroupResponseSchema } = GroupSchemas()

	const loadGroupMembers = async (groupIds: string[]) => {
		if (groupIds.length === 0) {
			return new Map<string, GroupMemberRow[]>()
		}

		const payload = await db.query(
			`${groupMemberSelectSql}
			WHERE group_id = ANY($1)
				AND deleted_at IS NULL
			ORDER BY created_at ASC`,
			[groupIds],
		)

		const membersByGroup = new Map<string, GroupMemberRow[]>()

		for (const row of payload.rows as Array<GroupMemberRow & { groupId: string }>) {
			const members = membersByGroup.get(row.groupId) ?? []
			members.push({
				id: row.id,
				memberUserId: row.memberUserId,
				memberContactId: row.memberContactId,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				deletedAt: row.deletedAt,
			})
			membersByGroup.set(row.groupId, members)
		}

		return membersByGroup
	}

	const hydrateGroups = async (rows: GroupRow[]) => {
		const membersByGroup = await loadGroupMembers(rows.map((row) => row.id))

		return rows.map((row) => ({
			...row,
			members: membersByGroup.get(row.id) ?? [],
		}))
	}

	const getAccessibleGroupById = async (groupId: string, userId: string, includeDeleted = false) => {
		const payload = await db.query(
			`${groupSelectSql}
			WHERE id = $1
				AND owner_user_id = $2
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
			[groupId, userId],
		)

		const groupRow = payload.rows[0] as GroupRow | undefined
		if (!groupRow) {
			return undefined
		}

		const [group] = await hydrateGroups([groupRow])
		return group
	}

	const ensureContactsBelongToUser = async (contactIds: string[], userId: string) => {
		const uniqueContactIds = [...new Set(contactIds)]

		if (uniqueContactIds.length !== contactIds.length) {
			throw badRequestError('Contact IDs must be unique')
		}

		if (uniqueContactIds.length === 0) {
			return uniqueContactIds
		}

		const payload = await db.query(
			`SELECT id
			FROM contacts
			WHERE user_id = $1
				AND deleted_at IS NULL
				AND id = ANY($2)`,
			[userId, uniqueContactIds],
		)

		if (payload.rowCount !== uniqueContactIds.length) {
			throw badRequestError('All contacts must belong to the current user')
		}

		return uniqueContactIds
	}

	const createGroupWithMembers = async (
		ownerUserId: string,
		name: string,
		contactIds: string[],
		previousGroupId: string | null,
	) => {
		const groupId = randomUUID()

		await db.transaction(async (tx) => {
			await tx.query(
				`INSERT INTO groups (
					id,
					owner_user_id,
					previous_group_id,
					name
				) VALUES ($1, $2, $3, $4)`,
				[groupId, ownerUserId, previousGroupId, name.trim()],
			)

			await tx.query(
				`INSERT INTO group_members (
					id,
					group_id,
					member_user_id,
					member_contact_id
				) VALUES ($1, $2, $3, $4)`,
				[randomUUID(), groupId, ownerUserId, null],
			)

			for (const contactId of contactIds) {
				await tx.query(
					`INSERT INTO group_members (
						id,
						group_id,
						member_user_id,
						member_contact_id
					) VALUES ($1, $2, $3, $4)`,
					[randomUUID(), groupId, null, contactId],
				)
			}
		})

		return groupId
	}

	const getGroups = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { includeDeleted = false } = req.query as GetGroupsQueryType
		const payload = await db.query(
			`${groupSelectSql}
			WHERE owner_user_id = $1
				${includeDeleted ? '' : 'AND deleted_at IS NULL'}
			ORDER BY created_at DESC`,
			[sessionUser.userId],
		)

		const groups = await hydrateGroups(payload.rows as GroupRow[])
		return validatedResponse(res, 200, GroupListSchema, groups)
	}

	const getGroup = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as GroupIdType
		const group = await getAccessibleGroupById(id, sessionUser.userId)

		if (!group) {
			throw notFoundError('Group not found')
		}

		return validatedResponse(res, 200, GroupSchema, group)
	}

	const getGroupMembers = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as GroupIdType
		const group = await getAccessibleGroupById(id, sessionUser.userId)

		if (!group) {
			throw notFoundError('Group not found')
		}

		return res.code(200).send(group.members)
	}

	const createGroup = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { name, contactIds } = req.body as CreateGroupType
		const normalizedContactIds = await ensureContactsBelongToUser(contactIds, sessionUser.userId)
		const groupId = await createGroupWithMembers(sessionUser.userId, name, normalizedContactIds, null)

		return validatedResponse(res, 201, CreateGroupResponseSchema, {
			message: 'Group created successfully',
			groupId,
		})
	}

	const updateGroup = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as GroupIdType
		const { name } = req.body as UpdateGroupType

		const currentGroup = await getAccessibleGroupById(id, sessionUser.userId)
		if (!currentGroup) {
			throw notFoundError('Group not found')
		}

		const payload = await db.query(
			`UPDATE groups
			SET name = $2,
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL
			RETURNING
				id,
				owner_user_id as "ownerUserId",
				previous_group_id as "previousGroupId",
				name,
				to_json(created_at) as "createdAt",
				to_json(updated_at) as "updatedAt",
				to_json(deleted_at) as "deletedAt"`,
			[id, name.trim()],
		)

		const [group] = await hydrateGroups(payload.rows as GroupRow[])
		return validatedResponse(res, 200, GroupSchema, group)
	}

	const createGroupVersion = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as GroupIdType
		const { name, contactIds } = req.body as CreateGroupVersionType

		const currentGroup = await getAccessibleGroupById(id, sessionUser.userId)
		if (!currentGroup) {
			throw notFoundError('Group not found')
		}

		const normalizedContactIds = await ensureContactsBelongToUser(contactIds, sessionUser.userId)
		const nextName = name?.trim() ?? currentGroup.name
		const groupId = await createGroupWithMembers(sessionUser.userId, nextName, normalizedContactIds, currentGroup.id)

		return validatedResponse(res, 201, CreateGroupResponseSchema, {
			message: 'Group version created successfully',
			groupId,
		})
	}

	const addGroupMember = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as GroupIdType
		const { contactId } = req.body as AddGroupMemberType

		const currentGroup = await getAccessibleGroupById(id, sessionUser.userId)
		if (!currentGroup) {
			throw notFoundError('Group not found')
		}

		const currentContactIds = currentGroup.members
			.filter((member) => member.memberContactId !== null)
			.map((member) => member.memberContactId!)

		if (currentContactIds.includes(contactId)) {
			throw badRequestError('Contact is already a group member')
		}

		const normalizedContactIds = await ensureContactsBelongToUser([...currentContactIds, contactId], sessionUser.userId)
		const groupId = await createGroupWithMembers(
			sessionUser.userId,
			currentGroup.name,
			normalizedContactIds,
			currentGroup.id,
		)

		return validatedResponse(res, 201, CreateGroupResponseSchema, {
			message: 'Group version created successfully',
			groupId,
		})
	}

	const removeGroupMember = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id, memberId } = req.params as GroupMemberIdType

		const currentGroup = await getAccessibleGroupById(id, sessionUser.userId)
		if (!currentGroup) {
			throw notFoundError('Group not found')
		}

		const targetMember = currentGroup.members.find((member) => member.id === memberId)
		if (!targetMember) {
			throw notFoundError('Group member not found')
		}

		if (targetMember.memberUserId === sessionUser.userId) {
			throw badRequestError('Owner membership cannot be removed')
		}

		if (targetMember.memberContactId === null) {
			throw badRequestError('Only contact members can be removed')
		}

		const nextContactIds = currentGroup.members
			.filter((member) => member.memberContactId !== null && member.id !== memberId)
			.map((member) => member.memberContactId!)

		const groupId = await createGroupWithMembers(sessionUser.userId, currentGroup.name, nextContactIds, currentGroup.id)

		return validatedResponse(res, 201, CreateGroupResponseSchema, {
			message: 'Group version created successfully',
			groupId,
		})
	}

	const deleteGroup = async (req: FastifyRequest, res: FastifyReply) => {
		const sessionUser = req.session.user!
		const { id } = req.params as GroupIdType

		const currentGroup = await getAccessibleGroupById(id, sessionUser.userId)
		if (!currentGroup) {
			throw notFoundError('Group not found')
		}

		await db.query(
			`UPDATE groups
			SET deleted_at = NOW(),
				updated_at = NOW()
			WHERE id = $1
				AND deleted_at IS NULL`,
			[id],
		)

		return res.code(200).send({ message: 'Group deleted successfully' })
	}

	return {
		getGroups,
		getGroup,
		getGroupMembers,
		createGroup,
		updateGroup,
		createGroupVersion,
		addGroupMember,
		removeGroupMember,
		deleteGroup,
	}
}
