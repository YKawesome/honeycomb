//@ts-check

'use strict';

import path from 'path';
import baseConfig from "../../.config/webpack.config";
import { type Configuration, ProvidePlugin } from 'webpack';

const extensionConfig: Configuration = {
    target: 'node',
    mode: 'none',

    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    devtool: 'nosources-source-map',
    infrastructureLogging: {
        level: "log", // enables logging required for problem matchers
    },
};

const webviewConfig = (env: any): Configuration => {
    const base = baseConfig(env);

    return {
        ...base,
        target: 'web',
        entry: './web/index.tsx',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'webview.js',
        },
        resolve: {
            ...base.resolve,
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        plugins: [
            new ProvidePlugin({
                React: 'react',
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: true,
                                compilerOptions: {
                                    jsx: 'react',
                                }
                            }
                        }
                    ]
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader', 'postcss-loader'],
                },
                {
                    test: /\.(png|jpg|gif|svg|fbx)$/,
                    type: 'asset/resource',
                },
            ],
        },
        externals: [],
    } as Configuration;
};

module.exports = [
    extensionConfig,
    webviewConfig,
];
