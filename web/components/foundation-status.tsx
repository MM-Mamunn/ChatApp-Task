"use client";

import { motion } from "framer-motion";

export function FoundationStatus() {
  return (
    <motion.p
      className="text-sm text-zinc-500 dark:text-zinc-400"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      Part 1 foundation: Next.js, TypeScript, Tailwind CSS, and Framer Motion
      are configured.
    </motion.p>
  );
}
