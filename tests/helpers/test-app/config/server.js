module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: ['refAMfTXgOzzoyZgNzAM7Q==', 'chxdTpEu9mpAjrikTsXCJw==', 'ATFaTMWzubRix0aQequdhw==', 'PF+DucUasw98EdH9ysY+ig=='],
  },
});
