export interface Feature {
  id: string;
  name: string;
  description: string;
  viewed: boolean;
  releaseDate: string;
}

/*
 * Hand-maintained "what's new" log — this is what backs the Changelog tab.
 * Newest entry first. Keep in sync with CHANGELOG.md at the repo root.
 */
export const getFeatureFlags = async (): Promise<Feature[]> => {
  return [
    {
      id: 'settings-simplified',
      name: 'Simpler Settings',
      description: 'Settings is now just Profile, Changelog, and Integrations — no more hunting through ten tabs.',
      viewed: false,
      releaseDate: '2026-07-04',
    },
    {
      id: 'linear-integration',
      name: 'Linear issues from chat',
      description: 'Connect Linear and ask the AI to file an issue directly from the conversation.',
      viewed: false,
      releaseDate: '2026-07-03',
    },
    {
      id: 'github-oauth',
      name: 'One-click GitHub connect',
      description: 'Connect GitHub with a single click via OAuth — no more pasting personal access tokens.',
      viewed: false,
      releaseDate: '2026-07-03',
    },
    {
      id: 'exobase-rebrand',
      name: 'Welcome to Exobase',
      description: 'Rebranded and redesigned on the structured.glass design system.',
      viewed: false,
      releaseDate: '2026-07-03',
    },
  ];
};

export const markFeatureViewed = async (featureId: string): Promise<void> => {
  /* TODO: Implement actual feature viewed logic */
  console.log(`Marking feature ${featureId} as viewed`);
};
