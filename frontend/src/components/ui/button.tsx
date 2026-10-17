import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

/**
 * Gradient buttons with a coloured glow, lifting 2px and brightening on
 * hover, settling back when pressed.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-out " +
  "hover:-translate-y-0.5 hover:brightness-[1.15] active:translate-y-0 active:brightness-95 " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100 focus-visible:outline-2";

const variants: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(135deg,var(--primary)_0%,color-mix(in_oklab,var(--primary)_50%,var(--violet))_50%,var(--violet)_100%)] text-white " +
    "shadow-[0_8px_30px_-8px_color-mix(in_oklab,var(--primary)_75%,transparent)] hover:shadow-[0_12px_36px_-8px_color-mix(in_oklab,var(--violet)_80%,transparent)]",
  gold:
    "bg-[linear-gradient(135deg,#ffd76a_0%,#f2c14e_45%,#f59e0b_100%)] text-[#1b1400] " +
    "shadow-[0_8px_30px_-8px_rgb(245_158_11/0.65)] hover:shadow-[0_12px_38px_-8px_rgb(245_158_11/0.8)]",
  secondary:
    "border border-border bg-surface/70 text-fg backdrop-blur hover:border-primary/60 hover:shadow-[0_8px_28px_-12px_color-mix(in_oklab,var(--primary)_70%,transparent)]",
  ghost: "text-muted hover:text-fg hover:bg-surface-2/60",
  danger: "bg-[linear-gradient(135deg,#ff6b6b,#e03131)] text-white shadow-[0_8px_30px_-10px_rgb(224_49_49/0.6)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant, size, loading, icon, children, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function LinkButton({ variant, size, className = "", ...rest }: LinkButtonProps) {
  return <Link {...rest} className={buttonClass(variant, size, className)} />;
}
