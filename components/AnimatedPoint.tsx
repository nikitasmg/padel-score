"use client";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";

export function AnimatedPoint({
  value,
  className,
  style,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className="relative inline-grid place-items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "55%", opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-55%", opacity: 0, filter: "blur(4px)" }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={`tnum ${className ?? ""}`}
          style={style}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
