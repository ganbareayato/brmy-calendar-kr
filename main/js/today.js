import { loadEvents } from './calendar.js';

document.addEventListener('DOMContentLoaded', async function () {  
  const eventList = await loadEvents();
  const todayEl = document.getElementById('today');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 이번 달 데이터만
  // 이번 달에 걸쳐 있는 이벤트 필터링
  const thisMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  const thisMonthEvents = eventList.filter(ev => {
    if (ev.subtype.includes('bd')) return false; //생일 제외
    if (ev.classNames.includes('gacha-point')) return false; //가챠종료포인트 제외
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return start <= thisMonthEnd && end >= thisMonthStart;
  });

  const today = new Date();
  const thisMonthBirthdays = eventList.filter(ev => {
    if (!ev.subtype.includes('bd')) return false; // 생일만!

    const start = new Date(ev.start);
    const end = new Date(ev.end);

    const isThisMonth = start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth();
    const notEndedYet = end >= today;

    return isThisMonth && notEndedYet;
  });

  // 2️⃣ 남은시간 표시용 HTML
  thisMonthEvents.forEach(ev => {
    const end = new Date(ev.end);
    const gachaEnd = ev.end_gacha ? new Date(ev.end_gacha) : end;
    const eventDiv = document.createElement('div');

    eventDiv.innerHTML = `
      <div>${ev.title} <br>이벤트 종료 <span class="event-end"></span></div>
      <div>${ev.title} <br>가챠 종료 <span class="gacha-end"></span></div>
    `;
    console.log(eventDiv)
    todayEl.querySelector('div.current-event').appendChild(eventDiv);

    // 남은시간 갱신
    setInterval(() => {
      eventDiv.querySelector('.event-end').textContent = getRemainingTime(end);
      eventDiv.querySelector('.gacha-end').textContent = getRemainingTime(gachaEnd);
    }, 1000);
  });

  // 3️⃣ 이번 달 생일
  if (thisMonthBirthdays.length > 0) {
    const bdList = thisMonthBirthdays.map(ev => `<div>${ev.title} ${new Date(ev.start).getDate()}일</div>`).join('');
    todayEl.querySelector('div.this-month-bd').insertAdjacentHTML('beforeend', `${bdList.replace(' 생일 가챠', '')}`);
  }
});

function getRemainingTime(endDateTime) {
  const now = new Date();
  const diffMs = endDateTime - now;
  if (diffMs <= 0) return "종료됨";
  const diffSec = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSec / (3600 * 24));
  const hours = Math.floor((diffSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  
  // 두 자리 숫자 형식으로 맞춤 (padStart)
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');

  return `${days}일 ${hoursStr}:${minutesStr}:${secondsStr}`;
}