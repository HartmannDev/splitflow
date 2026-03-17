import z from 'zod'

export const transactionSchema = z.object({
	transactionID: z.string(),
	amount: z.number(),
	currency: z.string(),
	date: z.string(),
})

export const CreateTransactionSchema = transactionSchema.omit({ transactionID: true })
export const TransactionListSchema = z.array(transactionSchema)

export type Transaction = z.infer<typeof transactionSchema>
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
