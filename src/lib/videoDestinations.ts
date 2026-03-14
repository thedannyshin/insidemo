export interface VideoDestination {
  id: string;
  videoId: string;
  city: string;
  landmark: string;
  emoji: string;
}

export const VIDEO_DESTINATIONS: VideoDestination[] = [
  // San Francisco
  { id: 'sf-lombard', videoId: 'c9OcB9CzKpA', city: 'San Francisco', landmark: 'Lombard Street', emoji: '🌁' },
  { id: 'sf-mission', videoId: 'VHFIPKmk8SQ', city: 'San Francisco', landmark: 'Mission Street', emoji: '🌉' },
  { id: 'sf-union', videoId: 'bYgmJ_qIegk', city: 'San Francisco', landmark: 'Union Square', emoji: '🛍️' },
  { id: 'sf-hills', videoId: 'PhaOBi6w_G0', city: 'San Francisco', landmark: 'SF Hills', emoji: '⛰️' },

  // Los Angeles
  { id: 'la-rodeo', videoId: 'il9fJdHtkv4', city: 'Los Angeles', landmark: 'Rodeo Drive', emoji: '🌴' },
  { id: 'la-mulholland', videoId: 'Ht3gDJFNolQ', city: 'Los Angeles', landmark: 'Mulholland Drive', emoji: '🎬' },
  { id: 'la-olympus', videoId: 'qqBDjQYCP_M', city: 'Los Angeles', landmark: 'Mount Olympus', emoji: '🏔️' },

  // New York City
  { id: 'nyc-times', videoId: '4KByHJmjPOM', city: 'New York', landmark: 'Times Square', emoji: '🗽' },
  { id: 'nyc-5th', videoId: '52FsH27-VuY', city: 'New York', landmark: '5th Avenue', emoji: '🏙️' },
  { id: 'nyc-broadway', videoId: '8hRX77lrUpY', city: 'New York', landmark: 'Broadway', emoji: '🎭' },
];

export const DEFAULT_VIDEO_ID = 'c9OcB9CzKpA';
