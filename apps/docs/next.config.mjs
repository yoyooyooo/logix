import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Default locale is hidden in public URLs, but our route tree is `/[lang]/*`.
      // Use rewrite (not redirect) so `/` renders the English landing page without changing the URL.
      { source: '/', destination: '/en' },
      // Keep English docs under `/docs/*` (no locale prefix) while the route tree is `/en/docs/*`.
      // This also fixes client-side navigation since `/docs` would otherwise be captured as `[lang]=docs`.
      { source: '/docs', destination: '/en/docs' },
      { source: '/docs/:path*', destination: '/en/docs/:path*' },
    ]
  },
}

export default withMDX(config)
