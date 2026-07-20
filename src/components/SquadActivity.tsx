'use client';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useMultisig, useTransactions } from '~/hooks/useServices';
import type { TransactionKind } from '~/hooks/useServices';

// How far back the dashboard looks for open proposals and recent activity.
const LOOKBACK = 10;

const KIND_LABELS: Record<TransactionKind, string> = {
  vault: 'Vault transaction',
  config: 'Config change',
  batch: 'Batch',
  unknown: 'Transaction',
};

type Row = {
  index: bigint;
  kind: TransactionKind;
  status: string;
  approvals: number;
};

function useRecentRows(): { rows: Row[]; threshold: number } {
  const { data: multisigConfig } = useMultisig();
  const totalTransactions = Number(multisigConfig ? multisigConfig.transactionIndex : 0);
  const startIndex = totalTransactions;
  const endIndex = Math.max(startIndex - LOOKBACK + 1, 1);
  const { data: transactions } = useTransactions(startIndex, endIndex);

  const rows = (transactions || []).map((tx) => ({
    index: tx.index,
    kind: tx.kind,
    status: tx.proposal?.status.__kind ?? 'None',
    approvals: tx.proposal?.approved.length ?? 0,
  }));
  return { rows, threshold: Number(multisigConfig?.threshold ?? 0) };
}

const OPEN_STATUSES = ['Active', 'Approved', 'Draft', 'None'];

function statusClasses(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400';
    case 'Approved':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    case 'Executed':
      return 'bg-green-500/15 text-green-600 dark:text-green-400';
    case 'Rejected':
    case 'Cancelled':
      return 'bg-red-500/15 text-red-600 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusClasses(status)}`}
    >
      {status === 'None' ? 'No proposal' : status}
    </span>
  );
}

/** Open proposals that still need signatures or execution, surfaced first. */
export function ActionNeeded() {
  const { rows, threshold } = useRecentRows();
  const open = rows.filter((r) => OPEN_STATUSES.includes(r.status));

  if (open.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nothing is waiting on the squad right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardHeader>
        <CardTitle>
          Needs attention ({open.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {open.map((r) => (
            <div
              key={r.index.toString()}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
            >
              <span className="font-medium">
                #{r.index.toString()} · {KIND_LABELS[r.kind]}
              </span>
              <StatusChip status={r.status} />
              <span className="text-sm text-muted-foreground">
                {r.approvals} of {threshold} approvals
              </span>
              <div className="ml-auto">
                <Button asChild size="sm">
                  <Link to="/transactions">
                    {r.status === 'Approved' ? 'Review & execute' : 'Review & approve'}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Compact feed of the squad's latest transactions with their outcome. */
export function RecentActivity() {
  const { rows } = useRecentRows();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r) => (
              <div
                key={r.index.toString()}
                className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
              >
                <span>
                  #{r.index.toString()} · {KIND_LABELS[r.kind]}
                </span>
                <StatusChip status={r.status} />
              </div>
            ))}
            <div className="pt-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/transactions">View all transactions</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
