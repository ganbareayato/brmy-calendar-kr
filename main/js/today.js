import { charList, loadEvents } from './calendar.js';

// today 부분에만 배너이미지 불러오면 될 것 같아서 today 쪽에 넣음
async function loadBannerImg(evId) {
  try {
    const jsonUrl =
      window.location.hostname === 'ganbareayato.github.io'
        ? 'https://json-loader.ganbato-staff.workers.dev/load?file=event_img.json'
        : './event_img.json';

    const res = await fetch(jsonUrl);
    const imgList = await res.json();
    return imgList.find(img => img.event_id === evId && img.order === 1);
  } catch (err) {
    console.error('캐릭터 리스트 불러오기 실패:', err);
  }
}

function getBdMMDDByKst(bd){
  const dateUTC = new Date(bd);

  // +9시간 보정 (KST로 변환)
  const kstTimestamp = dateUTC.getTime() + (9 * 60 * 60 * 1000);
  const dateKST = new Date(kstTimestamp);

  // MM-DD 형식으로 뽑기
  const month = String(dateKST.getMonth() + 1).padStart(2, '0'); // getMonth()는 0부터 시작
  const day = String(dateKST.getDate()).padStart(2, '0');

  return `${month}-${day}`;
}

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
  const daysStr = String(days).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  // return `${days}일 ${hoursStr}:${minutesStr}:${secondsStr}`;
  return {
    'days': daysStr,
    'hours': hoursStr,
    'minutes': minutesStr,
    'seconds':secondsStr
  };
}

document.addEventListener('DOMContentLoaded', async function () {  
  const eventList = await loadEvents();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

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

  // 이벤트 이미지 및 남은 시간 표시
  thisMonthEvents.forEach(async (ev, idx) => {
    const template = document.querySelector('template.current-event');
    const clone = template.content.cloneNode('true');
    
    //이벤트 이미지 추가(존재할경우)
    const bannerImg = await loadBannerImg(ev.id);
    if(bannerImg){
      clone.querySelector('img').src = `https://lh3.googleusercontent.com/d/${bannerImg.img_id}`;
      clone.querySelector('img').classList.remove('placeholder-img')
      clone.querySelector('img').classList.add('banner-img')
    }
    
    const end = new Date(ev.end);
    const gachaEnd = ev.end_gacha ? new Date(ev.end_gacha) : end;
    clone.querySelector('h3.title').textContent = ev.title;
    clone.querySelector('div.timer-wrap').classList.add(`event-${idx+1}`);
    document.querySelector('div.current-event').appendChild(clone);
    
    function updateCountdown(){
      const today = new Date();
      const timerWrap = document.querySelector(`.timer-wrap.event-${idx+1} .remaining-time`);
      let getTime;
      
      //오늘보다 종료날짜가 이후(이벤트 현재 진행 중)
      if(today < end){
        getTime = getRemainingTime(end);
        timerWrap.querySelector('span.subtitle').textContent = "이벤트 종료까지";
      }
      //오늘보다 종료날짜가 이전(이벤트끝) && 오늘보다 가챠날짜가 이후(가챠진행중)
      else if(today > end && today < gachaEnd){
        getTime = getRemainingTime(gachaEnd);
        timerWrap.querySelector('span.subtitle').textContent = "가챠 종료까지";
      }

      //getTime이 undefined(가능성 거의없지만) 보호용
      if(getTime){
        timerWrap.querySelector('.days .value').textContent = getTime.days;
        timerWrap.querySelector('.hours .value').textContent = getTime.hours;
        timerWrap.querySelector('.minutes .value').textContent = getTime.minutes;
        timerWrap.querySelector('.seconds .value').textContent = getTime.seconds;
      }

      requestAnimationFrame(updateCountdown);
    }
    updateCountdown();
  });

  // 이번 달 생일
  if (thisMonthBirthdays.length > 0) {
    thisMonthBirthdays.forEach(ev => {
      const template = document.querySelector('template.bd-char');
      const clone = template.content.cloneNode('true');

      const bdText = getBdMMDDByKst(ev.start);

      const charname = Object.entries(charList).find(([name, info]) => info.birthday === bdText);
      const sdImg = (location.hostname === 'ganbareayato.github.io')
        ? `/brmy-calendar-kr/main/img/sd/${charname[0]}.png`
        : `/main/img/sd/${charname[0]}.png`;
      clone.querySelector('.dday-wrap img').src = sdImg;

      clone.querySelector('.dday-wrap .name').innerHTML = `${ev.title.replace(' 생일 가챠', '')}`;
      clone.querySelector('.dday-wrap .birthday').textContent = getBdMMDDByKst(new Date(ev.start));
      clone.querySelector('.dday-wrap .dday').textContent = `${ev.start}`;

      //dday 계산
      const start = new Date(ev.start);
      const now = new Date();

      start.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);

      const diffMs = start - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      clone.querySelector('.dday-wrap .dday').textContent = `D${diffDays * -1}`;

      template.closest('div.bd-card-wrap').appendChild(clone);
    })
  }
});