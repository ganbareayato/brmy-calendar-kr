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

    
  // 셀 일자에서 "일" 없애기
  dayCellContent: function(arg) {
    const dayNumber = arg.dayNumberText.replace(/일/g, '');
      return { html: `<span>${dayNumber}</span>` };
    }
  });

  calendar.render();

  document.querySelectorAll('td.fc-day-today').forEach(td => {
    const borderDiv = document.createElement('div');
    borderDiv.classList.add('today-border');
    td.appendChild(borderDiv);
  });

});


let cardList = [];
async function loadCardList() {
  try {
    const jsonUrl = 'https://json-loader.ganbato-staff.workers.dev/load?file=card_list.json';
    const res = await fetch(jsonUrl);
    cardList = await res.json();
  } catch (err) {
    console.error('카드 리스트 불러오기 실패:', err);
  }
}

async function loadEvents() {
  if (cardList.length === 0) {
    await loadCardList();
  }
  
  try {
    const jsonUrl = 'https://json-loader.ganbato-staff.workers.dev/load?file=event.json';
    const res = await fetch(jsonUrl);
    const data = (await res.json()).filter(ev => ev.id !== 1);

    const events = (await Promise.all(
      data.map(async (ev, i) => {
        const classList = [];
        const attendChars = getAttendingChars(ev.id);
        if (ev.subtype?.includes('std')) {
          classList.push('type-std');
        } else {
          prevType = '';
        }

        // subtype들 클래스 추가
        ev.subtype?.forEach(type => classList.push(`type-${type}`));

        // 등장 캐릭터 추가 (보상, bd 포함)
        attendChars.forEach(c => classList.push(`char-${c}`));

        return {
          title: ev.event_name,
          start: ev.date_start,
          end: ev.date_end,
          end_gacha: ev.date_end_gacha,
          allDay: false,
          classNames: classList,
          subtype: ev.subtype ?? []
        };
      })
    )).flatMap(ev => splitEventByPhases(ev));


    return events;

  } catch (err) {
    console.error('이벤트 데이터를 불러오지 못했습니다:', err);
    return [];
  }
}


function getAttendingChars(eventId) {
  const matched = cardList.filter(card => card.event_id === eventId);
  const chars = [...new Set(matched.map(c => c.char_id.toLowerCase()))];
  return chars;
}


function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr.replace('T', ' ')); // 'T' 제거 → 로컬 시간으로 해석
}

function toKstISOString(date) {
  if (!(date instanceof Date)) return '';
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().replace('Z', '+09:00');
}

function splitEventByPhases(ev) {
  const result = [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const gachaEnd = ev.end_gacha ? new Date(ev.end_gacha) : null;

  const classNamesBase = ev.classNames || [];
  const isBD = ev.subtype?.includes('bd');

  // 생일 시작일 단일이벤트 (모든 경우에 추가)
  if (isBD) {
    result.push({
      ...ev,
      title: `${ev.title}`,
      start: start.toISOString(),
      end: start.toISOString(),
      allDay: false,
      classNames: [...classNamesBase, 'bd-point']
    });
  }

  // 생일이면 전용 로직
  if (isBD) {
    if (gachaEnd < today) {
      // 과거
      result.push({
        ...ev,
        title: `${ev.title} 가챠`,
        start: start.toISOString(),
        end: gachaEnd?.toISOString() ?? end.toISOString(),
        allDay: false,
        classNames: [...classNamesBase, 'phase-past']
      });
    } else if (start > today) {
      // 미래
      result.push({
        ...ev,
        title: `${ev.title} 가챠`,
        start: start.toISOString(),
        end: gachaEnd?.toISOString() ?? end.toISOString(),
        allDay: false,
        classNames: [...classNamesBase, 'phase-future']
      });
    } else {
      // 현재
      const pastEnd = new Date(today);
      pastEnd.setDate(today.getDate() - 1);
      pastEnd.setHours(23, 59, 59, 999);
      
      if (start < today) {
        result.push({
          ...ev,
          title: `${ev.title} 가챠`,
          start: start.toISOString(),
          end: pastEnd.toISOString(),
          allDay: false,
          classNames: [...classNamesBase, 'phase-past']
        });
      }

      result.push({
        ...ev,
        title: `${ev.title} 가챠`,
        start: today.toISOString(),
        end: gachaEnd?.toISOString() ?? end.toISOString(),
        allDay: false,
        classNames: [...classNamesBase, 'phase-current']
      });
    }

    return result;
  }

  // === 일반 이벤트 ===

  if (end < today) {
    result.push({
      ...ev,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
      classNames: [...classNamesBase, 'phase-past']
    });

    if (gachaEnd && gachaEnd.getTime() !== end.getTime()) {
      result.push({
        ...ev,
        title: ` 가챠 종료`,
        start: gachaEnd.toISOString(),
        end: gachaEnd.toISOString(),
        allDay: false,
        classNames: [...classNamesBase, 'gacha-point']
      });
    }

    return result;
  }

  if (start > today) {
    result.push({
      ...ev,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
      classNames: [...classNamesBase, 'phase-future']
    });

    if (gachaEnd && gachaEnd.getTime() !== end.getTime()) {
      result.push({
        ...ev,
        title: `${ev.title} 가챠 종료`,
        start: gachaEnd.toISOString(),
        end: gachaEnd.toISOString(),
        allDay: false,
        classNames: [...classNamesBase, 'gacha-point']
      });
    }

    return result;
  }

  // 현재
  const pastEnd = new Date(today);
  pastEnd.setDate(today.getDate() - 1);
  pastEnd.setHours(23, 59, 59, 999);

  if (start < today) {
    result.push({
      ...ev,
      start: start.toISOString(),
      end: pastEnd.toISOString(),
      allDay: false,
      classNames: [...classNamesBase, 'phase-past']
    });
  }

  result.push({
    ...ev,
    start: today.toISOString(),
    end: end.toISOString(),
    allDay: false,
    classNames: [...classNamesBase, 'phase-current']
  });

  if (gachaEnd) {
    result.push({
      ...ev,
      title: `${ev.title} 가챠 종료`,
      start: gachaEnd.toISOString(),
      end: gachaEnd.toISOString(),
      allDay: false,
      classNames: [...classNamesBase, 'gacha-point']
    });
  }

  return result;
}
