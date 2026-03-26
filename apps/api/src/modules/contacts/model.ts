import z from 'zod'

const ContactSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	name: z.string(),
	email: z.email().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const ContactIdSchema = ContactSchema.pick({ id: true })

const CreateContactSchema = z.object({
	name: z.string().trim().min(1),
	email: z.email().optional(),
})

const UpdateContactSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		email: z.email().nullable().optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetContactsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
})

const ContactListSchema = z.array(ContactSchema)

const CreateContactResponseSchema = z.object({
	message: z.string(),
	contactId: z.uuid(),
})

export const ContactSchemas = () => {
	return {
		ContactSchema,
		ContactIdSchema,
		CreateContactSchema,
		UpdateContactSchema,
		GetContactsQuerySchema,
		ContactListSchema,
		CreateContactResponseSchema,
	}
}

export type ContactType = z.infer<typeof ContactSchema>
export type ContactIdType = z.infer<typeof ContactIdSchema>
export type CreateContactType = z.infer<typeof CreateContactSchema>
export type UpdateContactType = z.infer<typeof UpdateContactSchema>
export type GetContactsQueryType = z.infer<typeof GetContactsQuerySchema>
