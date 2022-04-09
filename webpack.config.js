const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");


var $path = require("path");

// $env:COVID_19_TIMELINE_VERSION=[guid]::NewGuid().ToString().Replace("-","").Substring(12); npm run build


module.exports = {
  mode: "development",
  devtool: "source-map",
  devServer: {
    contentBase: $path.join(__dirname, 'dist'),
    compress: true,
    port: 2502,
  },
  entry: {
    main__ts: "./src/main/ts/main.ts",
    work__ts: "./src/main/ts/work.ts",
    main_css: "./src/main/webapp/css/main.css",
    mort__ts: "./src/main/ts/mort.ts",
  },
  output: {
    path: $path.join(__dirname, "dist"),
    filename: "[name].js?cb=" + process.env.COVID_19_TIMELINE_VERSION,
    chunkFilename: "[name].js?cb=" + process.env.COVID_19_TIMELINE_VERSION,
  },
  module: {
    rules: [
      // {
      //     test: /\.js$/,
      //     include: /node_modules/,
      //     use: {
      //         loader: "babel-loader",
      //         options: {
      //             presets: ["@babel/preset-env"],
      //             plugins: ["@babel/plugin-syntax-dynamic-import"]
      //         }
      //     }
      // },

      // {
      //   test: /\.(png|jpe?g|gif)$/i,
      //   use: [
      //     {
      //       loader: 'file-loader',
      //       options: {
      //         esModule: false,
      //         name: "assets/[name].[ext]?cb=" + process.env.COVID_19_TIMELINE_VERSION
      //       }
      //     },
      //   ],
      // },
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true
        }
      },
      {
        test: /.js$/,
        use: ["source-map-loader"],
        enforce: "pre"
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],

      },
      {
        test: /(Courier Prime Sans Bold|Courier Prime Sans)\.(ttf|woff|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              esModule: false,
              name: "assets/[name].[ext]"
            }
          },
        ],
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            options: {
              minimize: false,
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /.json$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              esModule: false,
              name: "data/[name].[ext]"
            }
          },
        ],
      },
      {
        test: /.html$/,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            { search: /COVID_19_TIMELINE_VERSION/g, replace: process.env.COVID_19_TIMELINE_VERSION }
          ]
        }
      }

    ]
  },
  plugins: [

    new HtmlWebPackPlugin({
      title: "COVID19-SEIR",
      template: "./src/main/webapp/mortality.html",
      filename: "./mortality.html",
      chunksSortMode: "none",
      //hash: true,
      chunks: [
        "mort__ts",
        "main_css"
      ],
      inlineSource: ".(css)$"
    }),
    new HtmlWebPackPlugin({
      title: "COVID19-SEIR",
      template: "./src/main/webapp/index.html",
      filename: "./index.html",
      chunksSortMode: "none",
      //hash: true,
      chunks: [
        "main__ts",
        "main_css"
      ],
      inlineSource: ".(css)$"
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[name].css"
    }),
    new CopyPlugin({
      patterns: [
        {
          from: './src/main/webapp/manifest.webmanifest',
          to: 'manifest.webmanifest',
          transform(content) {
            return content.toString().replace(/COVID_19_TIMELINE_VERSION/g, process.env.COVID_19_TIMELINE_VERSION);
          }
        },
        { from: './src/main/webapp/data/default-config.json', to: 'data/default-config.json' },
        { from: './src/main/webapp/data/heatmap-data-at.json', to: 'data/heatmap-data-at.json' },
        { from: './src/main/webapp/data/demographics-at.json', to: 'data/demographics-at.json' },
        // { from: './src/main/webapp/data/mortality-data-at.json', to: 'data/mortality-data-at.json' },
        { from: './src/main/webapp/assets/icon_192.png', to: 'assets/icon_192.png' },
        { from: './src/main/webapp/assets/favicon.png', to: 'assets/favicon.png' },
        {
          from: "./src/main/webapp/data/mortality-*.json",
          to({ context, absoluteFilename }) {
            return "data/[name][ext]";
          },
        },
      ]
    }),

  ],
  resolve: {

    modules: [
      $path.resolve(__dirname, "/src/main/ts"),
      $path.resolve(__dirname, "/src/main/webapp/css"),
      $path.resolve(__dirname, "/src/main/webapp/assets"),
      $path.resolve(__dirname, "node_modules/"),

    ],
    extensions: [".ts", ".tsx", ".js", ".scss", ".css"]

  },
  node: {

    // process: false,
    global: false,
    // fs: "empty"

  }
};