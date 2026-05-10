import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-100",
  {
    variants: {
      variant: {
        default: "bg-zinc-950",
        success: "bg-emerald-950 text-emerald-200 border-emerald-900",
        warning: "bg-amber-950 text-amber-200 border-amber-900",
        error: "bg-red-950 text-red-200 border-red-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

