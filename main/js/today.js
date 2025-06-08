import { charList, loadEvents, cardList } from './calendar.js';
// 테스트용
// const clock = sinon.useFakeTimers(new Date('2025-06-25T15:59:59'));
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

function getFormattedDateTime(time, setSec = false) {
  const date = new Date(time);
  if(setSec)
    date.setSeconds(date.getSeconds() - 1);

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
    
    const start = ev.start_campaign ? new Date(ev.start_campaign) : new Date(ev.start);
    let end = ev.end_campaign ? new Date(ev.end_campaign) : new Date(ev.end);
    const gachaEnd = ev.end_gacha ? new Date(ev.end_gacha) : end;

    clone.querySelector('h3.title').textContent = ev.title;
    clone.querySelector('div.timer-wrap').classList.add(`event-${ev.id}`);
        
    const now = new Date();
    // 생일은 이벤트 시작까지~ 붙여줄 이유 없으니까 그냥 아예 false 처리한것임
    const isBeforeEvent = !isBd && (start > now);
    const isEvent = start <= now && now < end;
    const isGacha = end <= now && now < gachaEnd;

    //생일 캠페인/가챠 및 일반이벤트 조건에 맞을 때만 append(중복append 방지)
    const container = document.querySelector('div.current-event-wrap');
    const existCardWrap = document.querySelector(`.timer-wrap.event-${ev.id}`);
    if (!existCardWrap && (isBeforeEvent || isEvent || isGacha))
      container.appendChild(clone);
        
    const subtitleEvent = container.querySelector(`.timer-wrap.event-${ev.id} span.subtitle-event`);
    const subtitleGacha = container.querySelector(`.timer-wrap.event-${ev.id} span.subtitle-gacha`);
    if(subtitleEvent || subtitleGacha){
      if(isBd){
        subtitleEvent.textContent = `캠페인 종료: ${getFormattedDateTime(end, true)}`;
        subtitleGacha.textContent = `가챠 종료: ${getFormattedDateTime(gachaEnd, true)}`;
      }
      else{
        subtitleEvent.textContent = `이벤트 종료: ${getFormattedDateTime(end)}`;
        subtitleGacha.textContent = `가챠 종료: ${getFormattedDateTime(gachaEnd)}`;
      }
    }

    // 카페바 이벤트 시프트 계산 로직
    const subtitleNow = container.querySelector(`.event-${ev.id} span.subtitle-now`);
    let checkShiftDate = null;
    if( ev.classNames.includes("type-cafe") && now < gachaEnd ){
      subtitleNow.classList.add('subtitle-cafe')
      const cafeCardList = cardList.filter(el => el['event_id'] === ev.id);
      let cafeShift = {
        1: cafeCardList.find(el => el['source'] === 'reward'),
        2: cafeCardList.find(el => el['rarity'] === 'ssr' && el['order'] == 1),
        3: cafeCardList.find(el => el['rarity'] === 'ssr' && el['order'] == 2),
        4: cafeCardList.find(el => el['rarity'] === 'ssr' && el['order'] == 3),
      }

      for (const key in cafeShift){
        cafeShift[key] = charList[cafeShift[key].char_id].name;
      }

      for(let i=1; i<=4; i++){
        const checkShiftStart = new Date(start);
        checkShiftStart.setDate( start.getDate() + (i*4) )
        if(now < checkShiftStart){
          subtitleNow.textContent = `${cafeShift[i]} 시프트 중・다음 시프트까지`
          subtitleNow.classList.add('subtitle-cafe')
          if(i==4) {
            subtitleNow.textContent = `${cafeShift[i]} 시프트 중・이벤트 종료까지`
          }
          checkShiftDate = new Date(checkShiftStart)
          break;
        }
      }
    }
    

    // ----------------------------- 카운트다운 함수 위치 ----------------------------- //

    async function updateCountdown(){
      // 카운트다운 내부에서 다시 now 및 조건문 선언(이벤트 카드바 실시간 교체)
      const now = new Date();
      const isBeforeEvent = start > now;
      const isEvent = start <= now && now < end;
      const isGacha = end <= now && now < gachaEnd;
      let getTime;
      
      // watchTimes 내부 시간 정시에 한번만 렌더링, watchTimes는 최상단선언
      const currentTimeStr = now.toTimeString().slice(0,5); // "HH:MM"
      if (watchTimes.includes(currentTimeStr) && lastRenderTime !== currentTimeStr) {
        const { thisMonthEvents, thisMonthBirthdays } = await loadThisMonthData(); // 새로 로드!
        await renderToday(thisMonthEvents, thisMonthBirthdays);
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
      
      if( isBeforeEvent || isEvent || isGacha ){
        const  timerWrap = document.querySelector(`.timer-wrap.event-${ev.id} .remaining-time`);
                
        //이벤트가 생일일 경우 로직
        const subtitleNow = timerWrap?.querySelector('span.subtitle-now');

        if(isBd){
          if(isEvent){
            if(subtitleNow)
              subtitleNow.textContent = "생일 캠페인 종료까지";
            getTime = getRemainingTime(end);
          } else if (isGacha) {
            if(subtitleNow)
              subtitleNow.textContent = "가챠 종료까지";
            if(subtitleEvent && !subtitleEvent.classList.contains('hidden'))
              subtitleEvent.classList.add('hidden');
            getTime = getRemainingTime(gachaEnd);
          }

        //일반 이벤트 로직
        } else {
          if(subtitleNow || subtitleEvent || subtitleGacha){
            //이벤트 시작 예정일 때
            if(isBeforeEvent){
              getTime = getRemainingTime(start);
              const startTime = getFormattedDateTime(start, false);
              subtitleNow.textContent = `이벤트 시작까지: ${startTime}`;
            }
            //시작날짜가 오늘보다 이전, 오늘보다 종료날짜가 이후(이벤트 현재 진행 중)
            else if(isEvent){
              if(checkShiftDate) getTime = getRemainingTime(checkShiftDate);
              else getTime = getRemainingTime(end);
              if(!subtitleNow.classList.contains('subtitle-cafe'))
              subtitleNow.textContent = `이벤트 종료까지`;
            }
            //오늘보다 종료날짜가 이전(이벤트끝) && 오늘보다 가챠날짜가 이후(가챠진행중)
            else if(isGacha){
              getTime = getRemainingTime(gachaEnd);
              subtitleNow.textContent = `가챠 종료까지`;
              if(subtitleEvent && !subtitleEvent.classList.contains('hidden'))
                subtitleEvent.classList.add('hidden');
            }
          }
        }
  
        
        //getTime이 undefined(가능성 거의없지만) 보호용
        if(timerWrap && getTime){
          timerWrap.querySelector('.days .value').textContent = getTime.days;
          timerWrap.querySelector('.hours .value').textContent = getTime.hours;
          timerWrap.querySelector('.minutes .value').textContent = getTime.minutes;
          timerWrap.querySelector('.seconds .value').textContent = getTime.seconds;
        }
  
      } else {
        //가챠날짜 이후 (이벤트, 가챠 모두 끝), 혹은 생일일 시 캠페인/가챠 처리
        const timerCard = document.querySelector(`.timer-wrap.event-${ev.id}`);

        if(timerCard)
          timerCard.remove();
        
      }
      requestAnimationFrame(updateCountdown);
    }
    updateCountdown();

    // 이벤트 이미지 추가(존재할경우)
    const bannerImg = await loadBannerImg(ev.id);
    if(bannerImg){
      const imgWrap = container.querySelector(`.timer-wrap.event-${ev.id} div.imgWrap`);
      if(imgWrap){
        const img = imgWrap.querySelector(`img`);
        if(img){
          img.src = `https://lh3.googleusercontent.com/d/${bannerImg.img_id}`;
          img.loading = "eager";
          // img.classList.add('banner-img');
          if(imgWrap.classList.contains('dummy-img'))
            imgWrap.classList.remove('dummy-img');
          if(img.classList.contains('placeholder-img'))
            img.classList.remove('placeholder-img');
        }
      }
    } else {
      const imgWrap = container.querySelector(`.timer-wrap.event-${ev.id} div.imgWrap`);
      imgWrap?.remove();
    }
  });
}

export async function loadToday(){
  const { thisMonthEvents, thisMonthBirthdays } = await loadThisMonthData();

  renderToday(thisMonthEvents);
  document.querySelectorAll('.dummy-data').forEach(dummy => dummy.remove());

  renderBirthdayCards(thisMonthBirthdays);
  document.body.classList.remove('loading-page');
}