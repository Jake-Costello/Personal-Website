import type { RewardId } from '../lib/achievements';

// Edit the achievement popup wording here. Stories ON the balls live in personal.ts.
export const achievementMessages: Record<
  RewardId,
  {
    title: string;
    text: string;
    label: string;
  }
> = {
  yellow: {
    title: 'Yellow ball unlocked.',
    text: 'You beat the shoreline time trial. Your bright yellow ball comes with a new set of stories about the work behind the projects.',
    label: 'Shoreline sprinter',
  },
  striped: {
    title: 'Striped ball unlocked.',
    text: 'Two proteins. Two experimentally determined structures. Your new alignment-striped ball is ready at the tee. Each club launches a seven-second bioinformatics trivia question.',
    label: 'Structure explorer',
  },
};

export const allRewardsMessage =
  'Both challenge balls collected. Thanks for exploring a little further.';
