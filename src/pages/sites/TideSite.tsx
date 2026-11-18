import { ArrowRight, CalendarDays, Compass, FileText, Waves } from 'lucide-react';
import type { Site, SitePage } from '../../game/world';

export function TideSite({
  site,
  page,
  visited,
  navigate,
}: {
  site: Site;
  page: SitePage;
  visited: string[];
  navigate: (url: string) => void;
}) {
  const isHome = page.path === '/';

  return (
    <div className="virtual-site tide-site">
      <div className="tide-utility">
        <span>모라 시민 해양관측 네트워크</span>
        <span>
          관측 참여 안내 <i /> 공개 기록실
        </span>
      </div>
      <header className="tide-masthead">
        <div className="tide-brand">
          <span className="tide-brand-mark">
            <Waves size={25} />
          </span>
          <span>
            <small>MORA CITIZEN TIDE WATCH</small>
            <strong>물때 기록실</strong>
          </span>
        </div>
        <div className="tide-network-status">
          <span className="tide-status-dot" />
          <span>
            <small>기록 네트워크</small>
            <b>관측 기록 접수 중</b>
          </span>
        </div>
      </header>
      <nav className="tide-nav" aria-label="물때 기록실 메뉴">
        {site.pages.map((item) => (
          <button
            key={item.path}
            className={item.path === page.path ? 'selected' : ''}
            aria-current={item.path === page.path ? 'page' : undefined}
            onClick={() => navigate(site.host + item.path)}
          >
            {item.label}
            {visited.includes(site.host + item.path) && (
              <span className="read-dot" title="열람함" />
            )}
          </button>
        ))}
        <span className="tide-nav-caption">모라 연안 · 시민 관측 로그</span>
      </nav>
      <div className="tide-data-strip">
        <span>
          <CalendarDays size={13} />
          2031년 10월 관측 기록
        </span>
        <span>현장 기록은 검증 전 자료로 공개됩니다.</span>
      </div>

      {isHome ? (
        <main className="tide-main">
          <section className="tide-hero">
            <div className="tide-hero-copy">
              <span className="tide-eyebrow">COMMUNITY FIELD OBSERVATIONS</span>
              <h1>{page.title}</h1>
              <p>{page.intro}</p>
            </div>
            <div className="tide-hero-location">
              <span className="tide-location-grid" />
              <span className="tide-location-label">
                <Compass size={14} />
                모라 부두 관측 구역
              </span>
              <b>현장 기록</b>
              <small>10.17 · 23:00–23:25</small>
            </div>
          </section>

          <div className="tide-content">
            <div className="tide-section-heading">
              <div>
                <span className="tide-eyebrow">FIELD LOG / 2031.10.17</span>
                <h2>시민 관측 노트</h2>
              </div>
              <span className="tide-unverified">제보자 기록 · 미검증</span>
            </div>
            <div className="tide-content-grid">
              <article className="tide-field-card">
                <div className="tide-record-meta">
                  <span>
                    <b>기록 위치</b>
                    모라 부두 · 배출구 인근
                  </span>
                  <span>
                    <b>기록자</b>
                    시민 관측자 은오
                  </span>
                  <span>
                    <b>기록 구간</b>
                    23:00–23:25 KST
                  </span>
                </div>
                <div className="tide-observation-facts">
                  <span>
                    <i className="tide-fact-light" />
                    관측탑 상태등
                    <b>녹색 점등</b>
                  </span>
                  <span>
                    <i className="tide-fact-water" />
                    배출구 주변
                    <b>물빛 변화 관찰</b>
                  </span>
                  <span>
                    <i className="tide-fact-note" />
                    증거 상태
                    <b>추가 확인 필요</b>
                  </span>
                </div>
                <div className="tide-entry-copy">
                  {page.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
                <footer className="tide-field-footer">
                  <span>관측 사실과 추정은 구분해 기록합니다.</span>
                  <span>현장 노트 · 공개 열람</span>
                </footer>
              </article>
              <aside className="tide-side-column">
                <section className="tide-side-card">
                  <div className="tide-side-card-heading">
                    <Waves size={16} />
                    <div>
                      <b>모라항 조석 정보</b>
                      <small>참고용 지역 예보</small>
                    </div>
                  </div>
                  <div className="tide-level">
                    <div>
                      <span>현재 조위</span>
                      <b>
                        0.82 <small>m</small>
                      </b>
                    </div>
                    <div className="tide-level-graphic">
                      <i />
                    </div>
                    <span className="tide-range">
                      <b>간조</b> 01:42 <b>만조</b> 07:55
                    </span>
                  </div>
                  <p>조석 예보는 현장 관측 기록과 별도로 제공됩니다.</p>
                </section>
                <button
                  className="tide-handover-link"
                  onClick={() => navigate(site.host + '/handover')}
                >
                  <FileText size={17} />
                  <span>
                    <small>자원봉사자 인계 자료</small>
                    <b>야간 교대 기록 확인</b>
                  </span>
                  <ArrowRight size={15} />
                </button>
                <div className="tide-method-note">
                  <b>기록 원칙</b>
                  <p>직접 관찰한 내용, 문서로 확인한 내용, 확인이 필요한 내용을 구분합니다.</p>
                </div>
              </aside>
            </div>
          </div>
        </main>
      ) : (
        <main className="tide-document-page">
          <div className="tide-breadcrumb">
            기록실 <span>/</span> 자원봉사 운영 <span>/</span> 교대 기록
          </div>
          <article className="tide-document">
            <div className="tide-document-topline">
              <span className="tide-eyebrow">VOLUNTEER HANDOVER / TIDE WATCH</span>
              <span>기록 양식 · 공개</span>
            </div>
            <h1>{page.title}</h1>
            <p className="tide-document-intro">{page.intro}</p>
            <dl className="tide-handover-meta">
              <div>
                <dt>자료 분류</dt>
                <dd>관측 지원 · 인수인계</dd>
              </div>
              <div>
                <dt>게시 일자</dt>
                <dd>2031.10.01</dd>
              </div>
              <div>
                <dt>열람 범위</dt>
                <dd>시민 관측 참여자</dd>
              </div>
            </dl>
            <div className="tide-handover-callout">
              <b>다음 근무자 확인 사항</b>
              <span>기관 운영 안내와 날짜별 현장 기록을 함께 확인해 주세요.</span>
            </div>
            <div className="tide-entry-copy">
              {page.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <footer className="tide-document-footer">
              기록실 운영 원칙: 시민 관측 기록은 출처와 작성 시각을 함께 보존합니다.
            </footer>
          </article>
        </main>
      )}

      <footer className="tide-footer">
        <b>물때 기록실</b>
        <span>모라 시민 해양관측 네트워크 · 시민 기록은 게임 내 가상 자료입니다.</span>
        <small>관측 기록은 공식 기관의 검증 자료를 대체하지 않습니다.</small>
      </footer>
    </div>
  );
}
