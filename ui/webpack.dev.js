const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');
const path = require('path');

module.exports = (env, argv) => {
  const proxyHost = process.env.PROXY_HOST;

  const proxy = [
    {
      context: ['/api', '/images'],
      target: proxyHost,
      secure: false, // keep false for https hosts
    },
  ];

  return merge(common, {
    mode: 'development',
    output: {
      filename: '[name].[contenthash].js',
    },
    devtool: 'inline-source-map',
    devServer: {
      // contentBase: './dist',
      historyApiFallback: true,
      proxy: !!proxyHost ? proxy : undefined,
    },
    plugins: [
      // Plugin for hot module replacement

      new webpack.HotModuleReplacementPlugin(),
    ],
    devServer: {
      static: './dist',
      hot: true,
      open: true,
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8080', // Proxy API requests to Go server
          ws: true,
          changeOrigin: true,
          logLevel: 'debug', // Enable logging to see detailed proxy information
        },
      },
    },
  });
};
