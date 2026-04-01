export type AlienType = {
  name: string;
  slug: string;
  folder: string;
  modelUrl?: string;
};

export const ALIEN_TYPES: AlienType[] = [
  {
    name: 'Loomer',
    slug: 'loomer',
    folder: 'loomer',
    modelUrl: 'https://makerworld.com/es/models/749527-little-alien-visitors#profileId-683012',
  },
  {
    name: 'Squib',
    slug: 'squib',
    folder: 'squib',
    modelUrl: 'https://makerworld.com/es/models/749527-little-alien-visitors#profileId-683012',
  },
  {
    name: 'Slug',
    slug: 'slug',
    folder: 'slug',
  },
  {
    name: 'Greeter',
    slug: 'greeter',
    folder: 'greeter',
    modelUrl: 'https://makerworld.com/es/models/749527-little-alien-visitors#profileId-683012',
  },
  {
    name: 'Watcher',
    slug: 'watcher',
    folder: 'watcher',
    modelUrl: 'https://makerworld.com/es/models/2601876-sitted-cute-alien#profileId-2870960',
  },
];
