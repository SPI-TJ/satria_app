import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-6 sm:pb-8">
        <Outlet />
      </main>
    </div>
  );
}
