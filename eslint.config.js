import globals from 'globals'
import js from "@eslint/js"
import {globalIgnores} from "eslint/config"
import unusedImports from "eslint-plugin-unused-imports"

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2025,
            globals: {
                ...globals.browser,
                ...globals.node,
                currentItem: 'readonly',
                data: 'readonly',
                GmailApp: 'readonly',
                item: 'readonly',
                jQuery: 'readonly',
                $: 'readonly',
                logger: 'readonly',
                page: 'readonly',
                user: 'readonly',
                xml: 'readonly',
            },
            sourceType: 'module',
        },
        plugins: {
            "unused-imports": unusedImports,
        },
        rules: {
            'comma-dangle': ["error", "always-multiline"],
            'indent': [ 'warn', 4 ],
            'linebreak-style': [ 'error', 'unix' ],
            'no-unused-vars': 'off',
            'no-empty': 'off',
            'semi': ['warn', 'never'],
            // Flag and autofix unused imports
            "unused-imports/no-unused-imports": "warn",
        },
    },
    globalIgnores(["fine-arts-jr-review/.venv"]),
]
