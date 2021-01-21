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

const exec = () => {
  sensor.read(22, 4).then((res) => {
    const document = {
      temp: res.temperature.toFixed(1),
      humidity: res.humidity.toFixed(1),
    };
    dbClient.insert(document, new Date().getTime()).then(() => {
      console.debug('Successfully wrote data to db');
    }).catch((err) => {
      console.error(`Error happened when writing to db:\n ${err}`);
    });
  }).catch((err) => {
    console.error(`Error gathering data from the sensor:\n ${err}`);
  });
};

exec();