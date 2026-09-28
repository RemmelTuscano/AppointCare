import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Prefer a fixed site URL so auth redirects survive LAN IP changes; falls back to the current origin.
export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? location.origin
}
