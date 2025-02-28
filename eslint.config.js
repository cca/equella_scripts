import globals from 'globals'
import js from "@eslint/js"

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
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
                xml: 'readonly'
            },
            sourceType: 'module'
        },
        rules: {
            indent: [ 'warn', 4 ],
            'linebreak-style': [ 'error', 'unix' ],
            'no-unused-vars': 'off',
            'no-empty': 'off'
        }
    }
]
