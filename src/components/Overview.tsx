import { TokenList } from '@/components/TokenList';
import { VaultDisplayer } from '@/components/VaultDisplayer';
import { useMultisigData } from '@/hooks/useMultisigData';
import { ChangeMultisig } from '@/components/ChangeMultisig';
import { ActionNeeded, RecentActivity } from '@/components/SquadActivity';
import { ProgramsHealth } from '@/components/ProgramsHealth';

export default function Overview() {
  const { multisigAddress } = useMultisigData();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Overview</h1>
      {multisigAddress && (
        <div className="flex flex-col gap-4">
          <ActionNeeded />
          <div className="grid gap-4 lg:grid-cols-3">
            <VaultDisplayer />
            <ProgramsHealth />
            <RecentActivity />
          </div>
          <TokenList multisigPda={multisigAddress} />
          <div className="lg:max-w-md">
            <ChangeMultisig />
          </div>
        </div>
      )}
    </div>
  );
}
