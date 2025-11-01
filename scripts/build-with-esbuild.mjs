import { build } from 'esbuild';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

const toPosixPath = (value) => value.split(path.sep).join('/');

async function ensureCleanDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
}

async function runBuild() {
  const result = await build({
    absWorkingDir: rootDir,
    entryPoints: { main: 'src/main.tsx' },
    bundle: true,
    format: 'esm',
    splitting: true,
    sourcemap: true,
    minify: true,
    outdir: path.join('dist', 'assets'),
    entryNames: '[name]-[hash]',
    chunkNames: 'chunk-[hash]',
    assetNames: 'asset-[name]-[hash]',
    target: ['es2019'],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx',
      '.json': 'json',
      '.css': 'css',
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.svg': 'file',
      '.gif': 'file',
    },
    metafile: true,
    logLevel: 'info',
  });

  return result.metafile;
}

function resolveOutputPaths(metafile) {
  let entryScript;
  const entryStyles = [];

  for (const [outputPath, outputMeta] of Object.entries(metafile.outputs)) {
    if (outputMeta.entryPoint === 'src/main.tsx') {
      if (outputPath.endsWith('.js')) {
        entryScript = outputPath;
      }
    }

    if (outputPath.endsWith('.css')) {
      entryStyles.push(outputPath);
    }
  }

  if (!entryScript) {
    throw new Error('Unable to locate the compiled entry script for src/main.tsx.');
  }

  return {
    script: toPosixPath(path.relative(distDir, path.join(rootDir, entryScript))),
    styles: entryStyles.map((stylePath) =>
      toPosixPath(path.relative(distDir, path.join(rootDir, stylePath)))
    ),
  };
}

async function buildHtmlAsset({ script, styles }) {
  const sourceHtml = await fs.readFile(path.join(rootDir, 'index.html'), 'utf8');

  const stylesheetMarkup = styles
    .map((href) => `    <link rel="stylesheet" href="./${href}" />`)
    .join('\n');

  let html = sourceHtml.replace(
    /\s*<link[^>]+index\.css[^>]*>\s*/i,
    stylesheetMarkup ? `\n${stylesheetMarkup}\n` : '\n'
  );

  html = html.replace(
    /<script\s+type="module"\s+src="[^"]+"\s*><\/script>/i,
    `    <script type="module" src="./${script}"></script>`
  );

  await fs.writeFile(path.join(distDir, 'index.html'), html, 'utf8');
}

async function copyPublicAssets() {
  const sourceDir = path.join(rootDir, 'public');
  try {
    await fs.access(sourceDir);
  } catch {
    return;
  }

  await fs.cp(sourceDir, distDir, {
    recursive: true,
    force: true,
    filter: (source) => !source.endsWith(`${path.sep}index.css`),
  });
}

async function main() {
  await ensureCleanDist();
  const metafile = await runBuild();
  const entryAssets = resolveOutputPaths(metafile);
  await buildHtmlAsset(entryAssets);
  await copyPublicAssets();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
