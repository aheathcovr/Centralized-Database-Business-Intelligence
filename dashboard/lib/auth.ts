import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedDomain = process.env.ALLOWED_DOMAIN || 'covr.care';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        const emailDomain = user.email.split('@')[1];
        if (emailDomain === allowedDomain) {
          return true;
        }
      }
      return false;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
};
