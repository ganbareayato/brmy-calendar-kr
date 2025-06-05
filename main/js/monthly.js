import { loadEvents } from './calendar.js';

document.addEventListener('DOMContentLoaded', async function () {  
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    events: await loadEvents(),
    fixedWeekCount: false,
    datesSet : () => {
      //오늘 표시 보더 달 이동해도 유지되게
      document.querySelectorAll('td.fc-day-today').forEach(td => {
        const borderDiv = document.createElement('div');
        borderDiv.classList.add('today-border');
        td.appendChild(borderDiv);
      });
    },
    // 셀 일자에서 "일" 없애기
    dayCellContent: function(arg) {
      const dayNumber = arg.dayNumberText.replace(/일/g, '');
      return { html: `<span>${dayNumber}</span>` };
    },
    // 생일 당일날 캐릭터 sd 추가
    eventDidMount: function(arg){
      const evClassList = arg.el.classList;
      if(evClassList.contains('type-bd') && evClassList.contains('fc-event-start') && !evClassList.contains('hidden')){
        const char = Array.from(evClassList).find(c => c.startsWith('char-'));
        const charname = char ? char.replace('char-', '') : null;
  
        const img = document.createElement('img');
        img.classList.add('bd-char-img')
        
        if (location.hostname === 'ganbareayato.github.io')
          img.src = `/brmy-calendar-kr/main/img/sd/${charname}.png`;
        else img.src = `/main/img/sd/${charname}.png`;
        
        arg.el.closest('div').appendChild(img);
        // arg.el.style.display = 'none';
      }
    }
  });

  calendar.render();

  // 스와이프 로직
  let startX = 0;
  let endX = 0;

  calendarEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  });

  calendarEl.addEventListener('touchend', e => {
    endX = e.changedTouches[0].clientX;

    const diff = startX - endX;
    if (diff > 50) {
      // 왼쪽으로 스와이프 → 다음달
      calendar.next();
    } else if (diff < -50) {
      // 오른쪽으로 스와이프 → 전달
      calendar.prev();
    }
  });
});