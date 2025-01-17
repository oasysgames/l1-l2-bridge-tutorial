const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      buffer: false,
      assert: false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
    }),
    new HtmlWebpackPlugin({
      template: './static/deposit.html',
      filename: 'deposit.html',
    }),
    new HtmlWebpackPlugin({
      template: './static/withdraw.html',
      filename: 'withdraw.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'static'),
          to: 'static'
        },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'static'),
      publicPath: '/static',
    },
    compress: true,
    port: 8080,
    open: true,
    hot: true,  // hot reload
    watchFiles: ['./'],
  },
};
