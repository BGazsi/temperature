/* eslint-disable no-console */
require('dotenv').config();

const useRealSensor = process.env.use_real_sensor;
const Cloudant = require('@cloudant/cloudant');
const realSensor = require('node-dht-sensor').promises;
const { mockSensor } = require('./mockSensor');

const sensor = !useRealSensor || useRealSensor === 'false' ? mockSensor : realSensor;

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

const addNewMeasurement = () => new Promise((resolve, reject) => {
  sensor.read(22, 4).then((res) => {
    const document = {
      temp: res.temperature.toFixed(1),
      humidity: res.humidity.toFixed(1),
      _id: new Date().getTime().toString(),
    };
    dbClient.insert(document, new Date().getTime()).then(() => {
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
  addNewMeasurement().then().catch(console.error);
  setInterval(addNewMeasurement, process.env.refresh_interval);
};

exec();
