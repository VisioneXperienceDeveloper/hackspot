import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  ArrowUpRight,
  Globe,
  Search,
  Star,
  X,
} from 'lucide-react';
import { getPage, type GameState } from '../game/engine';
import { sites } from '../game/world';
import { BANK_HOST } from '../game/account';
import { Bank } from './Bank';
import { ArchiveSite } from './sites/ArchiveSite';
import { HaeonSite } from './sites/HaeonSite';
import { TideSite } from './sites/TideSite';

export function Browser({
  state,
  visit,
  bookmarks,
  setBookmarks,
  bankRequest,
  openAccount,
  openMail,
}: {
  state: GameState;
  visit: (url: string) => void;
  bookmarks: string[];
  setBookmarks: (bookmarks: string[]) => void;
  bankRequest: number;
  openAccount: () => void;
  openMail: () => void;
}) {
  const [navigation, setNavigation] = useState({
    history: ['echo://start'],
    index: 0,
    address: 'echo://start',
  });
  const viewportRef = useRef<HTMLDivElement>(null);
  const { history, index, address } = navigation;
  const url = history[index];
  useEffect(() => {
    viewportRef.current?.scrollTo(0, 0);
  }, [url]);
  useEffect(() => {
    if (bankRequest > 0)
      setNavigation((nav) =>
        nav.history[nav.index] === BANK_HOST
          ? nav
          : {
              history: [...nav.history.slice(0, nav.index + 1), BANK_HOST],
              index: nav.index + 1,
              address: BANK_HOST,
            },
      );
  }, [bankRequest]);
  const isBank = /^(?:https?:\/\/)?vaultbank\.test\/?$/i.test(url.trim());
  const match = getPage(url);
  const currentAddress = address.trim();
  const currentAddressBookmarked = bookmarks.includes(currentAddress);
  function bookmarkLabel(bookmark: string) {
    if (/^(?:https?:\/\/)?vaultbank\.test\/?$/i.test(bookmark)) return 'VAULT BANK';
    return getPage(bookmark)?.site.brand ?? bookmark;
  }
  function navigate(next: string) {
    visit(next);
    setNavigation({
      history: [...history.slice(0, index + 1), next],
      index: index + 1,
      address: next,
    });
  }
  function traverse(nextIndex: number) {
    visit(history[nextIndex]);
    setNavigation({ ...navigation, index: nextIndex, address: history[nextIndex] });
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
          onClick={() => traverse(index - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="다음 페이지"
          disabled={index === history.length - 1}
          onClick={() => traverse(index + 1)}
        >
          <ArrowRight size={16} />
        </button>
        <div className="browser-address">
          <LockKeyhole size={13} />
          <input
            aria-label="가상 브라우저 주소"
            value={address}
            onChange={(e) => setNavigation({ ...navigation, address: e.target.value })}
            spellCheck={false}
          />
          <button
            type="button"
            className="address-bookmark"
            aria-label={
              currentAddressBookmarked
                ? '현재 주소가 즐겨찾기에 있습니다'
                : '현재 주소 즐겨찾기에 추가'
            }
            aria-pressed={currentAddressBookmarked}
            title={
              currentAddressBookmarked
                ? '이미 즐겨찾기에 추가되어 있습니다'
                : '현재 주소를 즐겨찾기에 추가'
            }
            disabled={!currentAddress || currentAddressBookmarked || bookmarks.length >= 100}
            onClick={() => setBookmarks([...bookmarks, currentAddress])}
          >
            <Star size={15} fill={currentAddressBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
        <button type="submit" aria-label="주소로 이동">
          <ArrowRight size={17} />
        </button>
      </form>
      {bookmarks.length > 0 && (
        <nav className="bookmarks" aria-label="즐겨찾기">
          {bookmarks.map((bookmark) => (
            <div className="bookmark-item" key={bookmark}>
              <button className="bookmark-link" title={bookmark} onClick={() => navigate(bookmark)}>
                <Globe size={12} />
                {bookmarkLabel(bookmark)}
              </button>
              <button
                className="bookmark-remove"
                aria-label={`${bookmark} 즐겨찾기 제거`}
                title="즐겨찾기에서 제거"
                onClick={() => setBookmarks(bookmarks.filter((item) => item !== bookmark))}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </nav>
      )}
      <div className="web-viewport" ref={viewportRef}>
        {isBank ? (
          <Bank state={state} openAccount={openAccount} openMail={openMail} />
        ) : url === 'echo://start' ? (
          <div className="browser-home">
            <Search size={30} />
            <h2>새 탭</h2>
            <p>주소를 입력하거나 즐겨찾기에서 사이트를 선택하세요.</p>
            <div className="site-directory">
              <button onClick={() => navigate(BANK_HOST)}>
                <span>
                  <b>VAULT BANK</b>
                  <small>{BANK_HOST} · 사례금 계좌</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              {state.onboarding.completed &&
                sites.map((s) => (
                  <button key={s.host} onClick={() => navigate(s.host)}>
                    <span>
                      <b>{s.brand}</b>
                      <small>{s.host}</small>
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                ))}
            </div>
            <p className="muted">이 브라우저는 게임 속 가상 사이트만 엽니다.</p>
          </div>
        ) : match && !state.onboarding.completed ? (
          <div className="browser-home">
            <h2>이 페이지를 열 수 없습니다.</h2>
            <p>현재 이 주소에서 사용할 수 있는 페이지가 없습니다.</p>
          </div>
        ) : match && match.site.host === 'haeon.test' ? (
          <HaeonSite
            site={match.site}
            page={match.page}
            visited={state.visited}
            navigate={navigate}
          />
        ) : match && match.site.host === 'tide.test' ? (
          <TideSite
            site={match.site}
            page={match.page}
            visited={state.visited}
            navigate={navigate}
          />
        ) : match && match.site.host === 'archive.test' ? (
          <ArchiveSite
            site={match.site}
            page={match.page}
            visited={state.visited}
            navigate={navigate}
          />
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
