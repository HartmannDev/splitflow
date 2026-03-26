import z from 'zod'

const TagSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	name: z.string(),
	color: z.string(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const TagIdSchema = z.object({
	id: z.uuid(),
})

const CreateTagSchema = z.object({
	name: z.string().trim().min(1),
	color: z.string().trim().min(1),
})

const UpdateTagSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		color: z.string().trim().min(1).optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetTagsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
})

const TagListSchema = z.array(TagSchema)

const CreateTagResponseSchema = z.object({
	message: z.string(),
	tagId: z.uuid(),
})

export const TagSchemas = () => {
	return {
		TagSchema,
		TagIdSchema,
		CreateTagSchema,
		UpdateTagSchema,
		GetTagsQuerySchema,
		TagListSchema,
		CreateTagResponseSchema,
	}
}

export type TagType = z.infer<typeof TagSchema>
export type TagIdType = z.infer<typeof TagIdSchema>
export type CreateTagType = z.infer<typeof CreateTagSchema>
export type UpdateTagType = z.infer<typeof UpdateTagSchema>
export type GetTagsQueryType = z.infer<typeof GetTagsQuerySchema>
