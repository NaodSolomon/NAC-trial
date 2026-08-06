import { Users, Briefcase, HandHeart, Trophy } from 'lucide-react';
import { createElement } from 'react';

export const counterItems = [
  { icon: createElement(Users, { className: 'size-10' }), label: 'Volunteers', value: 2019 },
  { icon: createElement(Briefcase, { className: 'size-10' }), label: 'Projects', value: 5061 },
  { icon: createElement(HandHeart, { className: 'size-10' }), label: 'Donors', value: 3910 },
  { icon: createElement(Trophy, { className: 'size-10' }), label: 'Awards', value: 1910 },
];

export const sponsorLogos = Array.from({ length: 8 }, (_, i) => ({
  src: `/images/logo_${i + 1}.png`,
  alt: `Sponsor ${i + 1}`,
}));

export const faqs = [
  {
    question: 'How can I make a donation?',
    answer:
      'You can donate through our website by visiting the Donate page. We accept credit cards, debit cards, and bank transfers. You can choose a one-time donation or set up a recurring monthly contribution. All transactions are processed securely through our encrypted payment system.',
  },
  {
    question: 'How are the funds used?',
    answer:
      'Every dollar donated goes directly to our programs and initiatives. Our funds are allocated across education, healthcare, community development, and emergency relief. We maintain full transparency with annual financial reports available on our website, and over 85% of all donations go directly to program services.',
  },
  {
    question: 'How can I volunteer with Nehemiah?',
    answer:
      'We welcome volunteers from all backgrounds and skill sets. You can apply through our Team page or contact us directly. We offer both local and international volunteer opportunities, ranging from short-term events to long-term placements. All volunteers receive training and ongoing support throughout their service.',
  },
  {
    question: 'Are my donations tax-deductible?',
    answer:
      'The local trial demonstrates donation acknowledgements without collecting real money. Confirm current legal and tax treatment with the Center before making a production donation.',
  },
  {
    question: 'Can I set up recurring donations?',
    answer:
      'Absolutely! Monthly recurring donations are one of the most effective ways to support our work. You can set up automatic monthly donations through our Donate page. You can modify or cancel your recurring donation at any time through your account dashboard or by contacting our support team.',
  },
  {
    question: 'Where does Nehemiah operate?',
    answer:
      'We currently operate in over 30 countries across Africa, Asia, South America, and the Middle East. Our programs are tailored to the specific needs of each community, and we work closely with local partners to ensure sustainable impact.',
  },
  {
    question: 'How does Nehemiah ensure transparency?',
    answer:
      'Transparency is at the core of everything we do. We publish annual reports, financial statements, and program impact assessments on our website. We are independently audited each year and maintain the highest standards of nonprofit governance.',
  },
  {
    question: 'How can my organization become a partner?',
    answer:
      'We actively seek partnerships with businesses, foundations, and other nonprofits that share our vision. Partnership opportunities include corporate sponsorship, cause marketing, employee engagement programs, and co-funded initiatives. Please reach out through our Contact page to discuss partnership opportunities.',
  },
];
