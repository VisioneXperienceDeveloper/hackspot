import { useEffect, useState } from 'react';

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function Clock() {
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

  const time = timeFormat.format(now);
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
