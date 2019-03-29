const readline = require("readline");

let interval;

module.exports = {
  start: ({ ms, refreshMs = 1000, onFinish, onTick }) => {
    let elapsedTime = 0;

    const tick = () => {
      elapsedTime += refreshMs;

      if (onTick) onTick(elapsedTime);

      if (elapsedTime >= ms) {
        module.exports.stop();
        if (onFinish) onFinish();
      }
    };

    interval = setInterval(tick, refreshMs);
  },

  stop: () => {
    if (interval) clearInterval(interval);
  }
};
