function getArg(key) {
  const index = process.argv.indexOf(key);
  return index > -1 ? process.argv[index + 1] : null;
}

module.exports = {
  getArg,
};
