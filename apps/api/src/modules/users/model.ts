import z from 'zod'

export const PasswordSchema = z
	.string()
	.min(8)
	.regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter' })
	.regex(/[a-z]/, { message: 'Must contain at least one lowercase letter' })
	.regex(/[0-9]/, { message: 'Must contain at least one number' })
	.regex(/[^a-zA-Z0-9]/, { message: 'Must contain at least one special character' })

export const UserSchema = z.object({
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

export const PublicUserSchema = UserSchema

export const CreateUserSchema = z.object({
	name: z.string().min(1),
	lastname: z.string().min(1),
	email: z.email(),
	password: PasswordSchema,
})

export const CreateManagedUserSchema = CreateUserSchema.extend({
	role: z.enum(['user', 'admin']).optional().default('user'),
}).omit({
	password: true,
})

export const UpdateOwnUserSchema = z
	.object({
		name: z.string().min(1).optional(),
		lastname: z.string().min(1).optional(),
		email: z.email().optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

export const ResetUserPasswordSchema = z.object({
	password: PasswordSchema,
})

export const GetUsersQuerySchema = z.object({
	includeInactive: z.coerce.boolean().optional().default(false),
})

export const UserIDSchema = z.object({
	id: z.uuid(),
})

export const CreateUserResponseSchema = z.object({
	message: z.string(),
	userID: z.uuid(),
})

export const DeleteUserResponseSchema = z.object({
	message: z.string(),
})

export const ResetUserPasswordResponseSchema = z.object({
	message: z.string(),
})

export const SessionUserSchema = PublicUserSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
})

export const UserListSchema = z.array(PublicUserSchema)

export type Password = z.infer<typeof PasswordSchema>
export type User = z.infer<typeof UserSchema>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type CreateManagedUserInput = z.infer<typeof CreateManagedUserSchema>
export type GetUsersQueryInput = z.infer<typeof GetUsersQuerySchema>
export type UserID = z.infer<typeof UserIDSchema>
export type UpdateOwnUserInput = z.infer<typeof UpdateOwnUserSchema>
export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordSchema>
