import { Users, Briefcase, HandHeart, Trophy } from 'lucide-react';
import { createElement } from 'react';

export const slides = [
  {
    image: '/images/home_1_slider_1.jpg',
    title:
      'YOUR <span class="text-primary">SMALL</span><br/>DONATION CAN<br/>BRING <span class="text-primary">HUGE</span> SMILE',
    subtitle:
      "Since 2002, we provide children's legal rights for safe future. We ensure financial supports over 10k orphans and their families.",
    primaryButton: { label: 'Learn More', href: '/about' },
    secondaryButton: { label: 'Donate Now', href: '/donate' },
  },
  {
    image: '/images/home_1_slider_2.jpg',
    title: 'TOGETHER WE CAN<br/>MAKE A <span class="text-primary">DIFFERENCE</span>',
    subtitle:
      'Join our community of volunteers and donors making real impact in the lives of children worldwide.',
    primaryButton: { label: 'Get Involved', href: '/team' },
    secondaryButton: { label: 'Donate Now', href: '/donate' },
  },
];

export const counterItems = [
  { icon: createElement(Users, { className: 'size-10' }), label: 'Volunteers', value: 2019 },
  { icon: createElement(Briefcase, { className: 'size-10' }), label: 'Projects', value: 5061 },
  { icon: createElement(HandHeart, { className: 'size-10' }), label: 'Donors', value: 3910 },
  { icon: createElement(Trophy, { className: 'size-10' }), label: 'Awards', value: 1910 },
];

export const events = [
  {
    image: '/images/event_1.jpg',
    title: 'Fundraising Dinner Gala',
    description:
      'Join us for an elegant evening of dining, entertainment, and giving to support children in need across the globe.',
    date: 'March 25, 2026',
    slug: 'fundraising-dinner-gala',
  },
  {
    image: '/images/event_2.jpg',
    title: 'Community Outreach Day',
    description:
      'A day of service and community building where volunteers come together to make a direct impact in local neighborhoods.',
    date: 'April 10, 2026',
    slug: 'community-outreach-day',
  },
  {
    image: '/images/event_3.jpg',
    title: 'Charity Marathon Run',
    description:
      'Lace up your running shoes and join thousands of runners raising funds for education and healthcare programs.',
    date: 'May 15, 2026',
    slug: 'charity-marathon-run',
  },
];

export const teamMembers = [
  {
    image: '/images/team_6.jpg',
    name: 'Melissa Munoz',
    role: 'Volunteer',
    slug: 'melissa-munoz',
    social: { facebook: '#', twitter: '#', linkedin: '#' },
  },
  {
    image: '/images/team_7.jpg',
    name: 'David Chen',
    role: 'Volunteer',
    slug: 'david-chen',
    social: { facebook: '#', twitter: '#', linkedin: '#' },
  },
  {
    image: '/images/team_8.jpg',
    name: 'Sarah Johnson',
    role: 'Volunteer',
    slug: 'sarah-johnson',
    social: { facebook: '#', twitter: '#', linkedin: '#' },
  },
  {
    image: '/images/team_9.jpg',
    name: 'James Wilson',
    role: 'Volunteer',
    slug: 'james-wilson',
    social: { facebook: '#', twitter: '#', linkedin: '#' },
  },
];

export const testimonials = [
  {
    text: 'Volunteering with Nehemiah has been one of the most rewarding experiences of my life. Seeing the direct impact we make on children and families is truly humbling.',
    name: 'Robert Williams',
    role: 'Volunteer since 2018',
  },
  {
    text: 'The transparency and dedication of this organization is remarkable. Every dollar donated goes directly to helping those in need. I am proud to be a long-time supporter.',
    name: 'Amanda Foster',
    role: 'Monthly Donor',
  },
  {
    text: 'Thanks to Nehemiah, my children now have access to quality education and healthcare. They have given our family hope for a brighter future.',
    name: 'Maria Garcia',
    role: 'Program Beneficiary',
  },
];

export const blogPosts = [
  {
    image: '/images/blog_1.jpg',
    title: 'How Your Donations Change Lives Every Day',
    excerpt:
      'Discover the real stories behind the numbers and see how every contribution creates lasting change in communities worldwide.',
    date: 'Feb 20, 2026',
    author: 'Admin',
    slug: 'how-your-donations-change-lives',
  },
  {
    image: '/images/blog_2.jpg',
    title: 'Volunteering Abroad: A Life-Changing Experience',
    excerpt:
      'Read about the transformative journey of our volunteers who traveled overseas to help build schools and community centers.',
    date: 'Feb 15, 2026',
    author: 'Admin',
    slug: 'volunteering-abroad',
  },
  {
    image: '/images/blog_3.jpg',
    title: 'The Impact of Clean Water on Rural Communities',
    excerpt:
      'Clean water access changes everything. Learn about our latest water purification projects and their incredible outcomes.',
    date: 'Feb 10, 2026',
    author: 'Admin',
    slug: 'impact-of-clean-water',
  },
];

export const sponsorLogos = [
  { src: '/images/logo_1.svg', alt: 'Global Foundation' },
  { src: '/images/logo_2.svg', alt: 'EcoTrust Partners' },
  { src: '/images/logo_3.svg', alt: 'Evergreen Capital' },
  { src: '/images/logo_4.svg', alt: 'HopeWell Group' },
  { src: '/images/logo_5.svg', alt: 'United Aid Corp' },
  { src: '/images/logo_6.svg', alt: 'Beacon Impact' },
  { src: '/images/logo_7.svg', alt: 'Horizon Charity' },
  { src: '/images/logo_8.svg', alt: 'Uplift Ventures' },
];

export const galleryImages = Array.from({ length: 8 }, (_, i) => ({
  src: `/images/gallery_${i + 1}.jpg`,
  alt: `Gallery image ${i + 1}`,
}));
