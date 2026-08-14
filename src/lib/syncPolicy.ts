export type MergeDecision = 'apply' | 'ignore' | 'conflict';

export function decideRemoteMerge(
  remoteVersion: number,
  localVersion: number | null,
  pendingBaseVersion: number | null
): MergeDecision {
  if (pendingBaseVersion !== null) return remoteVersion > pendingBaseVersion ? 'conflict' : 'ignore';
  if (localVersion === null || remoteVersion > localVersion) return 'apply';
  return 'ignore';
}
