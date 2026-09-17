import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast } from '@vicinae/api';
import { Solar } from 'lunar-typescript';
import { useEffect, useMemo, useState } from 'react';

import { ExpiredStorage } from '../cmn';
import { ISubCommandConfig } from '../i/command';

interface Holiday {
  date: string;
  holiday: boolean;
  name: string;
  target?: string;
}

type Holidays = Record<string, Holiday>;

const HOLIDAY_CACHE_TTL = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const BLUE = '#2684FF';
const RED = '#E5484D';
// MdTable gives each cell 8px horizontal padding. Keep the SVG within its content box
// so Qt's inline-image layout does not overflow into the next column.
const CELL_WIDTH = 88;
const CELL_HEIGHT = 52;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCalendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getLunarLabel(date: Date): string {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const lunar = solar.getLunar();
  const solarFestival = solar.getFestivals()[0];
  const lunarFestival = lunar.getFestivals()[0];
  const jieQi = lunar.getJieQi();

  return (
    solarFestival ||
    lunarFestival ||
    jieQi ||
    (lunar.getDay() === 1 ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese())
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character,
  );
}

function renderCalendar(month: Date, holidays: Holidays): string {
  const todayKey = dateKey(new Date());
  const days = getCalendarDays(month);
  const renderCell = (day: Date) => {
    const key = dateKey(day);
    const holiday = holidays[key];
    const isCurrentMonth = day.getMonth() === month.getMonth();
    const isToday = key === todayKey;
    const isRestDay = day.getDay() === 0 || day.getDay() === 6 || holiday?.holiday;
    const isMakeUpWorkday = holiday && !holiday.holiday;
    const color = isMakeUpWorkday ? RED : isRestDay ? BLUE : undefined;
    const lunar = isCurrentMonth ? getLunarLabel(day) : '';
    const primaryColor = isToday ? '#FFFFFF' : color || '#24292F';
    const secondaryColor = isToday ? '#DCEBFF' : color || '#69727D';
    const label = holiday
      ? escapeHtml(holiday.holiday ? holiday.name : holiday.target || holiday.name)
      : escapeHtml(lunar);
    const badgeColor = holiday?.holiday ? BLUE : RED;
    const badge = holiday
      ? `<rect x="10" y="31" width="20" height="17" rx="8.5" fill="${badgeColor}"/><text x="20" y="43" text-anchor="middle" font-size="10" font-weight="700" fill="#FFFFFF">${holiday.holiday ? '休' : '班'}</text>`
      : '';
    const todayBackground = isToday
      ? `<rect x="3" y="3" width="${CELL_WIDTH - 6}" height="${CELL_HEIGHT - 6}" rx="9" fill="${BLUE}"/>`
      : '';
    const opacity = isCurrentMonth ? 1 : 0.42;
    const labelX = holiday ? 35 : CELL_WIDTH / 2;
    const labelAnchor = holiday ? 'start' : 'middle';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" viewBox="0 0 ${CELL_WIDTH} ${CELL_HEIGHT}"><g opacity="${opacity}">${todayBackground}<text x="${CELL_WIDTH / 2}" y="25" text-anchor="middle" font-size="18" font-family="sans-serif" font-weight="${isToday ? 700 : 500}" fill="${primaryColor}">${day.getDate()}</text>${badge}<text x="${labelX}" y="44" text-anchor="${labelAnchor}" font-size="11" font-family="sans-serif" font-weight="bold" fill="${secondaryColor}">${isToday ? '今天' : label}</text></g></svg>`;
    const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    return `<img src="${imageUrl}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" />`;
  };
  const header = `| ${WEEKDAYS.map(day => `**${day}**`).join(' | ')} |`;
  const separator = '| :---: | :---: | :---: | :---: | :---: | :---: | :---: |';
  const rows = Array.from({ length: 6 }, (_, weekIndex) => {
    const week = days.slice(weekIndex * 7, weekIndex * 7 + 7);
    return `| ${week.map(renderCell).join(' | ')} |`;
  });
  return [header, separator, ...rows].join('\n');
}

async function getHolidays(year: number): Promise<Holidays> {
  const cacheKey = `dbox/calendar/holidays/${year}`;
  const cached = await ExpiredStorage.getItem<Holidays>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`https://timor.tech/api/holiday/year/${year}/`);
  if (!response.ok) throw new Error(`Holiday API returned ${response.status}`);

  const result = (await response.json()) as { code?: number; holiday?: Record<string, Holiday> };
  if (result.code !== 0 || !result.holiday) throw new Error('Holiday API returned invalid data');

  const holidays = Object.fromEntries(Object.values(result.holiday).map(item => [item.date ?? '', item]));
  await ExpiredStorage.setItem(cacheKey, holidays, HOLIDAY_CACHE_TTL);
  return holidays;
}

export function CalendarCommand() {
  const currentMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), []);
  const [month, setMonth] = useState(currentMonth);
  const [holidays, setHolidays] = useState<Holidays>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getHolidays(month.getFullYear())
      .then(data => {
        if (!cancelled) setHolidays(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHolidays({});
          showToast({ style: Toast.Style.Failure, title: '节假日数据加载失败', message: '农历日历仍可正常使用' });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const title = `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`;
  const markdown = `${renderCalendar(month, holidays)}\n\n${isLoading ? '> 正在同步法定节假日与调休安排…' : ''}`;
  const changeMonth = (offset: number) =>
    setMonth(value => new Date(value.getFullYear(), value.getMonth() + offset, 1));

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={title}>
            <Action
              title="回到本月"
              icon={Icon.Calendar}
              shortcut={{ modifiers: [], key: 'c' }}
              onAction={() => setMonth(currentMonth)}
            />
            <Action.CopyToClipboard title="复制日历" content={markdown} />
          </ActionPanel.Section>
          <ActionPanel.Section title="切换月份">
            <Action
              title="上个月"
              icon={{ source: Icon.ArrowLeft, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ['shift'], key: 'arrowLeft' }}
              onAction={() => changeMonth(-1)}
            />
            <Action
              title="下个月"
              icon={{ source: Icon.ArrowRight, tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ['shift'], key: 'arrowRight' }}
              onAction={() => changeMonth(1)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="切换年份">
            <Action
              title="上一年"
              icon={Icon.ChevronLeft}
              shortcut={{ modifiers: ['ctrl', 'shift'], key: 'arrowLeft' }}
              onAction={() => setMonth(value => new Date(value.getFullYear() - 1, value.getMonth(), 1))}
            />
            <Action
              title="下一年"
              icon={Icon.ChevronRight}
              shortcut={{ modifiers: ['ctrl', 'shift'], key: 'arrowRight' }}
              onAction={() => setMonth(value => new Date(value.getFullYear() + 1, value.getMonth(), 1))}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export const calendarCommand: ISubCommandConfig = {
  id: 'calendar',
  title: 'Calendar',
  subtitle: '日历',
  icon: Icon.Calendar,
  component: CalendarCommand,
};
