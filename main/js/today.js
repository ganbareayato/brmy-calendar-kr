import { charList, loadEvents } from './calendar.js';

// 테스트용
// const clock = sinon.useFakeTimers(new Date('2025-06-23T14:59:59'));
// document.querySelector('.testBtn').addEventListener('click', ()=> {
//   sinon.clock.tick(1000); // 1초 앞으로
// })


//특정 시간마다 렌더링 체크용
const watchTimes = ['00:00', '13:00', '15:00', '16:00', '18:00', '20:00', '21:00'];
let lastRenderTime = '';

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
  // if (diffMs <= 0) return "종료됨";
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

function getFormattedDateTime(time) {
  const date = new Date(time);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0~11
  const dd = String(date.getDate()).padStart(2, '0');

  const weekDayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const day = weekDayNames[date.getDay()]; // 요일 (0=일)

  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}(${day}) ${hh}:${min}`;
}


async function loadThisMonthData(){
  const eventList = await loadEvents();

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // 이번 달에 걸쳐 있는 이벤트 필터링
  const thisMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0);
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  
  const thisMonthEvents = eventList
  .filter(ev => {
    // if (ev.subtype.includes('bd')) return false; //생일 제외
    if (ev.classNames.includes('gacha-point')) return false; //가챠종료포인트 제외
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    return start <= thisMonthEnd && end >= thisMonthStart;
  })
  .sort((a, b) => { //종료 날짜 순서대로 로드하게
    const endA = new Date(a.bdCampaignEnd || a.end);
    const endB = new Date(b.bdCampaignEnd || b.end);
    return endA - endB;
  });
  
  const thisMonthBirthdays = eventList.filter(ev => {
    if (!ev.subtype.includes('bd')) return false; // 생일만!

    const start = new Date(ev.start);
    const end = new Date(ev.end);
    
    const isThisMonth = start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth();
    const isSameMonth = end.getFullYear() === today.getFullYear() && end.getMonth() === today.getMonth();
    const notEndedYet = isSameMonth || end >= today;

    return isThisMonth && notEndedYet;
  });

  return {thisMonthEvents, thisMonthBirthdays};
}

function renderBirthdayCards(thisMonthBirthdays, onlyUpdate = false){
  const now = new Date();

  // 전달 막날 -> 1일 넘길 때 dday 카드 삭제
  const isFirstDay = now.getDate() === 1;
  
  if (isFirstDay && onlyUpdate) {
    document.querySelector('.bd-char-wrap').innerHTML = '';
  }
  
  // 생일란 dday 카드 생성
  if (thisMonthBirthdays.length > 0) {
    thisMonthBirthdays.forEach(ev => {
      if(!ev.classNames.includes('bd-campaign')){ //캠페인은 dday에 띄워주면 안되니까 if문처리
        const template = document.querySelector('#bd-char-template');
        const clone = template.content.cloneNode('true');

        const bdText = getBdMMDDByKst(ev.start);
        const charname = Object.entries(charList).find(([name, info]) => info.birthday === bdText);
        const sdImg = (location.hostname === 'ganbareayato.github.io')
          ? `/brmy-calendar-kr/main/img/sd/${charname[0]}.png`
          : `/main/img/sd/${charname[0]}.png`;
        clone.querySelector('.dday-wrap img').src = sdImg;
        clone.querySelector('.dday-wrap').classList.add(`event-${ev.id}`)
  
        clone.querySelector('.dday-wrap .name').innerHTML = `${ev.title.replace(' 생일 가챠', '')}`;
        clone.querySelector('.dday-wrap .birthday').textContent = getBdMMDDByKst(new Date(ev.start));
        clone.querySelector('.dday-wrap .dday').textContent = `${ev.start}`;
        clone.querySelector('.dday-wrap').classList.add(charname[0]);
        clone.querySelector('.dday-wrap').style.setProperty('--char-color', charname[1].color);
        //dday 계산
        const start = new Date(ev.start);
  
        start.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
  
        const diffMs = start - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
        if(diffDays === 0){
          clone.querySelector('.dday-wrap .dday').textContent = `D-day`;
          if(!clone.querySelector('.dday-wrap').classList.contains('bd-dday'))
            clone.querySelector('.dday-wrap').classList.add('bd-dday')
        } else {
          let addPlus = '';
          if( diffDays < 0 ) addPlus = '+';
          clone.querySelector('.dday-wrap .dday').textContent = `D${addPlus}${diffDays * -1}`;
          if(clone.querySelector('.dday-wrap').classList.contains('bd-dday'))
            clone.querySelector('.dday-wrap').classList.remove('bd-dday');
        }
        
        const existCardWrap = document.querySelector(`div.bd-char-wrap .dday-wrap.event-${ev.id}`)

        //카드를 삭제했으면 넘어간달 1일의 dday도 추가해줘야겟죠

        // dday 카드 없으면 카드 추가
        if(!existCardWrap)
          document.querySelector('div.bd-char-wrap').appendChild(clone);
        // 카드 있으면 D-day 갱신
        if (existCardWrap && onlyUpdate) {
          const ddayCard = document.querySelector(`div.bd-char-wrap .dday-wrap.event-${ev.id}`);
          if(ddayCard){
            if(diffDays === 0){
              ddayCard.querySelector('.dday').textContent = `D-day`;
              if(!ddayCard.classList.contains('bd-dday'))
                ddayCard.classList.add('bd-dday')
            } else {
              let addPlus = '';
              if( diffDays < 0 ) addPlus = '+';
              ddayCard.querySelector('.dday').textContent = `D${addPlus}${diffDays * -1}`;
              if(ddayCard.classList.contains('bd-dday'))
                ddayCard.classList.remove('bd-dday');
            }
          }
        }
      }
    })
  }
}

// 이벤트 이미지 및 남은 시간 표시
async function renderToday(thisMonthEvents){
  thisMonthEvents.forEach(async (ev) => {
    const isBd = ev.subtype.includes('bd');

    const template = document.querySelector('#current-event-template');
    const clone = template.content.cloneNode('true');
    
    // 이벤트 이미지 추가(존재할경우)
    const bannerImg = await loadBannerImg(ev.id);
    if(bannerImg){
      const img = document.createElement('img');
      img.src = `https://lh3.googleusercontent.com/d/${bannerImg.img_id}`;
      img.classList.add('banner-img');

      clone.querySelector('div.card-wrap').prepend(img);
    }
    
    const start = ev.start_campaign ? new Date(ev.start_campaign) : new Date(ev.start);
    const end = ev.end_campaign ? new Date(ev.end_campaign) : new Date(ev.end);
    const gachaEnd = ev.end_gacha ? new Date(ev.end_gacha) : end;
    clone.querySelector('h3.title').textContent = ev.title;
    clone.querySelector('div.timer-wrap').classList.add(`event-${ev.id}`);
    if(ev.subtype){
      let typeClass = '';
      if(ev.classNames.includes('bd-campaign')) typeClass = "bd-campaign";
      else if(ev.classNames.includes('bd-gacha')) typeClass = "bd-gacha";

      if(typeClass) 
        clone.querySelector('div.timer-wrap').classList.add(typeClass);
    }
        
    const now = new Date();
    const isEvent = start <= now && now < end;
    const isGacha = end <= now && now < gachaEnd;
    const isBeforeEvent = start > now;

    //생일 캠페인/가챠 및 일반이벤트 조건에 맞을 때만 append(중복append 방지)
    const container = document.querySelector('div.current-event-wrap');
    if(isBd){
      const existCampaignCard = document.querySelector(`.timer-wrap.event-${ev.id}.bd-campaign`);
      const existGachaCard = document.querySelector(`.timer-wrap.event-${ev.id}.bd-gacha`);

      if (ev.classNames.includes('bd-campaign') && !existCampaignCard && (isEvent || isGacha)) {
        container.appendChild(clone);
      } else if (ev.classNames.includes('bd-gacha') && !existGachaCard && (isEvent || isGacha)) {
        container.appendChild(clone);
      }
    } else{
      const existCardWrap = document.querySelector(`.timer-wrap.event-${ev.id}:not(.bd-campaign):not(.bd-gacha)`);
      //조건에 안 맞는 날짜면 appendChild 방지
      if( !existCardWrap && (isEvent || isGacha || isBeforeEvent) ){
        container.appendChild(clone);
      }
    }
    

    // ----------------------------- 카운트다운 함수 위치 ----------------------------- //

    async function updateCountdown(){
      // 카운트다운 내부에서 다시 now 및 조건문 선언(이벤트 카드바 실시간 교체)
      const now = new Date();
      const isEvent = start <= now && now < end;
      const isGacha = end <= now && now < gachaEnd;
      const isBeforeEvent = start > now;
      let getTime;
      
      const isBdCampaign = ev.classNames.includes('bd-campaign');
      const isBdGacha = ev.classNames.includes('bd-gacha');
      
      // watchTimes 내부 시간 정시에 한번만 렌더링, watchTimes는 최상단선언
      const currentTimeStr = now.toTimeString().slice(0,5); // "HH:MM"
      if (watchTimes.includes(currentTimeStr) && lastRenderTime !== currentTimeStr) {
        const { thisMonthEvents, thisMonthBirthdays } = await loadThisMonthData(); // 새로 로드!
        renderToday(thisMonthEvents);
        if(currentTimeStr == "00:00"){
          renderBirthdayCards(thisMonthBirthdays, true); //디데이카드는 00시에만 로드
          // 월 넘어갔을 때 00시 00분에 달력 넘김
          if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
            const todayButton = document.querySelector('.fc-today-button');
            if (todayButton) todayButton.click();
          }
        }
        lastRenderTime = currentTimeStr;

      }
      
      if( isBeforeEvent || isEvent||isGacha ){
        let timerWrap;
        if(isBdCampaign)
          timerWrap = document.querySelector(`.timer-wrap.event-${ev.id}.bd-campaign .remaining-time`);
        else if(isBdGacha)
          timerWrap = document.querySelector(`.timer-wrap.event-${ev.id}.bd-gacha .remaining-time`);
        else
          timerWrap = document.querySelector(`.timer-wrap.event-${ev.id} .remaining-time`);
                
        const subtitle = timerWrap?.querySelector('span.subtitle');
        //이벤트가 생일일 경우 로직
        if(isBd){
          if(isBdCampaign && isEvent){
            getTime = getRemainingTime(end);
            if(subtitle)
              subtitle.textContent = "생일 캠페인 종료까지";
          } else if (isBdGacha && (isEvent || isGacha)) {
            getTime = getRemainingTime(gachaEnd);
            if(subtitle)
              subtitle.textContent = "생일 가챠 종료까지";
          }
          if (!isEvent && isGacha) {
            // 캠페인 끝, 가챠만 진행 중
            const campaignCard = document.querySelector(`.timer-wrap.event-${ev.id}.bd-campaign`);
            if (campaignCard) campaignCard.remove();
          } else if(!isEvent && !isGacha) {
            // 둘 다 끝난 경우
            const gachaCard = document.querySelector(`.timer-wrap.event-${ev.id}.bd-gacha`);
            if (gachaCard) gachaCard.remove();
          }

        //일반 이벤트 로직
        } else {
          //이벤트 시작 예정일 때
          if(isBeforeEvent){
            getTime = getRemainingTime(start);
            const startTime = getFormattedDateTime(start);
            subtitle.textContent = `이벤트 시작까지: ${startTime}`;
          }
          //시작날짜가 오늘보다 이전, 오늘보다 종료날짜가 이후(이벤트 현재 진행 중)
          else if(isEvent){
            getTime = getRemainingTime(end);
            const endTime = getFormattedDateTime(end);
            subtitle.textContent = `이벤트 종료까지: ${endTime}`;
          }
          //오늘보다 종료날짜가 이전(이벤트끝) && 오늘보다 가챠날짜가 이후(가챠진행중)
          else if(isGacha){
            getTime = getRemainingTime(gachaEnd);
            const endTime = getFormattedDateTime(gachaEnd);
            subtitle.textContent = `가챠 종료까지: ${endTime}`;
          }
        }
  
        
        //getTime이 undefined(가능성 거의없지만) 보호용
        if(timerWrap && getTime){
          const bdCampaignTimerWrap = document.querySelector(`.timer-wrap.event-${ev.id}.bd-campaign .remaining-time`);
          const bdGachaTimerWrap = document.querySelector(`.timer-wrap.event-${ev.id}.bd-gacha .remaining-time`);
          if(isBd){
            if(isBdGacha && bdGachaTimerWrap){
              bdGachaTimerWrap.querySelector('.days .value').textContent = getTime.days;
              bdGachaTimerWrap.querySelector('.hours .value').textContent = getTime.hours;
              bdGachaTimerWrap.querySelector('.minutes .value').textContent = getTime.minutes;
              bdGachaTimerWrap.querySelector('.seconds .value').textContent = getTime.seconds;
            } else if (isBdCampaign && bdCampaignTimerWrap) {
              bdCampaignTimerWrap.querySelector('.days .value').textContent = getTime.days;
              bdCampaignTimerWrap.querySelector('.hours .value').textContent = getTime.hours;
              bdCampaignTimerWrap.querySelector('.minutes .value').textContent = getTime.minutes;
              bdCampaignTimerWrap.querySelector('.seconds .value').textContent = getTime.seconds;
            }
          } else{
            timerWrap.querySelector('.days .value').textContent = getTime.days;
            timerWrap.querySelector('.hours .value').textContent = getTime.hours;
            timerWrap.querySelector('.minutes .value').textContent = getTime.minutes;
            timerWrap.querySelector('.seconds .value').textContent = getTime.seconds;
          }
        }
  
      } else {
        //가챠날짜 이후 (이벤트, 가챠 모두 끝), 혹은 생일일 시 캠페인/가챠 처리
        const timerCard = document.querySelector(`.timer-wrap.event-${ev.id}`);

        if(timerCard){
          if(isBd){
            const gachaCard = document.querySelector(`.timer-wrap.event-${ev.id}.bd-gacha`);
            const campaignCard = document.querySelector(`.timer-wrap.event-${ev.id}.bd-campaign`);
            // ev.classNames에 bd-gacha가 있을 때만 삭제
            if (ev.classNames.includes('bd-gacha') && gachaCard) gachaCard.remove();

            // ev.classNames에 bd-campaign이 있을 때만 삭제
            if (ev.classNames.includes('bd-campaign') && campaignCard) campaignCard.remove();
          }
          else{
            timerCard.remove();
          }
        }
      }
      requestAnimationFrame(updateCountdown);
    }
    updateCountdown();
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  const { thisMonthEvents, thisMonthBirthdays } = await loadThisMonthData();

  renderToday(thisMonthEvents);
  renderBirthdayCards(thisMonthBirthdays);
});