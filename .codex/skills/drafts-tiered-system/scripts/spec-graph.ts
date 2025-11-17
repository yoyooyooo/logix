import { buildSpecGraph } from './specGraphCore';

async function main() {
  const graph = await buildSpecGraph();
  process.stdout.write(`${JSON.stringify(graph)}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
