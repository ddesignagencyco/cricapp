import { apiGet } from './api/client';
import { HeadToHead } from '../types/index';
import { getDemoHeadToHead } from '../data/demo';

export async function fetchHeadToHead(
  teamAId: string,
  teamBId: string
): Promise<HeadToHead | null> {
  const data = await apiGet(`/head-to-head/${teamAId}/${teamBId}`);
  if (data && data.payload && data.payload.last_meetings) return data;
  const jitter: Array<[string, string]> = [
    [teamAId, teamBId],
    [teamBId, teamAId],
  ];
  for (const [a, b] of jitter) {
    const demo = getDemoHeadToHead(a, b);
    if (demo) return demo;
  }
  return null;
}