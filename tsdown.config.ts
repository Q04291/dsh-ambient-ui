import { clientBundle } from './shared/tsdown.client.ts'

export default clientBundle('dsh-ambient-ui', ['src/index.ts'], {
  lib: {
    // The host half resolves cordis, the settings seam, the credentials seam,
    // the web-server route seam, and the token-meter service at runtime from
    // the dsh profile tree, not from this repo's install.
    external: [
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-settings',
      '@deepseek-ai/dsh-credentials',
      '@deepseek-ai/dsh-host-webserver',
      '@deepseek-ai/dsh-token-meter',
    ],
  },
})
