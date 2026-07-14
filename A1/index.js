#!/usr/bin/env node
/**
 * A1 CLI demo.
 *
 * Usage:
 *   node index.js              # runs both screening and embedding
 *   node index.js screen       # only the screening demo
 *   node index.js embed        # only the embedding demo
 *
 * Requires OPENAI_API_KEY in the environment (via .env or shell export).
 */

import { screenAbstract } from './src/screener.js';
import { embedText, EMBEDDING_DIMENSIONS } from './src/embedder.js';

const SAMPLE_ABSTRACT =
  'Background: Cognitive behavioural therapy (CBT) is a first-line ' +
  'psychological treatment for major depressive disorder. This trial ' +
  'evaluated whether adding CBT to standard antidepressant therapy ' +
  'improves outcomes in adults with treatment-resistant depression. ' +
  'Methods: We randomised 469 adults with treatment-resistant depression ' +
  'to CBT plus usual care or usual care alone. Primary outcome: depressive ' +
  'symptom score at 12 months. Results: CBT augmentation produced a mean ' +
  'symptom reduction of 4.2 points (95% CI −5.8 to −2.6). Response rate ' +
  'was 46% in the CBT group versus 27% in controls. Gains were maintained ' +
  'at 18-month follow-up. Conclusion: CBT is an effective augmentation ' +
  'strategy for treatment-resistant depression.';

const SAMPLE_CRITERIA = {
  include: [
    'Adults (18+ years) with major depressive disorder',
    'Randomised controlled trial design',
    'Reports depressive symptom scores as an outcome',
  ],
  exclude: [
    'Studies conducted exclusively in pregnant or postpartum women',
    'Non-human studies',
    'Observational studies without randomisation',
  ],
};

async function runScreen() {
  console.log('\n--- Screening demo ---');
  const result = await screenAbstract(SAMPLE_ABSTRACT, SAMPLE_CRITERIA);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function runEmbed() {
  console.log('\n--- Embedding demo ---');
  const vector = await embedText(SAMPLE_ABSTRACT);
  const preview = vector.slice(0, 5).map((n) => Number(n.toFixed(6)));
  console.log(
    JSON.stringify(
      {
        dimensions: vector.length,
        expectedDimensions: EMBEDDING_DIMENSIONS,
        preview,
      },
      null,
      2,
    ),
  );
  return vector;
}

async function main() {
  const [, , command] = process.argv;
  try {
    if (!command || command === 'all') {
      await runScreen();
      await runEmbed();
    } else if (command === 'screen') {
      await runScreen();
    } else if (command === 'embed') {
      await runEmbed();
    } else {
      console.error(
        `Unknown command "${command}". Valid: screen | embed | all (default)`,
      );
      process.exit(2);
    }
  } catch (error) {
    console.error('\n[A1] Demo failed:', error.message);
    process.exit(1);
  }
}

main();
