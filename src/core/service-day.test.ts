import {expect, test} from 'bun:test';
import {records, tableFromText} from './csv';
import {activeServices, dayOfWeek, dayTypeOf, isDate} from './service-day';

const calendar = await records(tableFromText(`service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WK,1,1,1,1,1,0,0,20261102,20261108
WKEND,0,0,0,0,0,1,1,20261102,20261108
EXTRA,0,0,0,0,0,0,0,20261102,20261108
`));
const dates = await records(tableFromText(`service_id,date,exception_type
WK,20261104,2
EXTRA,20261104,1
`));

test('a weekday-only service runs on weekdays inside its window', () => {
  expect([...activeServices(calendar, dates, '20261105')]).toEqual(['WK']);
  expect([...activeServices(calendar, dates, '20261107')]).toEqual(['WKEND']);
  expect([...activeServices(calendar, dates, '20261110')]).toEqual([]);
});

test('calendar_dates removes one service and adds another on the same date', () => {
  expect([...activeServices(calendar, dates, '20261104')]).toEqual(['EXTRA']);
});

test('unknown exception types change nothing', () => {
  const odd = [{service_id: 'WK', date: '20261105', exception_type: '9'}];
  expect([...activeServices(calendar, odd, '20261105')]).toEqual(['WK']);
});

test('days of the week and day types', () => {
  expect(dayOfWeek('20261104')).toBe(3);
  expect(dayTypeOf('20261104')).toBe('weekday');
  expect(dayTypeOf('20261107')).toBe('saturday');
  expect(dayTypeOf('20261108')).toBe('sunday');
});

test('date validation', () => {
  expect(isDate('20261104')).toBe(true);
  expect(isDate('20261304')).toBe(false);
  expect(isDate('20260231')).toBe(false);
  expect(isDate('2026-11-04')).toBe(false);
});
