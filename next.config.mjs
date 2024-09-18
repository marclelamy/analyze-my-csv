/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer, webpack }) => {
        if (!isServer) {
            config.resolve.fallback.fs = false;
        }

        return config;
    },
};

export default nextConfig;