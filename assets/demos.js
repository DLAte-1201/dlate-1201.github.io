(() => {
  const seedResults = document.querySelector('#seed-results');
  const ledgerResults = document.querySelector('#ledger-results');
  if (!seedResults || !ledgerResults) return;
  const initialNotes = [
    { title: '합성 메모 · 관찰', body: '가상의 화면에서 입력 순서와 안내 문구를 비교하는 예시입니다.', tags: '관찰 입력' },
    { title: '합성 메모 · 저장', body: '실제 글을 사용하지 않고 저장 흐름의 설명을 살펴보는 예시입니다.', tags: '저장 흐름' },
    { title: '합성 메모 · 예외', body: '비어 있는 입력에 어떤 안내가 필요한지 생각해 보는 예시입니다.', tags: '예외 입력' },
  ];
  let notes = initialNotes.map(note => ({ ...note }));
  const initialJobs = [
    { title: '합성 작업 A', state: 'pending' },
    { title: '합성 작업 B', state: 'exception' },
    { title: '합성 작업 C', state: 'reviewed' },
  ];
  let jobs = initialJobs.map(job => ({ ...job }));
  const labels = { pending: '검토 대기', exception: '예외 확인', reviewed: '검토 완료 예시' };
  const search = document.querySelector('#seed-search');
  const filter = document.querySelector('#ledger-filter');
  const card = (title, body, caption) => {
    const article = document.createElement('article');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = body;
    article.append(heading, paragraph);
    if (caption) {
      const note = document.createElement('p');
      note.className = 'caption';
      note.textContent = caption;
      article.append(note);
    }
    return article;
  };
  const renderSeed = () => {
    const query = search.value.trim().toLocaleLowerCase('ko');
    const shown = notes.filter(note => `${note.title} ${note.body} ${note.tags}`.toLocaleLowerCase('ko').includes(query));
    seedResults.replaceChildren(...shown.map(note => card(note.title, note.body, note.tags)));
    document.querySelector('#seed-feedback').textContent = shown.length ? '합성 메모를 표시했습니다.' : '검색 결과 없음';
  };
  const renderLedger = () => {
    const shown = jobs.filter(job => filter.value === 'all' || job.state === filter.value);
    ledgerResults.replaceChildren(...shown.map(job => card(job.title, `상태: ${labels[job.state]}`, '금액·고객 정보 없는 합성 작업')));
    document.querySelector('#ledger-feedback').textContent = shown.length ? '선택한 합성 상태를 표시했습니다.' : '현재 조건에 맞는 합성 작업 없음';
  };
  search.addEventListener('input', renderSeed);
  document.querySelector('#seed-add').addEventListener('click', () => {
    if (!notes.some(note => note.tags === '합성 추가')) notes.push({ title: '합성 메모 · 추가 예시', body: '정해진 합성 문구를 메모 목록에 추가하는 시연입니다.', tags: '합성 추가' });
    search.value = '';
    renderSeed();
  });
  document.querySelector('#seed-reset').addEventListener('click', () => {
    notes = initialNotes.map(note => ({ ...note }));
    search.value = '';
    renderSeed();
  });
  filter.addEventListener('change', renderLedger);
  document.querySelector('#ledger-cycle').addEventListener('click', () => {
    jobs[0].state = jobs[0].state === 'pending' ? 'reviewed' : 'pending';
    renderLedger();
  });
  document.querySelector('#ledger-reset').addEventListener('click', () => {
    jobs = initialJobs.map(job => ({ ...job }));
    filter.value = 'all';
    renderLedger();
  });
  renderSeed();
  renderLedger();
})();
