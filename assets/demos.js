(() => {
  const seedResults = document.querySelector('#seed-results');
  const ledgerResults = document.querySelector('#ledger-results');
  if (!seedResults || !ledgerResults) return;
  const initialNotes = [
    { title: '입력 순서 살펴보기', body: '입력 순서에 맞춰 안내 문구가 나타나는지 살펴봅니다.', tags: '관찰 입력' },
    { title: '저장 흐름 살펴보기', body: '입력한 내용과 저장한 내용을 다시 확인하는 흐름을 정리합니다.', tags: '저장 흐름' },
    { title: '빈 입력 살펴보기', body: '입력 내용이 비어 있을 때 필요한 안내를 정리합니다.', tags: '예외 입력' },
  ];
  let notes = initialNotes.map(note => ({ ...note }));
  const initialJobs = [
    { title: '작업 A', state: 'pending' },
    { title: '작업 B', state: 'exception' },
    { title: '작업 C', state: 'reviewed' },
  ];
  let jobs = initialJobs.map(job => ({ ...job }));
  const labels = { pending: '검토 대기', exception: '예외 확인', reviewed: '검토 완료' };
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
    const query = search.value.trim().normalize('NFC').toLocaleLowerCase('ko');
    const shown = notes.filter(note => `${note.title} ${note.body} ${note.tags}`.normalize('NFC').toLocaleLowerCase('ko').includes(query));
    seedResults.replaceChildren(...shown.map(note => card(note.title, note.body, note.tags)));
    document.querySelector('#seed-feedback').textContent = shown.length ? '메모를 표시했습니다.' : '검색 결과 없음';
  };
  const renderLedger = () => {
    const shown = jobs.filter(job => filter.value === 'all' || job.state === filter.value);
    ledgerResults.replaceChildren(...shown.map(job => card(job.title, `상태: ${labels[job.state]}`, '작업 상태')));
    document.querySelector('#ledger-feedback').textContent = shown.length ? '선택한 상태의 작업을 표시했습니다.' : '현재 조건에 맞는 작업이 없습니다.';
  };
  search.addEventListener('input', renderSeed);
  document.querySelector('#seed-add').addEventListener('click', () => {
    if (!notes.some(note => note.tags === '추가 메모')) notes.push({ title: '검토 메모 추가', body: '새 메모를 추가한 뒤 목록과 검색 결과를 확인합니다.', tags: '추가 메모' });
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
    const feedback = document.querySelector('#ledger-feedback');
    const hidden = filter.value !== 'all' && filter.value !== jobs[0].state;
    feedback.textContent = `작업 A: ${labels[jobs[0].state]}로 변경했습니다. ${hidden ? '작업 A는 현재 필터에서 숨겨져 있습니다. ' : ''}${feedback.textContent}`;
  });
  document.querySelector('#ledger-reset').addEventListener('click', () => {
    jobs = initialJobs.map(job => ({ ...job }));
    filter.value = 'all';
    renderLedger();
  });
  renderSeed();
  renderLedger();
})();
