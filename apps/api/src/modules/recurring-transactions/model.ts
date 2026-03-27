import z from 'zod'

const DecimalAmountSchema = z.string().trim().regex(/^\d+(\.\d{1,6})?$/, {
	message: 'Must be a valid positive decimal amount with up to 6 decimal places',
})

const RecurringTypeSchema = z.enum(['income', 'expense'])
const RecurringModeSchema = z.enum(['subscription', 'installment'])
const RecurringFrequencySchema = z.enum([
	'daily',
	'weekly',
	'fortnightly',
	'monthly',
	'quarterly',
	'semiannually',
	'annually',
])

const RecurringTransactionSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	type: RecurringTypeSchema,
	mode: RecurringModeSchema,
	frequency: RecurringFrequencySchema,
	templateDescription: z.string(),
	templateAmount: DecimalAmountSchema,
	templateNotes: z.string().nullable(),
	templateCategoryId: z.uuid().nullable(),
	templateAccountId: z.uuid(),
	startsOn: z.iso.date(),
	nextGenerationDate: z.iso.date(),
	totalOccurrences: z.number().int().positive().nullable(),
	currentVersion: z.number().int().positive(),
	isActive: z.boolean(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const RecurringTransactionIdSchema = z.object({
	id: z.uuid(),
})

const CreateRecurringTransactionSchema = z.object({
	type: RecurringTypeSchema,
	mode: RecurringModeSchema,
	frequency: RecurringFrequencySchema,
	templateDescription: z.string().trim().min(1),
	templateAmount: DecimalAmountSchema,
	templateNotes: z.string().trim().min(1).nullable().optional(),
	templateCategoryId: z.uuid().nullable().optional(),
	templateAccountId: z.uuid(),
	startsOn: z.iso.date(),
	totalOccurrences: z.number().int().positive().nullable().optional(),
})

const UpdateRecurringTransactionSchema = z
	.object({
		type: RecurringTypeSchema.optional(),
		mode: RecurringModeSchema.optional(),
		frequency: RecurringFrequencySchema.optional(),
		templateDescription: z.string().trim().min(1).optional(),
		templateAmount: DecimalAmountSchema.optional(),
		templateNotes: z.string().trim().min(1).nullable().optional(),
		templateCategoryId: z.uuid().nullable().optional(),
		templateAccountId: z.uuid().optional(),
		startsOn: z.iso.date().optional(),
		totalOccurrences: z.number().int().positive().nullable().optional(),
		isActive: z.boolean().optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetRecurringTransactionsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
	includeInactive: z.coerce.boolean().optional().default(false),
})

const GenerateDueRecurringTransactionsSchema = z.object({
	throughDate: z.iso.date().optional(),
})

const RecurringTransactionListSchema = z.array(RecurringTransactionSchema)

const CreateRecurringTransactionResponseSchema = z.object({
	message: z.string(),
	recurringTransactionId: z.uuid(),
})

const GenerateDueRecurringTransactionsResponseSchema = z.object({
	message: z.string(),
	generatedCount: z.number().int().min(0),
	transactionIds: z.array(z.uuid()),
})

export const RecurringTransactionSchemas = () => {
	return {
		DecimalAmountSchema,
		RecurringTypeSchema,
		RecurringModeSchema,
		RecurringFrequencySchema,
		RecurringTransactionSchema,
		RecurringTransactionIdSchema,
		CreateRecurringTransactionSchema,
		UpdateRecurringTransactionSchema,
		GetRecurringTransactionsQuerySchema,
		GenerateDueRecurringTransactionsSchema,
		RecurringTransactionListSchema,
		CreateRecurringTransactionResponseSchema,
		GenerateDueRecurringTransactionsResponseSchema,
	}
}

export type RecurringTransactionType = z.infer<typeof RecurringTransactionSchema>
export type RecurringTransactionIdType = z.infer<typeof RecurringTransactionIdSchema>
export type CreateRecurringTransactionInput = z.infer<typeof CreateRecurringTransactionSchema>
export type UpdateRecurringTransactionInput = z.infer<typeof UpdateRecurringTransactionSchema>
export type GetRecurringTransactionsQueryType = z.infer<typeof GetRecurringTransactionsQuerySchema>
export type GenerateDueRecurringTransactionsInput = z.infer<typeof GenerateDueRecurringTransactionsSchema>
