import z from 'zod'

import {
	BadRequestErrorResponseSchema,
	InternalServerErrorResponseSchema,
	NotFoundErrorResponseSchema,
	UnauthorizedErrorResponseSchema,
} from '../../common/error-schemas.ts'
import { GroupSchemas } from './model.ts'

import type { FastifyOpenApiSchema } from '../../types/swagger.ts'

export const buildGroupDocs = () => {
	const {
		GroupSchema,
		GroupMemberSchema,
		GroupIdSchema,
		GroupMemberIdSchema,
		GroupListSchema,
		CreateGroupSchema,
		UpdateGroupSchema,
		CreateGroupVersionSchema,
		AddGroupMemberSchema,
		GetGroupsQuerySchema,
		CreateGroupResponseSchema,
	} = GroupSchemas()

	const messageSchema = z.object({ message: z.string() })

	const getGroupsDocs: FastifyOpenApiSchema = {
		description: 'Get the current user groups',
		tags: ['Groups'],
		querystring: GetGroupsQuerySchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: GroupListSchema.describe('Successful response with groups'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getGroupDocs: FastifyOpenApiSchema = {
		description: 'Get one group owned by the current user',
		tags: ['Groups'],
		params: GroupIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: GroupSchema.describe('Successful response with one group'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const getGroupMembersDocs: FastifyOpenApiSchema = {
		description: 'Get members for one owned group',
		tags: ['Groups'],
		params: GroupIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: z.array(GroupMemberSchema).describe('Successful response with group members'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createGroupDocs: FastifyOpenApiSchema = {
		description: 'Create a group for the current user',
		tags: ['Groups'],
		body: CreateGroupSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateGroupResponseSchema.describe('Group created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const updateGroupDocs: FastifyOpenApiSchema = {
		description: 'Update group metadata without changing membership',
		tags: ['Groups'],
		params: GroupIdSchema,
		body: UpdateGroupSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: GroupSchema.describe('Group updated successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const createGroupVersionDocs: FastifyOpenApiSchema = {
		description: 'Create a new group version when membership changes',
		tags: ['Groups'],
		params: GroupIdSchema,
		body: CreateGroupVersionSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateGroupResponseSchema.describe('Group version created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const addGroupMemberDocs: FastifyOpenApiSchema = {
		description: 'Add a contact member by creating a new group version',
		tags: ['Groups'],
		params: GroupIdSchema,
		body: AddGroupMemberSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateGroupResponseSchema.describe('Group version created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const removeGroupMemberDocs: FastifyOpenApiSchema = {
		description: 'Remove a contact member by creating a new group version',
		tags: ['Groups'],
		params: GroupMemberIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			201: CreateGroupResponseSchema.describe('Group version created successfully'),
			400: BadRequestErrorResponseSchema.describe('Bad Request: Invalid input data'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group or member does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	const deleteGroupDocs: FastifyOpenApiSchema = {
		description: 'Soft delete a group owned by the current user',
		tags: ['Groups'],
		params: GroupIdSchema,
		security: [{ cookieAuth: [] }],
		response: {
			200: messageSchema.describe('Group deleted successfully'),
			401: UnauthorizedErrorResponseSchema.describe('Unauthorized: You must be logged in to access this resource'),
			404: NotFoundErrorResponseSchema.describe('Not Found: Group does not exist'),
			500: InternalServerErrorResponseSchema.describe('Internal Server Error: Unexpected error'),
		},
	}

	return {
		getGroupsDocs,
		getGroupDocs,
		getGroupMembersDocs,
		createGroupDocs,
		updateGroupDocs,
		createGroupVersionDocs,
		addGroupMemberDocs,
		removeGroupMemberDocs,
		deleteGroupDocs,
	}
}
