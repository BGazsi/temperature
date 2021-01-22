const mockSensor = {
  read: () => new Promise((resolve) => {
    resolve({ temperature: 22.600000381469727, humidity: 48 });
  }),
};

module.exports = {
  mockSensor,
};
