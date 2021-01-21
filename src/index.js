/* eslint-disable no-console */
require('dotenv').config();
let sensor = require('node-dht-sensor').promises;

const useRealSensor = process.env.use_real_sensor;
const Cloudant = require('@cloudant/cloudant');

const cloudant = new Cloudant({
  url: process.env.cloudant_url,
  plugins: [
    {
      iamauth: {
        iamApiKey: process.env.iam_api_key,
      },
    },
  ],
});

const dbClient = cloudant.use('temperatures');

if (!useRealSensor || useRealSensor === 'false') {
  sensor = {
    read: () => new Promise((resolve) => {
      resolve({ temperature: 22.600000381469727, humidity: 48 });
    }),
  };
}

const addNewMeasurement = () => new Promise((resolve, reject) => {
  sensor.read(22, 4).then((res) => {
    const document = {
      temp: res.temperature.toFixed(1),
      humidity: res.humidity.toFixed(1),
    };
    dbClient.insert(document, new Date().getTime()).then(() => {
      console.debug('Successfully wrote data to db');
      resolve();
    }).catch((err) => {
      console.error(`Error happened when writing to db:\n ${err}`);
      reject(err);
    });
  }).catch((err) => {
    console.error(`Error gathering data from the sensor:\n ${err}`);
    reject(err);
  });
});

const exec = () => {
  let failsInARow = 0;
  const interval = setInterval(() => {
    addNewMeasurement()
      .then(() => {
        failsInARow = 0;
      })
      .catch(() => {
        failsInARow += 1;

        // stop execution if we suspect something is not working
        if (failsInARow > 5) {
          clearInterval(interval);
          console.error('Stopping measurement loop because too many failures have happened');
        }
      });
  });
};

exec();
