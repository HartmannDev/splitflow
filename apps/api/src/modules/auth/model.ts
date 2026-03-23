import z from 'zod'
import { CreateUserSchema } from '../users/model.ts'

export const LoginSchema = CreateUserSchema.pick({
	email: true,
	password: true,
})

export type LoginInput = z.infer<typeof LoginSchema>
