import { PlaySession } from "@prisma/client";

export type BedtimeSession = PlaySession & {
  stop: Date;
  sleepTimeInHrs: number;
};

export const formatAsHours = (time: number) =>
  Math.round((time / 1000 / 60 / 60) * 10) / 10;

export const formatAsDays = (time: number) =>
  Math.round((formatAsHours(time) / 24) * 10) / 10;

export const formatAsTime = (timeFromMidnight: number): string => {
  const floored = Math.floor(timeFromMidnight);
  const minutes = Math.floor((timeFromMidnight - floored) * 60);
  return `${(timeFromMidnight > 0 ? floored : floored + 24)
    .toString()
    .padStart(2, "0")}.${minutes.toString().padStart(2, "0")}`;
};

export const getTimeBetweenDates = (date1: Date, date2: Date): number =>
  Math.abs(date1.getTime() - date2.getTime());

export const isOlderThan = (date: Date, milliseconds: number): boolean =>
  getTimeBetweenDates(new Date(), date) > milliseconds;

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

const getAverageTime = (dates: Date[]) =>
  dates.map((d) => hoursFromUTCMidnight(d)).reduce((p, a) => p + a) /
  dates.length;

const getAverageTimeDeviation = (dates: Date[], averageTime: number) =>
  dates
    .map((d) => Math.abs(averageTime - hoursFromUTCMidnight(d)))
    .reduce((p, a) => p + a) / dates.length;

export const getBedtimeSessions = (
  _sessions: PlaySession[]
): BedtimeSession[] => {
  type CompletedSession = PlaySession & { stop: string };
  const sessions = _sessions
    .filter((s): s is CompletedSession => s.stop !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (sessions.length < 3) return [];

  const bedtimeSessions: BedtimeSession[] = [];
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
      bedtimeSessions.unshift({ ...current, sleepTimeInHrs: hoursUntilNext });
    }
  }

  if (bedtimeSessions.length > 2) {
    return bedtimeSessions.filter(
      (s) =>
        Math.abs(
          hoursFromUTCMidnight(s.stop) -
            getAverageTime(bedtimeSessions.map((s) => s.stop))
        ) < 4
    );
  } else {
    return bedtimeSessions;
  }
};

export type BedtimeData = {
  bedtimeSessions: BedtimeSession[];
  tzOffsetInHrs: number;
  averageBedtime: string;
  averageBedtimeDeviationInHrs: number;
  averageWakeUpTime: string;
  averageWakeUpTimeDeviationInHrs: number;

  averageSleepTimeInHrs: number;
  minSleepTimeInHrs: number;
};

export const analyzeBedtimeSessions = (
  sessions: PlaySession[]
): BedtimeData | undefined => {
  const bedtimeSessions = getBedtimeSessions(sessions).slice(0, 3);

  if (bedtimeSessions.length < 2) return;

  const stopDates = bedtimeSessions.map((s) => s.stop);
  const averageStopTime = getAverageTime(stopDates);
  const averageStopTimeDeviation = getAverageTimeDeviation(
    stopDates,
    averageStopTime
  );

  // const startDates = bedtimeSessions.map((s) => s.start);
  const sorted = sessions
    .slice()
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  const startDates = sorted
    .filter((s, i) => {
      const last = sorted[Math.min(sorted.length - 1, i + 1)];

      return bedtimeSessions.map((b) => b.id).includes(last.id);
    })
    .map((s) => s.start);
  const averageStartTime = getAverageTime(startDates);
  const averageStartTimeDeviation = getAverageTimeDeviation(
    startDates,
    averageStartTime
  );

  const averageSleepTime =
    bedtimeSessions.map((s) => s.sleepTimeInHrs).reduce((a, b) => a + b) /
    bedtimeSessions.length;
  const minSleepTime = Math.min(
    ...bedtimeSessions.map((s) => s.sleepTimeInHrs)
  );

  const tzOffset = new Date().getTimezoneOffset() / -60;

  return {
    bedtimeSessions,

    tzOffsetInHrs: tzOffset,

    averageBedtime: formatAsTime(averageStopTime + tzOffset),
    averageBedtimeDeviationInHrs:
      Math.round(averageStopTimeDeviation * 10) / 10,

    averageWakeUpTime: formatAsTime(averageStartTime + tzOffset),
    averageWakeUpTimeDeviationInHrs:
      Math.round(averageStartTimeDeviation * 10) / 10,

    averageSleepTimeInHrs: Math.round(averageSleepTime * 10) / 10,
    minSleepTimeInHrs: Math.round(minSleepTime * 10) / 10,
  };
};

export const uniqueArray = <T>(arr: T[]): T[] => {
  return Array.from(new Set(arr));
};
