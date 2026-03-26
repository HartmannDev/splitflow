import z from 'zod'

const CategoryTypeSchema = z.enum(['income', 'expense'])

const CategoryScopeSchema = z.enum(['all', 'default', 'personal'])

const CategorySchema = z.object({
	id: z.uuid(),
	userId: z.uuid().nullable(),
	type: CategoryTypeSchema,
	name: z.string(),
	icon: z.string(),
	color: z.string(),
	isDefault: z.boolean(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const CategoryIdSchema = CategorySchema.pick({ id: true })

const CreateCategorySchema = z.object({
	type: CategoryTypeSchema,
	name: z.string().trim().min(1),
	icon: z.string().trim().min(1),
	color: z.string().trim().min(1),
	isDefault: z.boolean().optional(),
})

const UpdateCategorySchema = z
	.object({
		type: CategoryTypeSchema.optional(),
		name: z.string().trim().min(1).optional(),
		icon: z.string().trim().min(1).optional(),
		color: z.string().trim().min(1).optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetCategoriesQuerySchema = z.object({
	type: CategoryTypeSchema.optional(),
	scope: CategoryScopeSchema.optional().default('all'),
})

const CategoryListSchema = z.array(CategorySchema)

const CreateCategoryResponseSchema = z.object({
	message: z.string(),
	categoryId: z.uuid(),
})

export const CategorySchemas = () => {
	return {
		CategoryTypeSchema,
		CategoryScopeSchema,
		CategorySchema,
		CategoryIdSchema,
		CreateCategorySchema,
		UpdateCategorySchema,
		GetCategoriesQuerySchema,
		CategoryListSchema,
		CreateCategoryResponseSchema,
	}
}

export type CategoryType = z.infer<typeof CategoryTypeSchema>
export type CategoryScopeType = z.infer<typeof CategoryScopeSchema>
export type CategoryTypeModel = z.infer<typeof CategorySchema>
export type CategoryIdType = z.infer<typeof CategoryIdSchema>
export type CreateCategoryType = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryType = z.infer<typeof UpdateCategorySchema>
export type GetCategoriesQueryType = z.infer<typeof GetCategoriesQuerySchema>
