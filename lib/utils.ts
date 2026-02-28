import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  let baseUrl = 'http://localhost:3000';

  // Respect Vercel's standard environment variables first
  // Protect against users manually adding https:// to their env variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL.startsWith('http')
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (process.env.VERCEL_URL) {
    baseUrl = process.env.VERCEL_URL.startsWith('http')
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`;
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  }

  // Clean trailing slashes
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}
