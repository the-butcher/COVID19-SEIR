const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

var $path = require("path");

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
    },
    output: {
        path: $path.join(__dirname, "dist"),
        filename: "[name].js",
        chunkFilename: "[name].js"
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

        ]
    },
    plugins: [

        new HtmlWebPackPlugin({
            title: "COVID-19 Timeline",
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
};