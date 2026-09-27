export interface Message {
  id: string;
  pin: string;
  sender_name: string;
  message: string | null;
  photo_path: string | null;
  photo_urls: string[];
  voice_path: string | null;
  card_color: string;
  hearted: boolean;
  reply: string | null;
  created_at: string;
  updated_at: string;
}

export type View = 'landing' | 'contributor' | 'tj-wall';
