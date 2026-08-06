export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  social?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
}
