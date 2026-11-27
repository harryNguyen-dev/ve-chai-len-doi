import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html (JS, CSS, fonts inlined): opens by double-click (file://)
// and deploys to GitHub Pages under any sub-path.
export default {
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'esnext' },
};
