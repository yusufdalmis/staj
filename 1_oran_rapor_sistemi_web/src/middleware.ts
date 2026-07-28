import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // Allow access to login page
      if (req.nextUrl.pathname.startsWith('/login')) {
        return true
      }
      // Require authentication for all other routes
      return !!token
    },
  },
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
}
