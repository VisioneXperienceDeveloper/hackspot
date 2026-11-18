import { Activity, ArrowRight, FileText, Waves } from 'lucide-react';
import type { Site, SitePage } from '../../game/world';

const stations = [
  { id: 'MO-01', name: '북측 연안', status: '정상' },
  { id: 'MO-02', name: '외해 부이', status: '정상' },
  { id: 'MO-03', name: '남측 방파제', status: '정상' },
  { id: 'MO-04', name: '모라항 외측', status: '정상' },
];

const measurements = [
  { label: '수온', value: '18.4', unit: '°C' },
  { label: '염분', value: '32.1', unit: 'psu' },
  { label: '유속', value: '0.3', unit: 'm/s' },
  { label: '유의파고', value: '0.6', unit: 'm' },
];

export function HaeonSite({
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
  const isReport = page.path === '/report';
  return (
    <div className="virtual-site haeon-portal">
      <div className="haeon-utility">
        <span>모라 연안 관측망</span>
        <div>
          <span>자료 이용 안내</span>
          <span>EN</span>
        </div>
      </div>
      <header className="haeon-masthead">
        <div className="haeon-brand">
          <span className="haeon-brand-mark">
            <Waves size={26} />
          </span>
          <span>
            <small>HAEON COASTAL OBSERVATORY</small>
            <strong>해온 해양관측소</strong>
          </span>
        </div>
        <div className="haeon-operation-status">
          <span className="haeon-status-dot" />
          <span>
            <small>관측망 운영 상태</small>
            <strong>정상 운영</strong>
          </span>
        </div>
      </header>
      <nav className="haeon-nav" aria-label="해온 사이트 메뉴">
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
        <span className="haeon-nav-caption">해양 관측 자료 포털</span>
      </nav>
      <div className="haeon-live-strip">
        <span>
          <span className="haeon-live-indicator" />
          실시간 관측망 <b>4 / 4 지점 정상</b>
        </span>
        <span>최근 자료 수신 2031.10.18 08:40 KST</span>
      </div>

      {isHome ? (
        <main className="haeon-main">
          <section className="haeon-hero">
            <div className="haeon-hero-copy">
              <span className="haeon-eyebrow">MORA COASTAL OBSERVATION NETWORK</span>
              <h1>{page.title}</h1>
              <p>{page.intro}</p>
              <button onClick={() => navigate(site.host + '/report')}>
                최신 수질 보고서
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="haeon-hero-card">
              <div className="haeon-hero-card-heading">
                <Activity size={17} />
                <span>관측망 현황</span>
              </div>
              <strong>정상 운영 중</strong>
              <span>자동 관측 지점 4개 · 자료 수신 4개</span>
              <div className="haeon-hero-meter">
                <i />
              </div>
              <small>
                자료 수신율 <b>100%</b>
              </small>
            </div>
          </section>

          <div className="haeon-main-content">
            <section className="haeon-section">
              <div className="haeon-section-heading">
                <div>
                  <span className="haeon-eyebrow">LIVE OBSERVATION</span>
                  <h2>실시간 관측 현황</h2>
                </div>
                <span className="haeon-updated">2031.10.18 08:40 기준</span>
              </div>
              <div className="haeon-observation-grid">
                <div className="haeon-station-panel">
                  <div className="haeon-map" role="img" aria-label="모라 연안 관측 지점 개략도">
                    <span className="haeon-map-label">모라 연안 관측 구역 · 개략도</span>
                    <span className="haeon-map-shore" />
                    {stations.map((station, index) => (
                      <span
                        key={station.id}
                        className={`haeon-map-point point-${index + 1}`}
                        title={`${station.id} ${station.name}`}
                      />
                    ))}
                    <span className="haeon-map-port">모라항</span>
                  </div>
                  <div className="haeon-station-list" aria-label="관측 지점 목록">
                    {stations.map((station) => (
                      <div key={station.id}>
                        <b>{station.id}</b>
                        <span>{station.name}</span>
                        <small>
                          <i />
                          {station.status}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="haeon-measurement-panel">
                  <div className="haeon-panel-heading">
                    <div>
                      <b>MO-04 · 모라항 외측</b>
                      <small>연안 자동관측 부이</small>
                    </div>
                    <span>최신</span>
                  </div>
                  <div className="haeon-measurements">
                    {measurements.map((measurement) => (
                      <div key={measurement.label}>
                        <span>{measurement.label}</span>
                        <b>
                          {measurement.value}
                          <small>{measurement.unit}</small>
                        </b>
                      </div>
                    ))}
                  </div>
                  <p className="haeon-data-note">자료는 관측소 시각 기준으로 제공됩니다.</p>
                </div>
              </div>
            </section>

            <section className="haeon-section">
              <div className="haeon-section-heading">
                <div>
                  <span className="haeon-eyebrow">DATA &amp; NOTICES</span>
                  <h2>자료 및 공지</h2>
                </div>
              </div>
              <div className="haeon-resource-grid">
                <button
                  className="haeon-resource-card"
                  onClick={() => navigate(site.host + '/report')}
                >
                  <FileText size={19} />
                  <span>
                    <small>공개 보고서 · 2031.10.17</small>
                    <b>10월 17일 수질 보고서</b>
                  </span>
                  <ArrowRight size={15} />
                </button>
                <button
                  className="haeon-resource-card"
                  onClick={() => navigate(site.host + '/notice')}
                >
                  <FileText size={19} />
                  <span>
                    <small>운영 공지 · 2031.10.16</small>
                    <b>외부 감사 계정 안내</b>
                  </span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </section>

            <section className="haeon-about">
              <span className="haeon-eyebrow">ABOUT HAEON</span>
              <h2>관측 자료를 투명하게 공개합니다</h2>
              {page.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          </div>
        </main>
      ) : isReport ? (
        <main className="haeon-main haeon-document-page">
          <div className="haeon-breadcrumb">
            홈 <span>/</span> 해양자료 <span>/</span> 공개 보고서
          </div>
          <article className="haeon-document">
            <span className="haeon-eyebrow">PUBLIC WATER QUALITY REPORT</span>
            <h1>{page.title}</h1>
            <p className="haeon-document-intro">{page.intro}</p>
            <dl className="haeon-report-metadata">
              <div>
                <dt>자료 번호</dt>
                <dd>HAO-WQ-MO04-20311017</dd>
              </div>
              <div>
                <dt>관측 지점</dt>
                <dd>MO-04 · 모라항 외측</dd>
              </div>
              <div>
                <dt>자료 단위</dt>
                <dd>mg/L</dd>
              </div>
              <div>
                <dt>승인</dt>
                <dd>한기석 소장</dd>
              </div>
            </dl>
            <div className="haeon-report-notice">
              <span>공개 자료 안내</span>
              공개본은 관측소 검수 및 승인 절차를 거친 자료입니다. 측정값이 표시되지 않은 시간대는
              아래 비고를 확인해 주세요.
            </div>
            {page.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {page.table && (
              <div className="haeon-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {page.table[0].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.table.slice(1).map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="haeon-document-footer">
              자료 출처: 해온 해양관측소 · 관측소 시각(KST) 기준
            </footer>
          </article>
        </main>
      ) : (
        <main className="haeon-main haeon-document-page">
          <div className="haeon-breadcrumb">
            홈 <span>/</span> 운영 정보 <span>/</span> 운영 공지
          </div>
          <article className="haeon-document">
            <span className="haeon-eyebrow">NOTICE · HAO-OPS-20311016</span>
            <h1>{page.title}</h1>
            <p className="haeon-document-intro">{page.intro}</p>
            <div className="haeon-notice-banner">
              <b>외부 감사 담당자 안내</b>
              <span>기관 운영 시스템 접속 정보는 권한이 부여된 감사 업무에만 사용해 주세요.</span>
            </div>
            {page.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <footer className="haeon-document-footer">
              해온 해양관측소 운영지원팀 · 게시일 2031.10.16
            </footer>
          </article>
        </main>
      )}

      <footer className="haeon-footer">
        <b>해온 해양관측소</b>
        <span>모라항 관측지원센터 · 해양 자료 문의 data@haeon.test</span>
        <small>본 사이트의 관측 자료는 게임 내 가상 자료입니다.</small>
      </footer>
    </div>
  );
}
