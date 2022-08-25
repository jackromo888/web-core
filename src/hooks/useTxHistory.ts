import {
  getTransactionHistory,
  type SafeIncomingTransfersResponse,
  type SafeModuleTransactionsResponse,
  type SafeMultisigTransactionsResponse,
  type TransactionListPage,
} from '@gnosis.pm/safe-react-gateway-sdk'
import { useRouter } from 'next/router'
import { useAppSelector } from '@/store'
import useAsync from './useAsync'
import { selectTxHistory } from '@/store/txHistorySlice'
import useSafeInfo from './useSafeInfo'
import { getFilteredTxHistory, hasTxFilterQuery } from '@/components/transactions/TxFilterForm/utils'

const useTxHistory = (
  pageUrl?: string,
): {
  page?: TransactionListPage
  error?: string
  loading: boolean
} => {
  const router = useRouter()

  const { safe, safeAddress, safeLoaded } = useSafeInfo()
  const { chainId } = safe

  // If pageUrl is passed, load a new history page from the API
  const [page, error, loading] = useAsync<
    | TransactionListPage
    | SafeIncomingTransfersResponse
    | SafeMultisigTransactionsResponse
    | SafeModuleTransactionsResponse
  >(
    () => {
      if (!pageUrl || !safeLoaded) return

      return hasTxFilterQuery(router.query)
        ? getFilteredTxHistory(chainId, safeAddress, router.query, pageUrl)
        : getTransactionHistory(chainId, safeAddress, pageUrl)
    },
    [chainId, safeAddress, safeLoaded, pageUrl, router.query],
    false,
  )

  // The latest page of the history is always in the store
  const historyState = useAppSelector(selectTxHistory)

  // Return the new page or the stored page
  return pageUrl
    ? {
        page,
        error: error?.message,
        loading: loading,
      }
    : {
        page: historyState.data,
        error: historyState.error,
        loading: historyState.loading,
      }
}

export default useTxHistory
