import { useEffect, useState } from 'react';
import type { ClockFormat } from '../game/settings';

const timeFormats: Record<ClockFormat, Intl.DateTimeFormat> = {
  '24h': new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
  '12h': new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }),
};

export function Clock({ format = '24h' }: { format?: ClockFormat }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const time = timeFormats[format].format(now);
  return (
    <time
      dateTime={now.toISOString()}
      title={now.toLocaleString('ko-KR')}
      aria-label={`현재 시간 ${time}`}
    >
      {time}
    </time>
  );
}
