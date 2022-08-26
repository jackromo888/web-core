import { useRouter } from 'next/router'
import {
  getIncomingTransfers,
  getModuleTransactions,
  getMultisigTransactions,
  type TransactionListPage,
} from '@gnosis.pm/safe-react-gateway-sdk'
import type { operations } from '@gnosis.pm/safe-react-gateway-sdk/dist/types/api'
import type { ParsedUrlQuery } from 'querystring'

import { TxFilterFormState } from '@/components/transactions/TxFilterForm'
import { useMemo } from 'react'

export type IncomingTxFilter = NonNullable<operations['incoming_transfers']['parameters']['query']>
export type MultisigTxFilter = NonNullable<operations['multisig_transactions']['parameters']['query']>
export type ModuleTxFilter = NonNullable<operations['module_transactions']['parameters']['query']>

export enum TxFilterType {
  INCOMING = 'Incoming',
  MULTISIG = 'Outgoing',
  MODULE = 'Module-based',
}

export type TxFilter = {
  type: TxFilterType
  filter: IncomingTxFilter | MultisigTxFilter | ModuleTxFilter // CGW filter
}

// Spread TxFilter basically
type TxFilterUrlQuery = {
  type: TxFilter['type']
} & TxFilter['filter']

export const txFilter = {
  parseUrlQuery: (query: ParsedUrlQuery): TxFilter | null => {
    if (!query.type) {
      return null
    }

    return {
      type: query.type as TxFilterType,
      filter: {
        ...(query as TxFilter['filter']),
      }
    }
  },

  parseFormData: (formData: TxFilterFormState): TxFilter => {
    return {
      type: formData.type,
      filter: {
        ...formData,
        execution_date__gte: formData.execution_date__gte?.toISOString() || undefined,
        execution_date__lte: formData.execution_date__lte?.toISOString() || undefined,
        // value: parseValue
      },
    }
  },

  formatUrlQuery: ({ type, filter }: TxFilter): TxFilterUrlQuery => {
    if (!type) {
      throw new Error('URL query contains no transaction filter `type`')
    }

    return {
      type,
      ...filter,
    }
  },

  formatFormData: ({ type, filter }: TxFilter): Partial<TxFilterFormState> => {
    return {
      type: type || TxFilterType.INCOMING,
      ...filter,
      // TODO: add a type guard
      execution_date__gte: ('execution_date__gte' in filter) ? new Date(filter.execution_date__gte) : undefined,
      execution_date__lte: ('execution_date__lte' in filter) ? new Date(filter.execution_date__lte) : undefined,
      // value: formatValue
    }
  },
}

export const useTxFilter = (): [TxFilter | null, (filter: TxFilter | null) => void] => {
  const router = useRouter()
  const filter = useMemo(() => txFilter.parseUrlQuery(router.query), [router.query])

  const setQuery = (filter: TxFilter | null) => {
    router.push({
      pathname: router.pathname,
      query: {
        safe: router.query.safe,
        ...(filter && txFilter.formatUrlQuery(filter)),
      },
    })
  }

  return [filter, setQuery]
}

export const fetchFilteredTxHistory = (
  chainId: string,
  safeAddress: string,
  filterData: TxFilter,
  pageUrl?: string,
): Promise<TransactionListPage> | undefined => {
  switch (filterData.type) {
    case TxFilterType.INCOMING: {
      return getIncomingTransfers(chainId, safeAddress, filterData.filter, pageUrl)
    }
    case TxFilterType.MULTISIG: {
      const filter = {
        ...filterData.filter,
        // We only filter historical transactions
        executed: 'true',
      }

      return getMultisigTransactions(chainId, safeAddress, filter, pageUrl)
    }
    case TxFilterType.MODULE: {
      return getModuleTransactions(chainId, safeAddress, filterData.filter, pageUrl)
    }
  }
}
