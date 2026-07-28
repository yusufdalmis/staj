import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { compare } from "bcryptjs"
// In-memory rate limiter
const rateLimitStore = new Map<string, { attempts: number, lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Geçersiz giriş bilgileri")
        }

        const email = credentials.email.toLowerCase();
        const now = Date.now();
        const rateLimit = rateLimitStore.get(email);

        if (rateLimit) {
          if (now < rateLimit.lockUntil) {
            // Log the rate limit event
            console.error(`RATE LIMIT: Bruteforce attempt blocked for email: ${email}`);
            try {
               await prisma.systemLog.create({
                 data: { action: "RATE_LIMIT_BLOCKED", details: `Çok fazla hatalı giriş denemesi: ${email}`, ip: "SYSTEM" }
               });
            } catch (e) {}
            
            throw new Error("Çok fazla hatalı giriş denemesi. Lütfen 15 dakika bekleyin.");
          }
          if (now > rateLimit.lockUntil && rateLimit.attempts >= MAX_ATTEMPTS) {
             rateLimitStore.delete(email); // Reset after lock time
          }
        }

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          // Increment attempt for invalid user as well to prevent enumeration
          const currentLimit = rateLimitStore.get(email) || { attempts: 0, lockUntil: 0 };
          currentLimit.attempts += 1;
          if (currentLimit.attempts >= MAX_ATTEMPTS) {
            currentLimit.lockUntil = now + LOCK_TIME;
          }
          rateLimitStore.set(email, currentLimit);
          throw new Error("E-posta veya şifre hatalı")
        }

        if (user.isActive === false) {
          throw new Error("Hesabınız pasif duruma alınmıştır.")
        }

        const isValid = await compare(credentials.password, user.password)

        if (!isValid) {
          const currentLimit = rateLimitStore.get(email) || { attempts: 0, lockUntil: 0 };
          currentLimit.attempts += 1;
          if (currentLimit.attempts >= MAX_ATTEMPTS) {
            currentLimit.lockUntil = now + LOCK_TIME;
          }
          rateLimitStore.set(email, currentLimit);
          throw new Error("E-posta veya şifre hatalı")
        }

        // Successful login, clear rate limit
        rateLimitStore.delete(email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          unit: user.unit || undefined,
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch (e) {}
      return url.startsWith("http") ? url : baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.unit = user.unit
      }

      // Check user status on every request (stateful check for security)
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isActive: true, role: true, unit: true, email: true }
          })
          if (!dbUser || !dbUser.isActive) {
            // Invalidate token by setting a flag
            (token as any).isInvalid = true;
            return token;
          }
          // Update role, unit, and email if changed
          token.role = dbUser.role
          token.unit = dbUser.unit || undefined
          token.email = dbUser.email
        } catch (error) {
          console.error("JWT validation error:", error)
        }
      }

      return token
    },
    async session({ session, token }) {
      // If token is flagged as invalid, clear session
      if ((token as any).isInvalid) {
        // Force session expiration
        (session as any).expires = "1970-01-01T00:00:00.000Z"
        session.user = null as any;
        return session;
      }
      
      if (token && session.user) {
        session.user.id = (token.id || token.sub) as string
        session.user.role = token.role as string
        session.user.unit = token.unit as string | undefined
        session.user.email = token.email as string
      }
      return session
    }
  }
}
