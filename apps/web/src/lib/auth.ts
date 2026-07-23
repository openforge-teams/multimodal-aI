import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@dreamforge/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  socialProviders: {
    github: {
      clientId: process.env.OAUTH_GITHUB_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_SECRET || '',
      enabled: !!process.env.OAUTH_GITHUB_ID,
    },
    google: {
      clientId: process.env.OAUTH_GOOGLE_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_SECRET || '',
      enabled: !!process.env.OAUTH_GOOGLE_ID,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 天
    updateAge: 60 * 60 * 24, // 每天更新
  },
  advanced: {
    cookies: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
});

export type Auth = typeof auth;
