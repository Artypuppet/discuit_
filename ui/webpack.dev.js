const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

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
    plugins: [
      new CleanWebpackPlugin(),
      new ReactRefreshWebpackPlugin(), // Add React Refresh plugin for hot reloading
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
