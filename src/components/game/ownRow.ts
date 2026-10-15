/** Row treatment for the viewer's own entry, shared by every list that shows one. */
export function youRowClass(isMe: boolean): string {
  return isMe ? "bg-primary/15 ring-2 ring-primary shadow-md shadow-primary/20" : "bg-muted/50";
}
