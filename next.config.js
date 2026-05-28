// 最佳實踐配置示例
module.exports = {
  transpilePackages: ['nanoid'],
  experimental: {
    serverComponentsExternalPackages: ['@opendocsg/pdf2md', 'pdfjs-dist', '@hyzyla/pdfium'],
    esmExternals: 'loose'
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push({
        unpdf: 'window.unpdf',
        'pdfjs-dist': 'window.pdfjsLib'
      });
    } else {
      config.externals.push('pdfjs-dist');
      config.externals.push('@hyzyla/pdfium');
    }
    return config;
  }
};
