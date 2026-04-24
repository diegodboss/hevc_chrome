import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import prettierConfig from '@vue/eslint-config-prettier'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}']
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/out/**', '**/node_modules/**', 'src/renderer/public/**']
  },

  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),
  prettierConfig
]
