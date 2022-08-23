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
