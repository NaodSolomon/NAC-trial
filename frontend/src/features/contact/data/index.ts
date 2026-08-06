import { Phone, MapPin, Clock } from 'lucide-react';
import { createElement } from 'react';

export const contactInfo = [
  {
    icon: createElement(Phone, { className: 'size-6' }),
    title: 'Phone Number',
    text: '(+880) 0823 560 433',
  },
  {
    icon: createElement(MapPin, { className: 'size-6' }),
    title: 'Office Address',
    text: 'Road-2, East Shibgonj, House No: M-23, Sylhet',
  },
  {
    icon: createElement(Clock, { className: 'size-6' }),
    title: 'Working Hours',
    text: 'Mon - Fri: 10.00 - 18.00',
  },
];
