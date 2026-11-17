import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, ArrowUpRight, Globe, Search } from 'lucide-react';
import { getPage, type GameState } from '../game/engine';
import { sites } from '../game/world';
export function Browser({ state, visit }: { state: GameState; visit: (url: string) => void }) {
  const [url, setUrl] = useState('echo://start'),
    [address, setAddress] = useState('echo://start'),
    [history, setHistory] = useState(['echo://start']),
    [index, setIndex] = useState(0);
  const match = getPage(url);
  function navigate(next: string, push = true) {
    setUrl(next);
    setAddress(next);
    visit(next);
    if (push) {
      setHistory([...history.slice(0, index + 1), next]);
      setIndex(index + 1);
    }
  }
  return (
    <div className="browser-shell">
      <form
        className="browser-bar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(address);
        }}
      >
        <button
          type="button"
          aria-label="이전 페이지"
          disabled={index === 0}
          onClick={() => {
            setIndex(index - 1);
            navigate(history[index - 1], false);
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="다음 페이지"
          disabled={index === history.length - 1}
          onClick={() => {
            setIndex(index + 1);
            navigate(history[index + 1], false);
          }}
        >
          <ArrowRight size={16} />
        </button>
        <label>
          <LockKeyhole size={13} />
          <input
            aria-label="가상 브라우저 주소"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            spellCheck={false}
          />
        </label>
        <button type="submit" aria-label="주소로 이동">
          <ArrowRight size={17} />
        </button>
      </form>
      <nav className="bookmarks" aria-label="즐겨찾기">
        {sites.map((s) => (
          <button key={s.host} onClick={() => navigate(s.host)}>
            <Globe size={12} />
            {s.brand}
          </button>
        ))}
      </nav>
      <div className="web-viewport">
        {url === 'echo://start' ? (
          <div className="browser-home">
            <Search size={30} />
            <h2>흩어진 기록을 연결하세요.</h2>
            <p>
              메일에 남겨진 세 곳의 출발점입니다.
              <br />각 사이트의 메뉴와 문서를 꼼꼼히 살펴보세요.
            </p>
            <div className="site-directory">
              {sites.map((s) => (
                <button key={s.host} onClick={() => navigate(s.host)}>
                  <span>
                    <b>{s.brand}</b>
                    <small>{s.host}</small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
            <p className="muted">이 브라우저는 사건 속 사이트만 엽니다.</p>
          </div>
        ) : match ? (
          <article className={`virtual-site ${match.site.theme}`}>
            <header className="site-header">
              <strong>{match.site.brand}</strong>
              <small>{match.site.subtitle}</small>
            </header>
            <nav className="site-nav" aria-label="사이트 메뉴">
              {match.site.pages.map((p) => (
                <button
                  key={p.path}
                  className={p.path === match.page.path ? 'selected' : ''}
                  onClick={() => navigate(match.site.host + p.path)}
                >
                  {p.label}
                  {state.visited.includes(match.site.host + p.path) && (
                    <span className="read-dot" title="열람함" />
                  )}
                </button>
              ))}
            </nav>
            <div className="site-article">
              <span className="document-date">ARCHIVE / 2031.10</span>
              <h2>{match.page.title}</h2>
              <p className="site-intro">{match.page.intro}</p>
              {match.page.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {match.page.table && (
                <table>
                  <thead>
                    <tr>
                      {match.page.table[0].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {match.page.table.slice(1).map((r, i) => (
                      <tr key={i}>
                        {r.map((t, j) => (
                          <td key={j}>{t}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <footer>자료 열람 기록이 조사 노트에 저장됩니다.</footer>
            </div>
          </article>
        ) : (
          <div className="browser-home">
            <Globe size={32} />
            <h2>등록되지 않은 주소입니다.</h2>
            <p>
              사건 속 도메인과 경로만 열 수 있습니다.
              <br />
              외부 인터넷으로 연결하지 않습니다.
            </p>
            <button className="primary" onClick={() => navigate('echo://start')}>
              출발점으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
