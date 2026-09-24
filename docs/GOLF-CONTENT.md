# Editing golf stories and achievement messages

## Text shown on each golf ball

Open [`src/data/personal.ts`](../src/data/personal.ts).

- `whiteBallFacts` contains the original six personal stories.
- `personalFactsByBall.yellow` contains six stories about building and delivering projects.
- `personalFactsByBall.striped` uses the six bioinformatics questions in [`src/data/trivia.ts`](../src/data/trivia.ts).

Each collection follows the same club order: Driver, 5 iron, 7 iron, Wedge, Putter, 3 wood. Yellow and striped automatically inherit these clubs from white.

Edit these three fields for a story:

```ts
{
  topic: 'Building Revision Marine', // Club tooltip
  title: 'More than the website.',  // Large heading on the golf ball
  text: 'Your short story goes here.', // Paragraph on the ball
}
```

Keep six stories in each collection and keep the existing white `id`, `club`, `kind`, and `color` fields. Those fields connect stories to the golf-bag artwork. Use short paragraphs so they fit comfortably on phones. A shot uses the story and ball selected when the swing starts; changing balls affects the next shot.

## Striped-ball trivia

Edit `src/data/trivia.ts` for the six questions, one per club in the same bag order. Each question has a `topic`, `prompt`, four `choices`, a `correct` answer index (0 = first, 1 = second, etc.), an `explanation`, and a `source` label/URL. Keep prompts and choices short enough to read in seven seconds. Verify scientific wording against the linked primary source when changing questions.

The seven-second timer starts when the question appears after the swing/flight. Answering locks the choice; running out of time locks all choices. The correct answer, explanation, and source remain until **Next shot**. Hidden tabs pause the countdown. Reduced motion skips the flight but retains the default seven-second challenge.

## Achievement unlock popups

Open [`src/data/achievements.ts`](../src/data/achievements.ts).

`achievementMessages.yellow` and `achievementMessages.striped` each contain:

- `title`: the popup heading.
- `text`: the explanation below it.
- `label`: the small achievement name above the heading.

`allRewardsMessage` is the extra line shown after both challenge balls are collected. Button labels and layout live in `src/components/AchievementPopup.tsx`. The time-trial results screen has separate race-specific text in `src/components/TrialHud.tsx`.

## How rewards work

Yellow unlocks after a qualifying jetski time trial. Discovery stripes unlock after explicitly inspecting verified experimental structures for two different human proteins in the lab. Select a graph node, then choose **Inspect experimental structure**. TP53 and MDM2 are one working pair. They can be discovered in the same network or across different searches; inspecting a protein twice counts once.

RCSB entry and protein-entity records are fetched on demand, with checks for an experimental method, the expected UniProt identity, and a human source organism. Predicted models, failures, and abandoned requests do not count. The panel links to the deposited structure; the network graph itself is not a molecular structure viewer.

Progress, ball selection, and dismissed popups are stored only in the current browser. Existing yellow unlocks survive the update without an unexpected repeat popup. Newly earned popups stay pending until dismissed, including across reloads. Clearing site storage resets progress; there is no account or cross-device synchronization.

After editing, use `npm run dev` to preview. Commit and push to `main` to run checks and publish through GitHub Pages.
