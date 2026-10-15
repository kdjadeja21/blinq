import type { ReactNode } from "react";

/** Source-agnostic row. Adapters (solo, multiplayer) map their data into this and fill the slots. */
export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  points: number;
  isMe: boolean;
  avatar: ReactNode;
  /** Optional cell before the points, such as a team icon or this level's gain. */
  accessory?: ReactNode;
  /** Optional cell after the points, such as the rank change. */
  trailing?: ReactNode;
  /** Draws a gap marker above the row, for a viewer row that is not contiguous with the list. */
  gapBefore?: boolean;
}
