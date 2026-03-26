import type { FastifyInstance } from 'fastify'

import { requireRole } from '../auth/route-validator.ts'
import { buildGroupController } from './controller.ts'
import { buildGroupDocs } from './docs.ts'

import type { AppDependency } from '../../types/app.js'

export async function groupsRoute(app: FastifyInstance, deps: AppDependency) {
	const { getGroups, getGroup, getGroupMembers, createGroup, updateGroup, createGroupVersion, addGroupMember, removeGroupMember, deleteGroup } =
		buildGroupController(deps)
	const {
		getGroupsDocs,
		getGroupDocs,
		getGroupMembersDocs,
		createGroupDocs,
		updateGroupDocs,
		createGroupVersionDocs,
		addGroupMemberDocs,
		removeGroupMemberDocs,
		deleteGroupDocs,
	} = buildGroupDocs()

	app.get('/groups', { schema: getGroupsDocs, preHandler: requireRole('user') }, getGroups)
	app.get('/groups/:id', { schema: getGroupDocs, preHandler: requireRole('user') }, getGroup)
	app.get('/groups/:id/members', { schema: getGroupMembersDocs, preHandler: requireRole('user') }, getGroupMembers)
	app.post('/groups', { schema: createGroupDocs, preHandler: requireRole('user') }, createGroup)
	app.patch('/groups/:id', { schema: updateGroupDocs, preHandler: requireRole('user') }, updateGroup)
	app.post('/groups/:id/version', { schema: createGroupVersionDocs, preHandler: requireRole('user') }, createGroupVersion)
	app.post('/groups/:id/members', { schema: addGroupMemberDocs, preHandler: requireRole('user') }, addGroupMember)
	app.delete('/groups/:id/members/:memberId', { schema: removeGroupMemberDocs, preHandler: requireRole('user') }, removeGroupMember)
	app.delete('/groups/:id', { schema: deleteGroupDocs, preHandler: requireRole('user') }, deleteGroup)
}
