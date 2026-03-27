import z from 'zod'

const DecimalAmountSchema = z.string().trim().regex(/^\d+(\.\d{1,6})?$/, {
	message: 'Must be a valid positive decimal amount with up to 6 decimal places',
})

const SharedTransactionTypeSchema = z.enum(['income', 'expense'])
const SharedSplitMethodSchema = z.enum(['equal', 'fixed'])
const SharedTransactionStatusSchema = z.enum(['pending', 'partially_accepted', 'accepted', 'cancelled'])
const ParticipantApprovalStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'superseded'])
const ParticipantPaymentStatusSchema = z.enum(['unpaid', 'marked_paid', 'confirmed_paid'])

const SharedTransactionParticipantSchema = z.object({
	id: z.uuid(),
	participantUserId: z.uuid().nullable(),
	participantContactId: z.uuid().nullable(),
	amount: DecimalAmountSchema,
	approvalStatus: ParticipantApprovalStatusSchema,
	approvalVersion: z.number().int().positive(),
	approvedAt: z.iso.datetime({ offset: true }).nullable(),
	paymentStatus: ParticipantPaymentStatusSchema,
	paymentMarkedAt: z.iso.datetime({ offset: true }).nullable(),
	paymentConfirmedAt: z.iso.datetime({ offset: true }).nullable(),
	userTransactionId: z.uuid().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const SharedTransactionSchema = z.object({
	id: z.uuid(),
	ownerUserId: z.uuid(),
	groupId: z.uuid(),
	type: SharedTransactionTypeSchema,
	totalAmount: DecimalAmountSchema,
	description: z.string(),
	notes: z.string().nullable(),
	transactionDate: z.iso.datetime({ offset: true }),
	splitMethod: SharedSplitMethodSchema,
	status: SharedTransactionStatusSchema,
	currentEditVersion: z.number().int().positive(),
	participants: z.array(SharedTransactionParticipantSchema),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

const ParticipantAmountSchema = z.object({
	groupMemberId: z.uuid(),
	amount: DecimalAmountSchema,
})

const SharedTransactionIdSchema = z.object({
	id: z.uuid(),
})

const SharedTransactionParticipantIdSchema = z.object({
	id: z.uuid(),
	participantId: z.uuid(),
})

const CreateSharedTransactionSchema = z.object({
	groupId: z.uuid(),
	type: SharedTransactionTypeSchema,
	ownerAccountId: z.uuid(),
	ownerCategoryId: z.uuid(),
	totalAmount: DecimalAmountSchema,
	description: z.string().trim().min(1),
	notes: z.string().trim().min(1).nullable().optional(),
	transactionDate: z.iso.datetime({ offset: true }),
	splitMethod: SharedSplitMethodSchema,
	participantAmounts: z.array(ParticipantAmountSchema).optional().default([]),
})

const UpdateSharedTransactionSchema = z
	.object({
		totalAmount: DecimalAmountSchema.optional(),
		description: z.string().trim().min(1).optional(),
		notes: z.string().trim().min(1).nullable().optional(),
		transactionDate: z.iso.datetime({ offset: true }).optional(),
		splitMethod: SharedSplitMethodSchema.optional(),
		participantAmounts: z.array(ParticipantAmountSchema).optional(),
	})
	.refine((value) => Object.values(value).some((entry) => entry !== undefined), {
		message: 'At least one field must be provided',
	})

const GetSharedTransactionsQuerySchema = z.object({
	includeDeleted: z.coerce.boolean().optional().default(false),
	groupId: z.uuid().optional(),
	status: SharedTransactionStatusSchema.optional(),
})

const AcceptSharedTransactionSchema = z.object({
	accountId: z.uuid(),
	categoryId: z.uuid(),
})

const SharedTransactionListSchema = z.array(SharedTransactionSchema)

const CreateSharedTransactionResponseSchema = z.object({
	message: z.string(),
	sharedTransactionId: z.uuid(),
})

export const SharedTransactionSchemas = () => {
	return {
		DecimalAmountSchema,
		SharedTransactionTypeSchema,
		SharedSplitMethodSchema,
		SharedTransactionStatusSchema,
		ParticipantApprovalStatusSchema,
		ParticipantPaymentStatusSchema,
		SharedTransactionParticipantSchema,
		SharedTransactionSchema,
		ParticipantAmountSchema,
		SharedTransactionIdSchema,
		SharedTransactionParticipantIdSchema,
		CreateSharedTransactionSchema,
		UpdateSharedTransactionSchema,
		GetSharedTransactionsQuerySchema,
		AcceptSharedTransactionSchema,
		SharedTransactionListSchema,
		CreateSharedTransactionResponseSchema,
	}
}

export type SharedTransactionType = z.infer<typeof SharedTransactionSchema>
export type SharedTransactionIdType = z.infer<typeof SharedTransactionIdSchema>
export type SharedTransactionParticipantIdType = z.infer<typeof SharedTransactionParticipantIdSchema>
export type SharedTransactionParticipantType = z.infer<typeof SharedTransactionParticipantSchema>
export type CreateSharedTransactionInput = z.infer<typeof CreateSharedTransactionSchema>
export type UpdateSharedTransactionInput = z.infer<typeof UpdateSharedTransactionSchema>
export type GetSharedTransactionsQueryType = z.infer<typeof GetSharedTransactionsQuerySchema>
export type AcceptSharedTransactionInput = z.infer<typeof AcceptSharedTransactionSchema>
