import {
  ArrowRight,
  Clock3,
  Database,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import type { Site, SitePage } from '../../game/world';

const verificationSteps = [
  { number: '01', title: '공개본 변경 이력', icon: Clock3 },
  { number: '02', title: '센서 원본 대조', icon: Database },
  { number: '03', title: '승인 기록 확인', icon: FileCheck2 },
];

export function ArchiveSite({
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
    <div className="virtual-site archive-portal">
      <div className="archive-utility">
        <span>INDEPENDENT DATA CUSTODY</span>
        <span>
          보존 정책 <i /> 기록 상태 공개
        </span>
      </div>
      <header className="archive-masthead">
        <div className="archive-brand">
          <span className="archive-brand-mark">
            <Database size={22} />
          </span>
          <span>
            <small>MARINE RECORDS REPOSITORY</small>
            <strong>독립 해양기록원</strong>
          </span>
        </div>
        <div className="archive-integrity-status">
          <ShieldCheck size={17} />
          <span>
            <small>보존 시스템</small>
            <b>정상 운영</b>
          </span>
        </div>
      </header>
      <nav className="archive-nav" aria-label="독립 해양기록원 메뉴">
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
        <span className="archive-nav-caption">MORA COLLECTION / 2031</span>
      </nav>
      <div className="archive-integrity-strip">
        <span>
          <i />
          원본 수신·보존 서비스 가동
        </span>
        <span>공개 목록과 접근 권한은 별도로 관리됩니다.</span>
      </div>

      {isHome ? (
        <main className="archive-main">
          <section className="archive-hero">
            <div className="archive-hero-copy">
              <span className="archive-eyebrow">INDEPENDENT MARINE RECORDS</span>
              <h1>{page.title}</h1>
              <p>{page.intro}</p>
            </div>
            <div className="archive-seal-card">
              <div className="archive-seal-icon">
                <Fingerprint size={21} />
              </div>
              <span>RECORD INTEGRITY</span>
              <b>수신 원본 보존</b>
              <small>기관 공개본과 분리 저장 · 변경 이력 기록</small>
              <div className="archive-seal-status">
                <i />
                <span>보존 정책 적용 중</span>
              </div>
            </div>
          </section>

          <div className="archive-content">
            <section className="archive-catalog-section">
              <div className="archive-section-heading">
                <div>
                  <span className="archive-eyebrow">PUBLIC CATALOG</span>
                  <h2>자료 목록</h2>
                </div>
                <span>컬렉션 MORA / 2031.10</span>
              </div>
              <div className="archive-record-list">
                <div className="archive-record-row">
                  <span className="archive-record-icon public">
                    <FileCheck2 size={17} />
                  </span>
                  <span className="archive-record-name">
                    <b>기관 공개 수질 보고서</b>
                    <small>해온 해양관측소 · 2031.10.17 · 발행본</small>
                  </span>
                  <span className="archive-access public">공개</span>
                  <span className="archive-record-code">PUB / HAO</span>
                </div>
                <div className="archive-record-row">
                  <span className="archive-record-icon sealed">
                    <Database size={17} />
                  </span>
                  <span className="archive-record-name">
                    <b>자동 센서 원본 스트림</b>
                    <small>연안 관측 자료 · 수신 시각·원본 메타데이터 포함</small>
                  </span>
                  <span className="archive-access restricted">
                    <LockKeyhole size={11} />
                    권한 확인
                  </span>
                  <span className="archive-record-code">SEALED / RAW</span>
                </div>
                <div className="archive-record-row">
                  <span className="archive-record-icon history">
                    <Clock3 size={17} />
                  </span>
                  <span className="archive-record-name">
                    <b>승인 및 변경 이력</b>
                    <small>발행 이력 · 검수 기록 · 관계 문서 색인</small>
                  </span>
                  <span className="archive-access indexed">색인됨</span>
                  <span className="archive-record-code">LOG / INDEX</span>
                </div>
              </div>
            </section>

            <div className="archive-home-grid">
              <article className="archive-policy-card">
                <span className="archive-eyebrow">RETENTION POLICY</span>
                <h2>원본과 발행본은 따로 보존합니다</h2>
                {page.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </article>
              <aside className="archive-access-card">
                <div className="archive-access-heading">
                  <LockKeyhole size={16} />
                  <b>접근 통제 안내</b>
                </div>
                <p>
                  개별 보관 위치와 인증 정보는 공개 카탈로그에 표시하지 않습니다. 권한이 있는 감사
                  업무는 해당 기관의 인계 자료를 확인해 주세요.
                </p>
                <button onClick={() => navigate(site.host + '/guide')}>
                  검증 절차 보기
                  <ArrowRight size={14} />
                </button>
              </aside>
            </div>
          </div>
        </main>
      ) : (
        <main className="archive-document-page">
          <div className="archive-breadcrumb">
            자료 목록 <span>/</span> 검증 지원 <span>/</span> 증거 검증 안내
          </div>
          <article className="archive-document">
            <div className="archive-document-topline">
              <span className="archive-eyebrow">EVIDENCE REVIEW / PROCEDURE</span>
              <span>REV 2.1 · 2031.10</span>
            </div>
            <h1>{page.title}</h1>
            <p className="archive-document-intro">{page.intro}</p>
            <div className="archive-guide-meta">
              <span>
                <b>절차 코드</b>
                MRA-VERIFY-03
              </span>
              <span>
                <b>적용 범위</b>
                공개 기록 및 보존 원본
              </span>
              <span>
                <b>검토 원칙</b>
                출처·시각·권한 분리
              </span>
            </div>
            <div className="archive-verification-steps">
              {verificationSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <section className="archive-verification-step" key={step.number}>
                    <span className="archive-step-number">{step.number}</span>
                    <span className="archive-step-icon">
                      <Icon size={16} />
                    </span>
                    <div>
                      <h2>{step.title}</h2>
                      <p>{page.paragraphs[index]}</p>
                    </div>
                  </section>
                );
              })}
            </div>
            <section className="archive-submission-note">
              <span className="archive-eyebrow">REVIEW OUTCOME</span>
              {page.paragraphs.slice(3).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
            <footer className="archive-document-footer">
              <ShieldCheck size={14} />
              자료 보존·검증 원칙은 개별 사건의 결론과 분리해 적용됩니다.
            </footer>
          </article>
        </main>
      )}

      <footer className="archive-footer">
        <b>독립 해양기록원</b>
        <span>원본 보존과 변경 이력 검증을 위한 독립 기록 서비스</span>
        <small>본 사이트의 기록과 관측 정보는 게임 내 가상 자료입니다.</small>
      </footer>
    </div>
  );
}
