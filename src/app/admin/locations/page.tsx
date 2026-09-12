import { redirect } from 'next/navigation';

export default function AdminLocationsRedirect() {
  redirect('/admin/delivery/locations');
}
