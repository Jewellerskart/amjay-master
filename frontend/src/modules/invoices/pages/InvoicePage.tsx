import { useEffect, useMemo } from 'react'
import { Header } from '@common/header'
import { useAuthSellerLogin } from '@hooks/sellerAuth'
import { useListInvoicesMutation } from '@api/apiHooks/invoice'
import { IndNumberFormat } from '@utils/formateDate'

export const InvoicePage = () => {
  const { data: user, isLoading: isUserLoading } = useAuthSellerLogin()
  const [listInvoices, { data, isLoading }] = useListInvoicesMutation()

  useEffect(() => {
    if (!user?.email) return
    listInvoices({ page: 1, limit: 200, userEmail: user.email })
  }, [user?.email])

  const invoices = useMemo(() => data?.data?.data || [], [data])
  const totalAmount = useMemo(
    () => data?.data?.totalAmount ?? invoices.reduce((sum: number, inv: any) => sum + Number(inv?.amount || 0), 0),
    [data, invoices]
  )

  return (
    <div className="content-body">
      <Header />
      <div className="container-fluid">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4 className="card-title mb-0">My Invoices</h4>
            <span className="badge bg-light text-dark">Total: ₹{IndNumberFormat(totalAmount || 0)}</span>
          </div>
          <div className="card-body">
            {isUserLoading || isLoading ? (
              <p className="text-muted mb-0">Loading invoices…</p>
            ) : invoices.length === 0 ? (
              <p className="text-muted mb-0">No invoices found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Invoice</th>
                      <th>Product</th>
                      <th>Style</th>
                      <th>Category</th>
                      <th>Qty</th>
                      <th>Live Rate</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any) => {
                      const productInfo = inv.product || inv.productSnapshot || {}
                      const productMeta = productInfo.product || productInfo
                      const qty = productMeta?.qty ?? productMeta?.product?.qty ?? 1
                      const imageUrl = productInfo.image || productMeta?.image || ''
                      return (
                        <tr key={inv._id}>
                          <td style={{ width: 64 }}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={productMeta?.jewelCode || 'product'}
                                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  background: '#f2f2f2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#999',
                                  fontSize: 10,
                                }}
                              >
                                No image
                              </div>
                            )}
                          </td>
                          <td>{inv._id}</td>
                          <td>{productMeta?.jewelCode || inv.productId}</td>
                          <td>{productMeta?.styleCode || '-'}</td>
                          <td>{productMeta?.categoryName || productMeta?.category || '-'}</td>
                          <td>{qty}</td>
                          <td>₹{IndNumberFormat(Number(inv.liveRateAtCreation ?? inv.amount ?? 0))}</td>
                          <td>₹{IndNumberFormat(Number(inv.amount || 0))}</td>
                          <td>{inv.status}</td>
                          <td>{inv.type}</td>
                          <td>{inv.createdAt ? new Date(inv.createdAt).toLocaleString() : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={7}>Total</th>
                      <th>₹{IndNumberFormat(totalAmount || 0)}</th>
                      <th colSpan={3}></th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
