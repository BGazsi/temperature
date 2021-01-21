const sensor = require("node-dht-sensor").promises;

async function exec() {
  try {
    console.log('res elott')
    const res = await sensor.read(22, 4);
    console.log('res van')
    console.log(
      `temp: ${res.temperature.toFixed(1)}°C, ` +
        `humidity: ${res.humidity.toFixed(1)}%`
    );
  } catch (err) {
    console.log('catch');
    console.error("Failed to read sensor data:", err);
  }
}

exec();
