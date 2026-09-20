const box = document.getElementById('subjects');
const scheduleBox = document.getElementById('weekly-schedule-inputs');
let selected = new Set();

const days = ['월', '화', '수', '목', '금', '토', '일'];

// 1. 과목 입력 행 추가
function addSubject(n = '') {
  const r = document.createElement('div');
  r.className = 'row';
  r.innerHTML = `
    <input class="n" placeholder="과목명" value="${n}">
    <input class="score" type="number" min="0" max="100" placeholder="점수">
    <input class="grade" type="number" min="1" max="9" placeholder="등급">
    <input class="wrong" type="number" min="0" max="100" placeholder="오답률%">
  `;
  box.appendChild(r);
}

// 기본 5개 과목 생성
['국어', '수학', '영어', '사회탐구', '과학탐구'].forEach(s => addSubject(s));
document.getElementById('add').onclick = () => addSubject();

// 2. 요일별 고정 일정 입력 폼 생성 (월~일)
days.forEach(day => {
  const div = document.createElement('div');
  div.className = 'day-input-card';
  div.innerHTML = `
    <strong>${day}요일</strong>
    <input class="academy" data-day="${day}" placeholder="학원/고정일정" style="margin-bottom: 6px;">
    <label style="font-size:11px; color:#64748b; display:block; margin-bottom:2px;">자습 시간(시간)</label>
    <input class="self-time" data-day="${day}" type="number" min="0" step="0.5" value="${day === '토' || day === '일' ? 6 : 3}">
  `;
  scheduleBox.appendChild(div);
});

// 관심 분야 버튼 토글
document.querySelectorAll('#chips button').forEach(b => {
  b.onclick = () => {
    b.classList.toggle('sel');
    if (b.classList.contains('sel')) selected.add(b.dataset.v);
    else selected.delete(b.dataset.v);
  };
});

// 분석 및 스케줄 생성 요청
document.getElementById('analyze').onclick = async () => {
  const subjects = [...document.querySelectorAll('#subjects .row')].map(r => ({
    name: r.querySelector('.n').value.trim(),
    score: Number(r.querySelector('.score').value),
    grade: Number(r.querySelector('.grade').value),
    wrong: Number(r.querySelector('.wrong').value) || 0
  })).filter(x => x.name && Number.isFinite(x.score));

  if (!subjects.length) return alert('과목명과 점수를 입력해 주세요.');

  const weeklyInput = days.map(day => {
    const ac = document.querySelector(`.academy[data-day="${day}"]`).value.trim();
    const st = Number(document.querySelector(`.self-time[data-day="${day}"]`).value) || 0;
    return { day, academy: ac || '없음', selfStudyHours: st };
  });

  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjects,
      weeklyInput,
      interests: [...selected]
    })
  }).then(x => x.json());

  // 요약 및 총평
  document.getElementById('summary').textContent = `총 주간 자습 시간: ${r.totalWeeklySelfStudyHours}시간 · ${r.subjects.length}개 과목 분석 완료`;
  document.getElementById('rec').textContent = r.recommendation;

  // 과목별 보완 우선순위
  document.getElementById('bars').innerHTML = r.subjects.map(s => `
    <div class="bar">
      <div class="barhead">
        <span>${s.name} (${s.score}점 / ${s.grade}등급 / 오답률 ${s.wrong}%)</span>
        <span style="color:#2563eb;">보완 필요도: ${s.priority}%</span>
      </div>
      <div class="bg"><div class="fill" style="width:${s.priority}%"></div></div>
      <p style="font-size:12px; color:#64748b; margin-top:2px;">💡 ${s.guide}</p>
    </div>
  `).join('');

  // 요일별 스케줄 카드 생성
  document.getElementById('weekly-plan').innerHTML = `
    <div class="weekly-grid">
      ${r.weeklyPlan.map(p => `
        <div class="schedule-card">
          <h4>${p.day}요일 <small style="font-size:11px; font-weight:normal; color:#64748b;">(${p.selfStudyHours}시간)</small></h4>
          <span class="academy-tag">🏫 ${p.academy}</span>
          <div>
            ${p.tasks.length ? p.tasks.map(t => `
              <div class="task-item">
                <span>• ${t.subject}</span>
                <span class="time">${t.time}분</span>
              </div>
            `).join('') : '<span style="color:#94a3b8; font-size:11px;">자습 시간 없음</span>'}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // 추천 키워드
  document.getElementById('keys').innerHTML = (r.keywords.length ? r.keywords : ['관심 분야를 선택해 보세요'])
    .map(k => `<span class="key">${k}</span>`).join('');
};
