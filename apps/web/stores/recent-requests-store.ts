import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Client-side history of signature requests created from THIS browser, so the Status
 * page can offer "select a previous request" even before hitting the backend. The
 * backend also exposes a DB-backed recent list; this is the quick local memory.
 */
export interface RecentRequest {
  signatureId: string;
  documentName: string | null;
  fileName: string;
  signerName: string;
  status: string;
  createdAt: string;
}

interface RecentRequestsState {
  requests: RecentRequest[];
  add: (r: RecentRequest) => void;
  clear: () => void;
}

export const useRecentRequests = create<RecentRequestsState>()(
  persist(
    (set) => ({
      requests: [],
      add: (r) =>
        set((state) => ({
          requests: [r, ...state.requests.filter((x) => x.signatureId !== r.signatureId)].slice(
            0,
            15,
          ),
        })),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'mango:recent-requests',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
