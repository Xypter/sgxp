import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Snippet } from "svelte";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Type utilities for Svelte 5 component props
export type WithElementRef<T> = T & {
	ref?: any;
	children?: Snippet;
};

export type WithoutChildren<T> = Omit<T, 'children'>;
