import { PlaySession } from "@prisma/client";

export const formatAsHours = (time: number) =>
  Math.round((time / 1000 / 60 / 60) * 10) / 10;

export const formatAsUTCHours = (timeFromUTCMidnight: number): string => {
  const floored = Math.floor(timeFromUTCMidnight);
  const minutes = Math.floor((timeFromUTCMidnight - floored) * 60);
  return timeFromUTCMidnight > 0
    ? `${floored}.${minutes}`
    : `${floored + 24}.${minutes}`;
};

export const getTimeBetweenDates = (
  date1: Date,
  date2: Date
): { hours: number; days: number } => {
  const hours = (date1.getTime() - date2.getTime()) / 1000 / 60 / 60;
  const days = hours / 24;

  return {
    hours: Math.round(hours * 10) / 10,
    days: Math.round(days * 10) / 10,
  };
};

export const timePlayedSince = (sessions: PlaySession[], date: Date) => {
  let time = 0;
  for (const session of sessions) {
    if (session.start.getTime() > date.getTime()) {
      time += (session.stop?.getTime() || Date.now()) - session.start.getTime();
    }
  }

  return time;
};

const hoursFromUTCMidnight = (date: Date): number => {
  const utcTime = new Date(
    date.getTime() + date.getTimezoneOffset() * 60 * 1000
  );

  const hours = utcTime.getHours() + utcTime.getMinutes() / 60;

  return hours > 12 ? hours - 24 : hours;
};

export const getLastSessionData = (
  _sessions: PlaySession[]
):
  | {
      lastSessions: PlaySession[];
      averageStopTime: number;
      averageStopTimeDeviation: number;
      averageSleepTime: number;
      minSleepTime: number;
    }
  | undefined => {
  type _Session = PlaySession & { stop: Date };
  const sessions = _sessions
    .filter((s): s is _Session => s.stop !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (sessions.length < 3) return;

  const lastSessions: (_Session & { sleepTime: number })[] = [];
  const sleepTimesInHours: { [id: string]: number } = {};
  for (let i = 1; i < sessions.length - 1; i++) {
    const previous = sessions[i - 1];
    const current = sessions[i];
    const next = sessions[i + 1];

    const hoursSincePrevious = formatAsHours(
      current.start.getTime() - previous.stop.getTime()
    );
    const hoursUntilNext = formatAsHours(
      next.start.getTime() - current.stop.getTime()
    );

    if (hoursUntilNext > 5 && hoursUntilNext < 12 && hoursSincePrevious < 5) {
      lastSessions.push({ ...current, sleepTime: hoursUntilNext });
    }
  }

  if (lastSessions.length < 3) return;

  const getAverageStopTime = (sessions: _Session[]) =>
    sessions.map((s) => hoursFromUTCMidnight(s.stop)).reduce((p, a) => p + a) /
    sessions.length;

  const getAverageStopTimeDeviation = (
    sessions: _Session[],
    averageStopTime: number
  ) =>
    sessions
      .map((s) => Math.abs(averageStopTime - hoursFromUTCMidnight(s.stop)))
      .reduce((p, a) => p + a) / sessions.length;

  const cleaned = lastSessions.filter(
    (s) =>
      Math.abs(
        hoursFromUTCMidnight(s.stop) - getAverageStopTime(lastSessions)
      ) < 3
  );

  if (cleaned.length < 3) return;

  const averageStopTime = getAverageStopTime(cleaned);
  const averageStopTimeDeviation = getAverageStopTimeDeviation(
    cleaned,
    averageStopTime
  );

  const averageSleepTime =
    cleaned.map((s) => s.sleepTime).reduce((a, b) => a + b) / cleaned.length;
  const minSleepTime = Math.min(...cleaned.map((s) => s.sleepTime));

  return {
    lastSessions: cleaned,
    averageStopTime,
    averageStopTimeDeviation,
    averageSleepTime,
    minSleepTime,
  };
};
