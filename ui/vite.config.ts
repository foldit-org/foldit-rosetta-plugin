import { createPluginViteConfig } from '@foldit/plugin-bridge/vite';

export default createPluginViteConfig({
  entry: 'src/index.tsx',
  outFile: 'rama_map.mjs',
});
