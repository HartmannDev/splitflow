import z from 'zod'

import { UserSchemas } from '../users/model.ts'

export const TokenSchema = z.string().length(64)
export const LoginSchema = UserSchemas().CreateUserSchema.pick({ password: true, email: true })
export const EmailSchema = LoginSchema.pick({ email: true })
export const PasswordSchema = LoginSchema.pick({ password: true })

export const ResetPasswordSchema = PasswordSchema.extend({
	token: TokenSchema,
})

export type LoginType = z.infer<typeof LoginSchema>
export type EmailType = z.infer<typeof EmailSchema>
export type TokenType = z.infer<typeof TokenSchema>
export type ResetPasswordType = z.infer<typeof ResetPasswordSchema>
