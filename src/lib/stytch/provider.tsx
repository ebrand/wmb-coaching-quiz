'use client';

import { StytchProvider as StytchProviderBase, createStytchUIClient } from '@stytch/nextjs';
import { ReactNode } from 'react';

const stytchClient = createStytchUIClient(
  process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!
);

export function StytchProvider({ children }: { children: ReactNode }) {
  return (
    <StytchProviderBase stytch={stytchClient}>
      {children}
    </StytchProviderBase>
  );
}
