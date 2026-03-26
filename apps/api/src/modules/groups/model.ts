import z from 'zod'

const GroupMemberSchema = z.object({
	id: z.uuid(),
	memberUserId: z.uuid().nullable(),
	memberContactId: z.uuid().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const GroupSchema = z.object({
	id: z.uuid(),
	ownerUserId: z.uuid(),
	previousGroupId: z.uuid().nullable(),
	name: z.string(),
	members: z.array(GroupMemberSchema),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const GroupIdSchema = z.object({
	id: z.uuid(),
})

const GroupMemberIdSchema = z.object({
	id: z.uuid(),
	memberId: z.uuid(),
})

const CreateGroupSchema = z.object({
	name: z.string().trim().min(1),
	contactIds: z.array(z.uuid()).default([]),
})

const UpdateGroupSchema = z
	.object({
		name: z.string().trim().min(1),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const CreateGroupVersionSchema = z.object({
	name: z.string().trim().min(1).optional(),
	contactIds: z.array(z.uuid()),
})

const AddGroupMemberSchema = z.object({
	contactId: z.uuid(),
})

const GetGroupsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
})

const GroupListSchema = z.array(GroupSchema)

const CreateGroupResponseSchema = z.object({
	message: z.string(),
	groupId: z.uuid(),
})

export const GroupSchemas = () => {
	return {
		GroupMemberSchema,
		GroupSchema,
		GroupIdSchema,
		GroupMemberIdSchema,
		CreateGroupSchema,
		UpdateGroupSchema,
		CreateGroupVersionSchema,
		AddGroupMemberSchema,
		GetGroupsQuerySchema,
		GroupListSchema,
		CreateGroupResponseSchema,
	}
}

export type GroupType = z.infer<typeof GroupSchema>
export type GroupIdType = z.infer<typeof GroupIdSchema>
export type GroupMemberIdType = z.infer<typeof GroupMemberIdSchema>
export type CreateGroupType = z.infer<typeof CreateGroupSchema>
export type UpdateGroupType = z.infer<typeof UpdateGroupSchema>
export type CreateGroupVersionType = z.infer<typeof CreateGroupVersionSchema>
export type AddGroupMemberType = z.infer<typeof AddGroupMemberSchema>
export type GetGroupsQueryType = z.infer<typeof GetGroupsQuerySchema>
