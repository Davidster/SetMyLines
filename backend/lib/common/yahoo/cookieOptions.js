module.exports = {
  httpOnly: true,
  secure: process.env.RUN_LOCAL ? undefined : true
};
