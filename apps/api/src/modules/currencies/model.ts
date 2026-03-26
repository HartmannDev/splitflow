import z from 'zod'

const CurrencyCodeSchema = z.string().trim().length(3).regex(/^[A-Za-z]{3}$/, {
	message: 'Currency code must contain exactly 3 letters',
})

const CurrencySchema = z.object({
	code: z.string().length(3),
	name: z.string(),
	symbol: z.string(),
	decimalPlaces: z.int().min(0).max(6),
	isActive: z.boolean(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const CurrencyCodeParamSchema = z.object({
	code: CurrencyCodeSchema.transform((value) => value.toUpperCase()),
})

const CreateCurrencySchema = z.object({
	code: CurrencyCodeSchema.transform((value) => value.toUpperCase()),
	name: z.string().trim().min(1),
	symbol: z.string().trim().min(1),
	decimalPlaces: z.int().min(0).max(6),
})

const UpdateCurrencySchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		symbol: z.string().trim().min(1).optional(),
		decimalPlaces: z.int().min(0).max(6).optional(),
		isActive: z.boolean().optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetCurrenciesQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
	includeInactive: z.coerce.boolean().optional().default(false),
})

const CurrencyListSchema = z.array(CurrencySchema)

const CreateCurrencyResponseSchema = z.object({
	message: z.string(),
	code: z.string().length(3),
})

export const CurrencySchemas = () => {
	return {
		CurrencyCodeSchema,
		CurrencySchema,
		CurrencyCodeParamSchema,
		CreateCurrencySchema,
		UpdateCurrencySchema,
		GetCurrenciesQuerySchema,
		CurrencyListSchema,
		CreateCurrencyResponseSchema,
	}
}

export type CurrencyType = z.infer<typeof CurrencySchema>
export type CurrencyCodeParamType = z.infer<typeof CurrencyCodeParamSchema>
export type CreateCurrencyType = z.infer<typeof CreateCurrencySchema>
export type UpdateCurrencyType = z.infer<typeof UpdateCurrencySchema>
export type GetCurrenciesQueryType = z.infer<typeof GetCurrenciesQuerySchema>
