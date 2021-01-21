require('dotenv').config()
const useRealSensor = process.env.use_real_sensor
const Cloudant = require('@cloudant/cloudant');

const cloudant = new Cloudant({
  url: process.env.cloudant_url,
  plugins: [
    {
      iamauth: {
        iamApiKey: process.env.iam_api_key
      }
    }
  ]
})

const dbClient = cloudant.use('temperatures');

let sensor = {
  read: () => new Promise((resolve, reject) => {
    resolve({ temperature: 22.600000381469727, humidity: 48 })
  })
}

if (useRealSensor && useRealSensor !== 'false') {
  sensor = require("node-dht-sensor").promises;
}


async function exec() {
  try {
    const res = await sensor.read(22, 4);
    const document = {
      temp: res.temperature.toFixed(1),
      humidity: res.humidity.toFixed(1),
    }
    console.log(
      `temp: ${res.temperature.toFixed(1)}°C, ` +
      `humidity: ${res.humidity.toFixed(1)}%`
    );
    dbClient.insert(document, new Date().getTime()).then(data => {
      console.log('data', data);
    }).catch(err => {
      console.log('db error', err)
    })
  } catch (err) {
    console.error("Failed to read sensor data:", err);
  }
}

exec();
