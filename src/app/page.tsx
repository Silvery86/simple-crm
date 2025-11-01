import { redirect } from 'next/navigation';

/**
 * Purpose: Root page that redirects to Vietnamese by default.
 */
export default function HomePage() {
  redirect('/vi');
}
