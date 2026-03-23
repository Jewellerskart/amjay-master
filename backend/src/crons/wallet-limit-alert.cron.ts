import cron from 'node-cron'
import { WalletModel } from '../module/wallet/model/wallet.schema'
import { ProductModel } from '../module/product/model/product.schema'
import { recalcUsedCredit } from '../module/wallet/service/wallet.service'
import { customLog } from '../utils/common'

const ALERT_THRESHOLD = 1000

export const runWalletLimitAlertCron = () => {
  cron.schedule('30 7 * * *', async () => {
    try {
      // Re-sync usedCredit based on active assignments
      const holders = await ProductModel.distinct('currentHolder.userId', {
        status: { $in: ['ASSIGNED', 'RENTED', 'PURCHASE_PENDING_PAYMENT', 'ACTIVE'] },
        'currentHolder.userId': { $ne: null },
      })

      for (const userId of holders) {
        const activeCount = await ProductModel.countDocuments({
          'currentHolder.userId': userId,
          status: { $in: ['ASSIGNED', 'RENTED', 'PURCHASE_PENDING_PAYMENT', 'ACTIVE'] },
        })
        await recalcUsedCredit(String(userId), activeCount)
      }

      const wallets = await WalletModel.find({
        $expr: {
          $lt: [
            {
              $subtract: [
                { $add: ['$walletBalance', '$creditLimit'] },
                { $ifNull: ['$usedCredit', 0] },
              ],
            },
            ALERT_THRESHOLD,
          ],
        },
      }).select('_id userId walletBalance creditLimit usedCredit')

      if (!wallets.length) return

      customLog({
        event: 'cron.wallet-limit-alert',
        threshold: ALERT_THRESHOLD,
        wallets: wallets.map((wallet) => ({
          walletId: wallet._id.toString(),
          userId: wallet.userId?.toString() || '',
          availableCredit: (wallet.walletBalance || 0) + (wallet.creditLimit || 0) - (wallet.usedCredit || 0),
        })),
      })
    } catch (error: any) {
      customLog({
        event: 'cron.wallet-limit-alert.error',
        error: error?.message || 'Failed to check wallet limits',
      })
    }
  })
}
