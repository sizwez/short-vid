import { faker } from '@faker-js/faker';

export const generateVideoData = (count: number) => {
  const hashtags = [
    'mzansi', 'southafrica', 'durban', 'capetown', 'joburg', 'dance', 'comedy', 
    'food', 'music', 'braai', 'rugby', 'cricket', 'amapiano', 'gqom', 'kwaito',
    'fashion', 'lifestyle', 'trending', 'viral', 'challenge'
  ];

  const saUsernames = [
    'thabo_creates', 'nomsa_vibes', 'sipho_comedy', 'lerato_dance', 'jabu_music',
    'zanele_fashion', 'mandla_food', 'ntombi_lifestyle', 'bongani_sports', 'precious_art'
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: faker.string.uuid(),
    user: {
      id: faker.string.uuid(),
      username: faker.helpers.arrayElement(saUsernames),
      avatar: `https://img-wrapper.vercel.app/image?url=https://placehold.co/150x150/FF6B35/FFFFFF?text=${faker.person.firstName().charAt(0)}${faker.person.lastName().charAt(0)}`,
      isVerified: faker.datatype.boolean({ probability: 0.3 })
    },
    caption: faker.lorem.sentence(),
    hashtags: faker.helpers.arrayElements(hashtags, { min: 2, max: 5 }),
    likes: faker.number.int({ min: 10, max: 100000 }),
    comments: faker.number.int({ min: 5, max: 1000 }),
    shares: faker.number.int({ min: 1, max: 500 }),
    saves: faker.number.int({ min: 0, max: 200 }),
    tips: faker.number.int({ min: 0, max: 50 }),
    videoUrl: faker.internet.url(),
    isLiked: faker.datatype.boolean({ probability: 0.2 }),
    isSaved: faker.datatype.boolean({ probability: 0.1 }),
    duration: faker.number.int({ min: 15, max: 60 }),
    views: faker.helpers.arrayElement(['1.2K', '5.6K', '12K', '25K', '100K', '1.2M'])
  }));
};

export const generateChallenges = (count: number) => {
  const challengeNames = [
    'Mzansi Dance Challenge', 'Braai Master Challenge', 'Amapiano Moves', 
    'SA Comedy Challenge', 'Gqom Groove', 'Heritage Day Vibes', 
    'Proudly SA Challenge', 'Ubuntu Spirit', 'Local is Lekker'
  ];

  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement(challengeNames),
    hashtag: faker.helpers.arrayElement(['#mzansidance', '#braamaster', '#amapiano', '#sacomedy']),
    participants: faker.number.int({ min: 100, max: 50000 }),
    videos: faker.number.int({ min: 500, max: 100000 }),
    prize: faker.number.int({ min: 1000, max: 50000 }),
    endDate: faker.date.future(),
    thumbnail: `https://img-wrapper.vercel.app/image?url=https://placehold.co/300x400/FF6B35/FFFFFF?text=Challenge`,
    description: faker.lorem.paragraph()
  }));
};

export const generateNotifications = (count: number) => {
  const types = ['like', 'comment', 'follow', 'challenge', 'tip', 'mention'];
  
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(types),
    message: faker.lorem.sentence(),
    user: {
      username: faker.internet.userName(),
      avatar: `https://img-wrapper.vercel.app/image?url=https://placehold.co/50x50/FF6B35/FFFFFF?text=${faker.person.firstName().charAt(0)}`
    },
    timestamp: faker.date.recent(),
    read: faker.datatype.boolean({ probability: 0.6 })
  }));
};
