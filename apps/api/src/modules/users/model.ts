import z from 'zod'

const PasswordSchema = z
	.string()
	.min(8)
	.regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter' })
	.regex(/[a-z]/, { message: 'Must contain at least one lowercase letter' })
	.regex(/[0-9]/, { message: 'Must contain at least one number' })
	.regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character' })

const UserSchema = z.object({
	id: z.uuid(),
	role: z.enum(['user', 'admin']),
	name: z.string(),
	lastname: z.string(),
	email: z.email(),
	isActive: z.boolean(),
	emailVerifiedAt: z.iso.datetime({ offset: true }).nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const CreateUserSchema = UserSchema.pick({
	name: true,
	lastname: true,
	email: true,
}).extend({
	password: PasswordSchema,
})

const CreateManagedUserSchema = UserSchema.pick({
	name: true,
	lastname: true,
	email: true,
	role: true,
})

const UpdateOwnUserSchema = UserSchema.pick({
	name: true,
	lastname: true,
	email: true,
})
	.partial()
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const UpdateManagedUserSchema = UserSchema.pick({
	role: true,
	isActive: true,
})
	.partial()
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const CreateUserResponseSchema = z.object({
	message: z.string(),
	userID: z.uuid(),
})

const GetUsersQuerySchema = z.object({
	includeInactive: z.coerce.boolean().optional().default(false),
})

const UserIdSchema = UserSchema.pick({ id: true })

const UserListSchema = z.array(UserSchema)

export const UserSchemas = () => {
	return {
		PasswordSchema,
		UserSchema,
		CreateUserSchema,
		CreateManagedUserSchema,
		UpdateOwnUserSchema,
		UpdateManagedUserSchema,
		GetUsersQuerySchema,
		UserIdSchema,
		UserListSchema,
		CreateUserResponseSchema,
	}
}

export type UserType = z.infer<typeof UserSchema>
export type UserIdType = z.infer<typeof UserIdSchema>
export type UpdateManagedUserType = z.infer<typeof UpdateManagedUserSchema>
export type CreateManagedUserType = z.infer<typeof CreateManagedUserSchema>
export type UpdateOwnUserType = z.infer<typeof UpdateOwnUserSchema>
export type GetUsersQueryType = z.infer<typeof GetUsersQuerySchema>
export type CreateUserType = z.infer<typeof CreateUserSchema>
export type PasswordType = z.infer<typeof PasswordSchema>
