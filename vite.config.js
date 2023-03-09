// vite.config.js
import path from 'path'
import { readdirSync } from 'fs'
import { defineConfig } from 'vite';

const absolutePathAliases = {}
const srcPath = path.resolve('./src/')
const srcRootContent = readdirSync(srcPath, { withFileTypes: true }).map((fileItem) =>
    fileItem.name.replace(/(\.js)/, '')
)

srcRootContent.forEach((directory) => {
    absolutePathAliases[directory] = path.join(srcPath, directory)
})

export default defineConfig({
    mode: 'dev',
    plugins: [],
    resolve: {
        // alias: {
        //     ...absolutePathAliases,
        // },
    },
    server: {
        port: 80,
    },
});