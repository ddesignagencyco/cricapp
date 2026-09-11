import { redirect } from 'next/navigation';

export const metadata = {
  title: 'اردو',
  description: 'پاک کرک زون کی اردو خبریں اور میچ رپورٹس۔',
};

export default function UrduHomePage() {
  redirect('/ur/news');
}
