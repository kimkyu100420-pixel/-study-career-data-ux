const box = document.getElementById('subjects');
let selected = new Set();

function add(n = '') {
  const r = document.createElement('div');
  r.className = 'row';
  r.innerHTML = `<input class="n" placeholder="과목명" value="${n}"><input class="g" type="number" min="1" max="5" placeholder="등급"><input class="w" type="number" min="0" max="100" placeholder="오답률 %">`;
  box.appendChild(r);
}

// 요청하신 기본 5개 과목 세팅
['국어', '수학', '영어', '사회탐구', '과학탐구'].forEach(s => add(s));

document.getElementById('add').onclick = () => add();

document.querySelectorAll('#chips button').forEach(b => {
  b.onclick = () => {
    b.classList.toggle('sel');
    if (b.classList.contains('sel')) {
      selected.add(b.dataset.v);
    } else {
      selected.delete(b.dataset.v);
    }
  };
});

document.getElementById('analyze').onclick = async () => {
  const subjects = [...document.querySelectorAll('.row')]
    .map(r => ({
      name: r.querySelector('.n').value.trim(),
      grade: Number(r.querySelector('.g').value),
      wrong: Number(r.querySelector('.w').value) || 0
    }))
    .filter(x => x.name && Number.isFinite(x.grade));

  if (!subjects.length) return alert('과목명과 등급을 하나 이상 입력해 주세요.');

  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjects,
      studyTime: Number(document.getElementById('time').value) || 0,
      interests: [...selected]
    })
  }).then(x => x.json());

  document.getElementById('summary').textContent = `평균 학습시간 ${r.studyTime}시간 · ${r.subjects.length}과목 분석`;
  document.getElementById('rec').textContent = r.recommendation;
  document.getElementById('bars').innerHTML = r.subjects.map(s => `
    <div class="bar">
      <div class="barhead"><span>${s.name}</span><span>우선순위 점수: ${s.priority}%</span></div>
      <div class="bg"><div class="fill" style="width:${s.priority}%"></div></div>
    </div>
  `).join('');
  document.getElementById('keys').innerHTML = (r.keywords.length ? r.keywords : ['관심 분야를 선택해 보세요'])
    .map(k => `<span class="key">${k}</span>`).join('');
};
