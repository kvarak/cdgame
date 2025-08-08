// Random name generator for anonymous players
const ADJECTIVES = [
  'aqua', 'azure', 'coral', 'crimson', 'emerald', 'golden', 'indigo', 'jade',
  'lavender', 'magenta', 'navy', 'olive', 'pearl', 'rose', 'sage', 'teal',
  'violet', 'amber', 'bronze', 'copper', 'silver', 'ruby', 'sapphire', 'citrine',
  'swift', 'bright', 'bold', 'clever', 'gentle', 'happy', 'lucky', 'mighty',
  'quiet', 'sunny', 'witty', 'zesty', 'brave', 'calm', 'eager', 'fierce'
];

const ANIMALS = [
  'monkey', 'hamster', 'penguin', 'dolphin', 'falcon', 'tiger', 'rabbit', 'fox',
  'wolf', 'eagle', 'shark', 'panther', 'lynx', 'otter', 'bear', 'deer',
  'whale', 'hawk', 'raven', 'owl', 'seal', 'moose', 'bison', 'llama',
  'gecko', 'iguana', 'cobra', 'viper', 'spider', 'beetle', 'mantis', 'moth',
  'panda', 'koala', 'zebra', 'giraffe', 'hippo', 'rhino', 'elephant', 'cheetah'
];

export const generateRandomName = (): string => {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
};

export const getDisplayName = (user: any): string => {
  if (user?.user_metadata?.user_name) {
    return user.user_metadata.user_name;
  }
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }
  if (user?.email) {
    return user.email.split('@')[0];
  }
  return generateRandomName();
};