export function RoomLoading() {
  return (
    <main className="flex flex-1 items-center justify-center p-4" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <p className="animate-bounce text-6xl" aria-hidden>
          🧠
        </p>
        <p className="text-sm font-semibold text-muted-foreground" role="status">
          Loading room...
        </p>
      </div>
    </main>
  );
}
