import { Link } from '@tanstack/react-router';
import { SYSTEM } from '../../data/strings';
import { Auth } from './Auth';
import { Import } from './Import';

export function Settings() {
  return (
    <main className="settings">
      <header className="gate-head">
        <Link to="/" className="gate-back system-text">
          [{SYSTEM.settings.back}]
        </Link>
        <span className="rank-badge">{SYSTEM.settings.title}</span>
      </header>
      <Auth />
      <Import />
    </main>
  );
}
