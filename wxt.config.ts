import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'TypeOnce',
    description: 'Save text snippets and expand them anywhere with //',
    permissions: ['activeTab'],
  },
});
