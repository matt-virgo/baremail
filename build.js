import esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const isWatch = process.argv.includes('--watch');
const isServe = process.argv.includes('--serve');
const isStart = process.argv.includes('--start');

const dist = 'dist';
if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

function copyPublic() {
  const publicDir = 'public';
  for (const file of readdirSync(publicDir)) {
    copyFileSync(join(publicDir, file), join(dist, file));
  }
  if (existsSync('config.js')) {
    copyFileSync('config.js', join(dist, 'config.js'));
  }
}

copyPublic();

const sharedConfig = {
  bundle: true,
  minify: !isServe || isStart,
  sourcemap: isServe && !isStart,
  target: ['es2020'],
  format: 'esm',
  jsxImportSource: 'preact',
  jsx: 'automatic',
};

const appBuild = {
  ...sharedConfig,
  entryPoints: ['src/app.ts'],
  outfile: join(dist, 'app.js'),
};

const swBuild = {
  ...sharedConfig,
  entryPoints: ['sw.ts'],
  outfile: join(dist, 'sw.js'),
};

if (isStart) {
  await esbuild.build(appBuild);
  await esbuild.build(swBuild);
  copyPublic();

  const ctx = await esbuild.context({ ...appBuild, write: false });
  let port = 3000;
  let serveResult;
  while (port < 3010) {
    try {
      serveResult = await ctx.serve({ servedir: dist, port, fallback: join(dist, 'index.html') });
      break;
    } catch { port++; }
  }
  if (!serveResult) { console.error('Could not find open port'); process.exit(1); }
  console.log(`  ʕ·ᴥ·ʔ baremail running at http://localhost:${port}`);
  console.log(`      install as PWA: open in Chrome → ⋮ menu → "Install BareMail..."`);
  console.log(`      or in Safari: File → "Add to Dock"`);
} else if (isServe) {
  const ctx = await esbuild.context(appBuild);
  await esbuild.build(swBuild);
  copyPublic();

  let port = 3000;
  let serveResult;
  while (port < 3010) {
    try {
      serveResult = await ctx.serve({ servedir: dist, port, fallback: join(dist, 'index.html') });
      break;
    } catch { port++; }
  }
  if (!serveResult) { console.error('Could not find open port'); process.exit(1); }
  console.log(`  ʕ·ᴥ·ʔ baremail dev server running at http://localhost:${port}`);
  if (port !== 3000) {
    console.log(`  ⚠ port 3000 was busy — running on ${port} instead.`);
    console.log(`    make sure http://localhost:${port} is in your Google OAuth redirect URIs.`);
  }
} else if (isWatch) {
  const ctxApp = await esbuild.context(appBuild);
  const ctxSW = await esbuild.context(swBuild);
  await ctxApp.watch();
  await ctxSW.watch();
  console.log('  ʕ·ᴥ·ʔ watching for changes...');
} else {
  await esbuild.build(appBuild);
  await esbuild.build(swBuild);
  copyPublic();
  console.log('  ʕ·ᴥ·ʔ build complete → dist/');
}
