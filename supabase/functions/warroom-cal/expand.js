// Turns an iCal feed into a flat list of event occurrences in one time zone, recurring events expanded.
// Shared by the edge function (Deno) and the local test (Node).
export function expandIcs(ICAL, text, fromMs, toMs, tz, calId) {
  const comp = new ICAL.Component(ICAL.parse(text));
  comp.getAllSubcomponents('vtimezone').forEach((t) => { try { ICAL.TimezoneService.register(t); } catch (e) {} });
  const all = comp.getAllSubcomponents('vevent');
  const exc = {}; all.filter((v) => v.hasProperty('recurrence-id')).forEach((v) => { const u = v.getFirstPropertyValue('uid'); (exc[u] = exc[u] || []).push(v); });
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = (d) => { const p = {}; fmt.formatToParts(d).forEach((x) => (p[x.type] = x.value)); return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` }; };
  const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64')).replace(/=+$/, '');
  const utcId = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const out = [];
  const push = (item, s, e, rid, recurring) => {
    if (String(item.component.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED') return;
    const sd = s.toJSDate(), ed = e.toJSDate(); if (ed.getTime() <= fromMs || sd.getTime() >= toMs) return;
    const uid = String(item.uid || ''), base = uid.replace(/@google\.com$/, ''), allDay = s.isDate;
    const eid = calId ? b64((recurring && rid ? `${base}_${allDay ? utcId(rid).slice(0, 8) : utcId(rid)}` : base) + ' ' + calId) : '';
    const ps = parts(sd), pe = parts(new Date(ed.getTime() - (allDay ? 1 : 0)));
    out.push({ uid: base + (rid ? '_' + utcId(rid) : ''), title: String(item.summary || '(no title)'), desc: String(item.description || '').slice(0, 600), date: allDay ? s.toString().slice(0, 10) : ps.date, s: allDay ? '' : ps.hm, e: allDay ? '' : (pe.date !== ps.date ? '24:00' : pe.hm), end: allDay ? '' : pe.date, allDay, eid, loc: String(item.location || '').slice(0, 120) });
    // an event that runs past midnight also shows on the next day(s), from 00:00
    if (!allDay && pe.date !== ps.date) { let d = new Date(Date.UTC(+ps.date.slice(0, 4), +ps.date.slice(5, 7) - 1, +ps.date.slice(8, 10))); for (let i = 0; i < 7; i++) { d = new Date(d.getTime() + 864e5); const k = d.toISOString().slice(0, 10); if (k > pe.date) break; out.push(Object.assign({}, out[out.length - 1], { uid: out[out.length - 1].uid + '+' + (i + 1), date: k, s: '00:00', e: k === pe.date ? pe.hm : '24:00', cont: true })); } }
  };
  all.filter((v) => !v.hasProperty('recurrence-id')).forEach((v) => {
    let ev; try { ev = new ICAL.Event(v); } catch (e) { return; }
    (exc[ev.uid] || []).forEach((x) => { try { ev.relateException(x); } catch (e) {} });
    if (!ev.isRecurring()) { push(ev, ev.startDate, ev.endDate, null, false); return; }
    const it = ev.iterator(); let next, n = 0;
    while ((next = it.next()) && n++ < 5000) {
      const js = next.toJSDate().getTime(); if (js >= toMs) break;
      const det = ev.getOccurrenceDetails(next); if (det.endDate.toJSDate().getTime() <= fromMs) continue;
      push(det.item, det.startDate, det.endDate, det.recurrenceId.toJSDate(), true);
    }
  });
  out.sort((a, b) => (a.date + a.s).localeCompare(b.date + b.s));
  return out;
}
