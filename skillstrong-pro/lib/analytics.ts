'use client';
import posthog from 'posthog-js';

export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export function track(event: string, properties?: Record<string, unknown>) {
  try {
    (window as any).posthog?.capture(event, properties);
  } catch {
    /* noop */
  }
}
