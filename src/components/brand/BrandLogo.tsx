import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className="flex size-14 items-center justify-center rounded-full bg-primary text-3xl shadow-md"
        aria-hidden
      >
        🧠
      </span>
      <p className="text-5xl font-extrabold tracking-tight text-primary">Blinq</p>
    </div>
  );
}
