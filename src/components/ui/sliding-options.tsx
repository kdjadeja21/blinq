"use client";

import { cn } from "cn";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useId, type ReactNode } from "react";

const SLIDE = { type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const;

export interface SlidingOption<T extends string> {
  value: T;
  label: string;
}

interface SlidingOptionsProps<T extends string> {
  value: T;
  options: SlidingOption<T>[];
  className?: string;
  renderOption: (props: {
    option: SlidingOption<T>;
    selected: boolean;
    className: string;
    children: ReactNode;
  }) => ReactNode;
}

/** Selected pill slides between options. Reduced motion skips the slide. */
export function SlidingOptions<T extends string>({ value, options, className, renderOption }: SlidingOptionsProps<T>) {
  const reduce = useReducedMotion();
  const thumbId = useId();
  return (
    <LayoutGroup id={thumbId}>
      <div className={cn("relative grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-muted p-1", className)}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <div key={option.value} className="contents">
              {renderOption({
                option,
                selected,
                className: cn(
                  "relative flex min-h-11 items-center justify-center rounded-xl px-3 text-center text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                  selected ? "text-transparent" : "text-muted-foreground hover:text-foreground",
                ),
                children: (
                  <>
                    {selected ? (
                      <motion.span
                        layoutId={thumbId}
                        aria-hidden
                        className="absolute inset-0 z-0 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow"
                        transition={reduce ? { duration: 0 } : SLIDE}
                      >
                        {option.label}
                      </motion.span>
                    ) : null}
                    <span className="relative z-10">{option.label}</span>
                  </>
                ),
              })}
            </div>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
