/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use environment variable for API URL, fallback to localhost
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Development server configuration
  devIndicators: {
    buildActivityPosition: 'bottom-right',
  },
};

module.exports = nextConfig;
