'use client';
import posthog from 'posthog-js';
export function initAnalytics(){const k=process.env.NEXT_PUBLIC_POSTHOG_KEY;if(!k)return;posthog.init(k,{api_host:process.env.NEXT_PUBLIC_POSTHOG_HOST||'https://us.i.posthog.com',capture_pageview:true,capture_pageleave:true});}
export function track(e,p){try{(window as any).posthog?.capture(e,p);}catch{}}
