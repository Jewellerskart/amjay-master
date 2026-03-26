export type ProductAssignmentChoice = 'PURCHASE' | 'MEMO' | 'RENT'

export interface ISaleRequest {
  productId: string
  jewelerId: string
  salePrice: number
  choice: ProductAssignmentChoice
  invoiceId?: string
}
