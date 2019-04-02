// some useful properties from seatGeekEventsDoc.events:
// seatGeekEventsDoc.events.map(event=>({
//   type: event.type,
//   title: event.title,
//   datetime_local: event.datetime_local,
//   datetime_utc: event.datetime_utc,
//   performers: event.performers.map(performer=>({
//     name: performer.name,
//     slug: performer.slug,
//     short_name: performer.short_name,
//     id: performer.id
//   }))
// }));
module.exports.parseDailySchedule = (seatGeekEventsDoc) => {
  let dailyGameMap = {};
  seatGeekEventsDoc.events.filter(event=>event.performers.length>1).forEach(({ type, datetime_utc, performers }) => {
    if(!dailyGameMap[type]) {
      dailyGameMap[type] = {};
    }
    dailyGameMap[type][performers[0].name] = {
      datetime_utc: datetime_utc,
      opponent: performers[1].name
    };
    dailyGameMap[type][performers[1].name] = {
      datetime_utc: datetime_utc,
      opponent: performers[0].name
    };
  });
  return dailyGameMap;
};
