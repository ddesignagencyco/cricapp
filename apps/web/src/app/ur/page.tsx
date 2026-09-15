import { redirect } from 'next/navigation';

export default function UrduHomePage() {
  redirect('/news?lang=ur');
}
