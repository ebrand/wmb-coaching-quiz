'use client';

import { StytchUIClient } from '@stytch/vanilla-js';

let stytchClient: StytchUIClient | null = null;

export function getStytchClient(): StytchUIClient {
  if (!stytchClient) {
    stytchClient = new StytchUIClient(
      process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!
    );
  }
  return stytchClient;
}
