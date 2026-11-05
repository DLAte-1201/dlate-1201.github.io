T5 | BLOCKED (Worker·OG·AVIF/WebP·Analytics 도구 구현 및 로컬 검증 DONE; 개발 빌드 연결·Cloudflare 실환경 미완) | https://github.com/DLAte-1201/dlate-1201.github.io/pull/1 | cd tools/site-addons && npm ci && npm test && npm run db:local && npm run check:worker; npm run build -- /tmp/t5-site-output https://reseorch-ai.com/

- 대상: `DLAte-1201/dlate-1201.github.io`, 독립 체크아웃 `/workspace/site-t5`, 브랜치 `codex/t5-site-addons`. Glance 기준 저장소는 `/workspace/glance-workspace-t5`; 앱 파일 변경 없음.
- 두 저장소 모두 `specs/current.md`, `specs/RULES.md`, `specs/FACTS.md`, `.agents/skills`, `AGENTS.md` 없음. 제공된 첨부 명세 2개를 읽고 T5만 구현.
- 검증: Node 테스트 3/3 통과. 실제 로컬 D1에 JSON/폼 문의 2건 저장 및 조회, 입력 오류·D1 오류·경로/메서드 검증. 로컬 마이그레이션 적용 성공 및 재실행 확인. Wrangler `--dry-run` 번들 성공.
- 사이트 공개 정적 파일을 `git archive HEAD`로 `/tmp/t5-site-output`에 복사해 빌드 실행: HTML 14개, 1200×630 OG PNG 14개, 원본 이미지 1개의 AVIF/WebP 생성. 합성 페이지 테스트에서 이미지 디코딩·원본 보존·대체 경로·Analytics 삽입 및 반복 실행 확인. 실제 방문/Analytics 수집·운영 D1 검증은 미실행.
- BLOCKED / 필요한 사람 액션: README가 가리키는 별도 개발 작업본과 런처 소스·빌드 명령 제공 → 기존 문의 폼 및 후처리 연결. Cloudflare 기존 계정/D1 바인딩·토큰과 등록된 Web Analytics 사이트 토큰 제공 → 소유자 배포 후 실환경 확인. DNS·Access 정책 변경 불필요.
- 머지·배포·원격 D1 변경·유료 서비스 호출·새 권한 요청 없음. 초기에 npm 캐시/로그의 기본 홈 경로 오류가 있었고 `/tmp` 캐시·XDG 경로로 해결. 존재하지 않는 Miniflare 버전 지정도 설치 전 수정했고 최종 의존성 잠금 후 테스트 통과.
