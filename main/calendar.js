document.addEventListener('DOMContentLoaded', async function () {
  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    events: await loadEvents()
  });

  calendar.render();
});

async function loadEvents() {
  try {
    const res = await fetch('https://json-loader.ganbato-staff.workers.dev/load?file=event.json');
    const data = await res.json();

    return data.map(ev => ({
      title: ev.event_name,
      start: ev.date_start,
      end: ev.date_end,
      allDay: true,
      backgroundColor: '#f66',
      borderColor: '#f66'
    }));
  } catch (err) {
    console.error('이벤트 데이터를 불러오지 못했습니다:', err);
    return [];
  }
}
