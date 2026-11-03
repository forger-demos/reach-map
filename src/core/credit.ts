import type {Manifest} from './manifest';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface Credit {
  publisher: string;
  publisherUrl: string;
  year: string;
  license: string;
  licenseUrl: string;
  feedVersion: string;
  /** The weekday date of the snapshot, for example `Wed 4 Nov 2026`. */
  serviceDate: string;
}

export function formatDate(date: string): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(4, 6));
  const d = Number(date.slice(6, 8));
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** What the footer shows: who published the data, under which licence, which feed and which day. */
export function creditOf(manifest: Manifest): Credit {
  return {
    publisher: manifest.publisher.name,
    publisherUrl: manifest.publisher.url,
    year: manifest.dates.weekday.slice(0, 4),
    license: manifest.license.name,
    licenseUrl: manifest.license.url,
    feedVersion: manifest.feedVersion,
    serviceDate: formatDate(manifest.dates.weekday),
  };
}
