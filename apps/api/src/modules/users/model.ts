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
	passwordHash: z.string(),
	passwordSalt: z.string(),
	isActive: z.boolean(),
	emailVerifiedAt: z.iso.datetime({ offset: true }).nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

export const PublicUserSchema = UserSchema.omit({
	passwordHash: true,
	passwordSalt: true,
})

export const CreateUserSchema = PublicUserSchema.omit({
	id: true,
	role: true,
	isActive: true,
	emailVerifiedAt: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
}).extend({
	password: PasswordSchema,
})

export const DeleteUserResponseSchema = z.object({
	message: z.string(),
})

export const UserListSchema = z.array(PublicUserSchema)
export const UserIDSchema = UserSchema.pick({ id: true })

export type Password = z.infer<typeof PasswordSchema>
export type User = z.infer<typeof UserSchema>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UserID = z.infer<typeof UserIDSchema>
