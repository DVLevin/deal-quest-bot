import { getRankTitle } from '@deal-quest/shared';

export default function App() {
  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Deal Quest TMA</h1>
      <p>Foundation scaffold loaded successfully.</p>
      <p>Starting rank: {getRankTitle(1)}</p>
    </div>
  );
}
