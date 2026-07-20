'use client';
import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useMultisigData } from '~/hooks/useMultisigData';

// Optional deployment: when the host serves /verified-hashes.json (a map of
// program id -> release .so hashes, produced by the operator's CI tooling),
// this tile shows which release each program is currently running, verified
// by hashing the on-chain program data. Without the file the tile hides.

const LOADER = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

type VerifiedHashes = {
  programs: Record<
    string,
    { repo: string; asset: string; releases: Array<{ tag: string; sha256: string }> }
  >;
};

function readU32LE(d: Uint8Array, o: number): number {
  return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0;
}

async function strippedSha256(bytes: Uint8Array): Promise<string> {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice(0, end));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type ProgramRow = { name: string; tag: string | null };

export function ProgramsHealth() {
  const { connection } = useMultisigData();

  const { data } = useQuery({
    queryKey: ['programsHealth'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<ProgramRow[] | null> => {
      const verified = await fetch('/verified-hashes.json')
        .then((r): Promise<VerifiedHashes | null> => (r.ok ? r.json() : Promise.resolve(null)))
        .catch(() => null);
      if (!verified || Object.keys(verified.programs).length === 0) return null;

      const rows: ProgramRow[] = [];
      for (const [programId, entry] of Object.entries(verified.programs)) {
        const name = entry.asset.replace(/\.so$/, '');
        try {
          const [programData] = PublicKey.findProgramAddressSync(
            [new PublicKey(programId).toBuffer()],
            LOADER
          );
          const info = await connection.getAccountInfo(programData);
          if (!info || info.data.length <= 45 || readU32LE(info.data, 0) !== 3) {
            rows.push({ name, tag: null });
            continue;
          }
          const hash = await strippedSha256(info.data.subarray(45));
          const match = entry.releases.find((r) => r.sha256 === hash);
          rows.push({ name, tag: match?.tag ?? null });
        } catch {
          rows.push({ name, tag: null });
        }
      }
      return rows;
    },
  });

  if (!data) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Programs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {data.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
            >
              <span className="font-mono">{p.name}</span>
              {p.tag ? (
                <span className="font-medium text-green-600 dark:text-green-400">{p.tag} ✓</span>
              ) : (
                <span className="text-muted-foreground">unknown build</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
