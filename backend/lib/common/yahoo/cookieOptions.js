module.exports = {
  httpOnly: true,
  secure: process.env.RUN_LOCAL ? undefined : true,
  sameSite: 'none',
};
