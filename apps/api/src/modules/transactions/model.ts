import z from 'zod'

const DecimalAmountSchema = z.string().trim().regex(/^\d+(\.\d{1,6})?$/, {
	message: 'Must be a valid positive decimal amount with up to 6 decimal places',
})

const TransactionTypeSchema = z.enum(['income', 'expense', 'transfer'])
const LedgerTransactionTypeSchema = z.enum(['income', 'expense'])
const TransactionStatusSchema = z.enum(['pending', 'done', 'cancelled'])
const TransferDirectionSchema = z.enum(['out', 'in'])

const TransactionSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	type: TransactionTypeSchema,
	status: TransactionStatusSchema,
	amount: DecimalAmountSchema,
	description: z.string(),
	notes: z.string().nullable(),
	transactionDate: z.iso.datetime({ offset: true }),
	accountId: z.uuid(),
	categoryId: z.uuid().nullable(),
	tagIds: z.array(z.uuid()),
	recurringTransactionId: z.uuid().nullable(),
	recurringVersion: z.number().int().positive().nullable(),
	transferPairId: z.uuid().nullable(),
	transferDirection: TransferDirectionSchema.nullable(),
	isFromShared: z.boolean(),
	sourceSharedTransactionParticipantId: z.uuid().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const TransactionIdSchema = z.object({
	id: z.uuid(),
})

const CreateTransactionSchema = z.object({
	type: LedgerTransactionTypeSchema,
	status: TransactionStatusSchema.optional().default('done'),
	amount: DecimalAmountSchema,
	description: z.string().trim().min(1),
	notes: z.string().trim().min(1).nullable().optional(),
	transactionDate: z.iso.datetime({ offset: true }),
	accountId: z.uuid(),
	categoryId: z.uuid(),
	tagIds: z.array(z.uuid()).optional().default([]),
})

const UpdateTransactionSchema = z
	.object({
		status: TransactionStatusSchema.optional(),
		amount: DecimalAmountSchema.optional(),
		description: z.string().trim().min(1).optional(),
		notes: z.string().trim().min(1).nullable().optional(),
		transactionDate: z.iso.datetime({ offset: true }).optional(),
		accountId: z.uuid().optional(),
		categoryId: z.uuid().optional(),
		tagIds: z.array(z.uuid()).optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const CreateTransferSchema = z.object({
	status: TransactionStatusSchema.optional().default('done'),
	fromAccountId: z.uuid(),
	toAccountId: z.uuid(),
	fromAmount: DecimalAmountSchema,
	toAmount: DecimalAmountSchema,
	description: z.string().trim().min(1),
	notes: z.string().trim().min(1).nullable().optional(),
	transactionDate: z.iso.datetime({ offset: true }),
	tagIds: z.array(z.uuid()).optional().default([]),
})

const GetTransactionsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
	from: z.iso.datetime({ offset: true }).optional(),
	to: z.iso.datetime({ offset: true }).optional(),
	accountId: z.uuid().optional(),
	type: TransactionTypeSchema.optional(),
	status: TransactionStatusSchema.optional(),
	categoryId: z.uuid().optional(),
	tagId: z.uuid().optional(),
})

const TransactionListSchema = z.array(TransactionSchema)

const CreateTransactionResponseSchema = z.object({
	message: z.string(),
	transactionId: z.uuid(),
})

const CreateTransferResponseSchema = z.object({
	message: z.string(),
	transferPairId: z.uuid(),
	outTransactionId: z.uuid(),
	inTransactionId: z.uuid(),
})

export const TransactionSchemas = () => {
	return {
		DecimalAmountSchema,
		TransactionTypeSchema,
		LedgerTransactionTypeSchema,
		TransactionStatusSchema,
		TransferDirectionSchema,
		TransactionSchema,
		TransactionIdSchema,
		CreateTransactionSchema,
		UpdateTransactionSchema,
		CreateTransferSchema,
		GetTransactionsQuerySchema,
		TransactionListSchema,
		CreateTransactionResponseSchema,
		CreateTransferResponseSchema,
	}
}

export type TransactionType = z.infer<typeof TransactionSchema>
export type TransactionIdType = z.infer<typeof TransactionIdSchema>
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
export type CreateTransferInput = z.infer<typeof CreateTransferSchema>
export type GetTransactionsQueryType = z.infer<typeof GetTransactionsQuerySchema>
