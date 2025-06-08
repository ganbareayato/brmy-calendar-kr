let cardList = [];
async function loadCardList() {
  try {
    const jsonUrl =
      window.location.hostname === 'ganbareayato.github.io'
        ? 'https://json-loader.ganbato-staff.workers.dev/load?file=card_list.json'
        : './card_list.json';

    const res = await fetch(jsonUrl);
    cardList = await res.json();
  } catch (err) {
    console.error('카드 리스트 불러오기 실패:', err);
  }
}

let charList = [];
async function loadCharList() {
  try {
    const jsonUrl =
      window.location.hostname === 'ganbareayato.github.io'
        ? 'https://json-loader.ganbato-staff.workers.dev/load?file=characters.json'
        : './characters.json';

    const res = await fetch(jsonUrl);
    charList = await res.json();
  } catch (err) {
    console.error('캐릭터 리스트 불러오기 실패:', err);
  }
}

async function loadEvents() {
  if (cardList.length === 0) await loadCardList();
  if(charList.length === 0) await loadCharList();
  
  try {
    const jsonUrl =
      window.location.hostname === 'ganbareayato.github.io'
        ? 'https://json-loader.ganbato-staff.workers.dev/load?file=event.json'
        : './event.json';


    const res = await fetch(jsonUrl);
    const data = (await res.json()).filter(ev => ev.id !== 1);

    const events = (await Promise.all(
      data.map(async (ev, i) => {
        const classList = [];
        const attendChars = getAttendingChars(ev.id);

        // subtype들 클래스 추가
        ev.subtype?.forEach(type => classList.push(`type-${type}`));

        // 등장 캐릭터 추가 (보상, bd 포함)
        if (ev.type === 'bd') {
          // 생일 이벤트: characters에서 찾아서 classList에 추가
          const birthdayChar = Object.entries(charList).find(([charName, charData]) => {
            const [bMM, bDD] = charData.birthday.split('-');
            const eventDate = new Date(ev.date_start);
            return (
              Number(bMM) === eventDate.getMonth() + 1 &&
              Number(bDD) === eventDate.getDate()
            );
          });

          if (birthdayChar) {
            const [charName] = birthdayChar;
            classList.push(`char-${charName}`);
          }
        } else {
          // 생일 이벤트 아닌 경우: attendChars로 처리, 이게 기존디폴트양식
          attendChars.forEach(c => classList.push(`char-${c}`));
        }

        return {
          id: ev.id,
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

function splitEventByPhases(ev) {
  const result = [];

  const now = new Date();
  // const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const gachaEnd = ev.end_gacha ? new Date(ev.end_gacha) : null;

  const classNamesBase = ev.classNames || [];
  const isBD = ev.subtype?.includes('bd');

  // 생일 시작일 단일이벤트 (모든 경우에 추가)
  if (isBD) {
    //수정: 미분리
    const campaignStart = new Date(ev.start);
    campaignStart.setDate(campaignStart.getDate() - 1)

    //생일캠페인
    result.push({
      ...ev,
      title: `${ev.title} 캠페인`,
      start_campaign: campaignStart.toISOString(),
      end_campaign: end.toISOString(),
      allDay: false,
      classNames: [...classNamesBase, 'bd-campaign', 'hidden']
    });

    //생일가챠
    result.push({
      ...ev,
      title: `${ev.title} 가챠`,
      start: start.toISOString(),
      end_campaign: end.toISOString(),
      end: gachaEnd.toISOString(),
      allDay: false,
      classNames: [...classNamesBase]
    });

    return result;

  } else {
    result.push({
      ...ev,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
      classNames: [...classNamesBase]
    });
    
    if (gachaEnd && !ev.subtype?.includes('pt')) {
      result.push({
        ...ev,
        title: `가챠 종료`,
        start: gachaEnd.toISOString(),
        end: gachaEnd.toISOString(),
        allDay: false,
        classNames: [...classNamesBase, 'gacha-point']
      });
    }

    return result;
  }
}

export { charList, loadEvents, cardList, loadCardList }