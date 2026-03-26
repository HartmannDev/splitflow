import z from 'zod'

const DecimalAmountSchema = z.string().trim().regex(/^-?\d+(\.\d{1,6})?$/, {
	message: 'Must be a valid decimal amount with up to 6 decimal places',
})

const CurrencyCodeSchema = z.string().trim().length(3).transform((value) => value.toUpperCase())

const AccountSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	currencyCode: z.string().length(3),
	name: z.string(),
	icon: z.string(),
	color: z.string(),
	initialValue: DecimalAmountSchema,
	isArchived: z.boolean(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const AccountIdSchema = AccountSchema.pick({ id: true })

const CreateAccountSchema = z.object({
	currencyCode: CurrencyCodeSchema,
	name: z.string().trim().min(1),
	icon: z.string().trim().min(1),
	color: z.string().trim().min(1),
	initialValue: DecimalAmountSchema,
})

const UpdateAccountSchema = z
	.object({
		currencyCode: CurrencyCodeSchema.optional(),
		name: z.string().trim().min(1).optional(),
		icon: z.string().trim().min(1).optional(),
		color: z.string().trim().min(1).optional(),
		initialValue: DecimalAmountSchema.optional(),
		isArchived: z.boolean().optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetAccountsQuerySchema = z.object({
	includeArchived: z.coerce.boolean().optional().default(false),
})

const AccountListSchema = z.array(AccountSchema)

const CreateAccountResponseSchema = z.object({
	message: z.string(),
	accountId: z.uuid(),
})

export const AccountSchemas = () => {
	return {
		DecimalAmountSchema,
		CurrencyCodeSchema,
		AccountSchema,
		AccountIdSchema,
		CreateAccountSchema,
		UpdateAccountSchema,
		GetAccountsQuerySchema,
		AccountListSchema,
		CreateAccountResponseSchema,
	}
}

export type AccountType = z.infer<typeof AccountSchema>
export type AccountIdType = z.infer<typeof AccountIdSchema>
export type CreateAccountType = z.infer<typeof CreateAccountSchema>
export type UpdateAccountType = z.infer<typeof UpdateAccountSchema>
export type GetAccountsQueryType = z.infer<typeof GetAccountsQuerySchema>
