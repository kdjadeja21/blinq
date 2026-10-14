"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sword } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const CLASH_TIMES = [0, 0.3, 0.4, 0.55, 1];

export function ClashingSwords({ reduce, compact }: { reduce: boolean; compact?: boolean }) {
  const transition = { duration: 2.2, times: CLASH_TIMES, repeat: Infinity, repeatDelay: 0.8 };
  const travel = compact ? 4 : 8;
  const box = compact ? "size-6" : "size-7";
  const blade = compact ? "size-4" : "size-6";
  const spark = compact ? "size-2" : "size-3";
  return (
    <span aria-hidden className={cn("relative inline-flex items-center justify-center overflow-hidden", box)}>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={{ x: -travel, rotate: -40 }}
        animate={reduce ? undefined : { x: [-travel, -travel, 0, -1, -travel], rotate: [-40, -40, 0, -6, -40] }}
        transition={transition}
      >
        <Sword className={cn(blade, "text-gold drop-shadow-sm")} />
      </motion.span>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={{ x: travel, rotate: 40 }}
        animate={reduce ? undefined : { x: [travel, travel, 0, 1, travel], rotate: [40, 40, 0, 6, 40] }}
        transition={transition}
      >
        <Sword className={cn(blade, "-scale-x-100 text-white drop-shadow-sm")} />
      </motion.span>
      {reduce ? null : (
        <motion.span
          className={cn("absolute rounded-full bg-gold blur-[1px]", spark)}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0, 1, 0, 0], scale: [0.4, 0.4, 1.4, 1.8, 0.4] }}
          transition={transition}
        />
      )}
    </span>
  );
}

const SHELL_PRIMARY =
  "flex !h-auto min-h-16 w-full min-w-0 max-w-full shrink flex-row items-center justify-center overflow-hidden rounded-3xl px-4 py-3 shadow-lg ring-1 ring-black/10";

const SHELL_SECONDARY =
  "flex !h-auto min-h-12 w-full min-w-0 max-w-full shrink flex-row items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-card px-3 py-2.5 shadow-sm hover:bg-muted/60";

const BODY = "flex w-fit max-w-[calc(100%-0.5rem)] min-w-0 flex-row items-center gap-2.5";

const TEXT_COL = "flex min-w-0 flex-col items-start justify-center gap-0.5 text-left";

export type HomeActionTileProps = {
  variant: "primary" | "secondary";
  icon: ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  pulse?: boolean;
};

function TileBody({
  variant,
  icon,
  title,
  subtitle,
}: Pick<HomeActionTileProps, "variant" | "icon" | "title" | "subtitle">) {
  const iconShell =
    variant === "primary"
      ? "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/15 shadow-inner"
      : "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted shadow-inner";

  return (
    <span className={BODY}>
      <span className={iconShell}>{icon}</span>
      <span className={TEXT_COL}>
        <span
          className={cn(
            "max-w-full truncate font-extrabold tracking-tight",
            variant === "primary" ? "text-lg sm:text-xl" : "text-base",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "max-w-full truncate font-semibold tabular-nums",
              variant === "primary" ? "text-sm font-normal text-primary-foreground/90" : "text-xs text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function HomeActionTile({
  variant,
  icon,
  title,
  subtitle,
  href,
  onClick,
  ariaLabel,
  pulse,
}: HomeActionTileProps) {
  const reduce = useReducedMotion();
  const body = <TileBody variant={variant} icon={icon} title={title} subtitle={subtitle} />;

  const shell =
    variant === "primary" ? (
      <Button variant="game" className={SHELL_PRIMARY} onClick={onClick} aria-label={ariaLabel}>
        {body}
      </Button>
    ) : href ? (
      <Link
        href={href}
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          buttonVariants({ variant: "outline" }),
          SHELL_SECONDARY,
          "border-primary/25 text-foreground no-underline",
        )}
      >
        {body}
      </Link>
    ) : (
      <Button
        variant="outline"
        className={cn(SHELL_SECONDARY, "border-primary/25")}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {body}
      </Button>
    );

  if (!pulse || reduce || variant !== "primary") return shell;

  return (
    <motion.div
      className="w-full"
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ duration: 2.4, repeat: Infinity }}
    >
      {shell}
    </motion.div>
  );
}
