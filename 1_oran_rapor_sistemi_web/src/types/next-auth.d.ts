import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      unit?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    unit?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    unit?: string
  }
}
