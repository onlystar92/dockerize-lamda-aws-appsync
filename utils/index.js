const request = require('request');
const { createWriteStream } = require("fs");

module.exports.responseData = (statusCode, data) => {
  return {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*"
    },
    body: JSON.stringify(data)
  };
}

module.exports.download = async (url, dest) => {

  /* Create an empty file where we can save data */
  const file = createWriteStream(dest);

  /* Using Promises so that we can use the ASYNC AWAIT syntax */
  await new Promise((resolve, reject) => {
    request({
      /* Here you should specify the exact link to the file you are trying to download */
      uri: url,
    })
      .pipe(file)
      .on('finish', async () => {
        console.log(`The file is finished downloading.`);
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  })
    .catch((error) => {
      console.log(`Something happened: ${error}`);
    });
}