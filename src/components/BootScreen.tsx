import { useEffect, useState } from 'react';
import { Check, Cpu, Power } from 'lucide-react';

const bootMessages = [
  '시스템 전원 확인',
  '메모리 검사',
  '로컬 세션 불러오기',
  '데스크톱 환경 준비',
];

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let value = 0;
    let completionTimer: number | undefined;
    const timer = window.setInterval(() => {
      value = Math.min(value + 2, 100);
      setProgress(value);
      if (value === 100) {
        window.clearInterval(timer);
        completionTimer = window.setTimeout(onComplete, 650);
      }
    }, 45);
    return () => {
      window.clearInterval(timer);
      if (completionTimer !== undefined) window.clearTimeout(completionTimer);
    };
  }, [onComplete]);

  return (
    <section className="boot-screen" role="status" aria-label="컴퓨터 시작 화면">
      <div className="boot-content">
        <div className="boot-device">
          <Cpu size={21} />
          <span>HACKSPOT PERSONAL SYSTEM</span>
          <Power size={16} />
        </div>
        <div className="boot-brand">
          <span>HACKSPOT</span>
          <h1>조사 환경을 시작합니다</h1>
          <p>PERSONAL INVESTIGATION WORKSTATION</p>
        </div>
        <ol className="boot-messages">
          {bootMessages.map((message, index) => {
            const ready = progress >= (index + 1) * 22;
            return (
              <li key={message} className={ready ? 'ready' : ''}>
                <span>{ready ? <Check size={12} /> : '·'}</span>
                {message}
                <small>{ready ? '완료' : '대기'}</small>
              </li>
            );
          })}
        </ol>
        <div className="boot-progress-label">
          <span>시스템 로딩</span>
          <span>{progress}%</span>
        </div>
        <div
          className="boot-progress"
          role="progressbar"
          aria-label="시스템 로딩"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <footer>로컬 환경 확인 중 · 외부 네트워크 연결 없음</footer>
      </div>
    </section>
  );
}
