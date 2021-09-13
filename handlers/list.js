const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { responseData } = require("../utils");

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.hostname,
  port: 5432,
  user: process.env.username,
  database: process.env.database,
  password: process.env.password
});

module.exports.get_video_list_handler = async (event, context) => {
  var params = {
    Bucket: process.env.keyframe_s3_bucket_name,
    Delimiter: "/",
  };

  try {
    const data = await s3.listObjects(params).promise();

    let result = [];
    for (let i = 0; i < data.CommonPrefixes.length; i++) {
      result.push(data["CommonPrefixes"][i]["Prefix"].slice(0, -1));
    }
    return responseData(200, result);
  } catch (error) {
    return responseData(400, error);
  }
};

module.exports.get_keyframe_list_handler = async (event, context) => {
  const key = event.pathParameters.key;

  try {
    const res = await pool.query(`SELECT * FROM public."analyze" WHERE key = $1 ORDER BY image ASC`, [key]);

    let result = [];
    for (let i = 0; i < res["rowCount"]; i++) {
      let tags = [];
      res['rows'][i]['data'].forEach(element => {
        element && tags.push({
          value: element,
          title: element
        })
      });

      result.push({
        url: `https://${process.env.keyframe_s3_bucket_name}.s3.amazonaws.com/${key}/${res['rows'][i]['image']}`,
        tags: tags
      });
    }
    return responseData(200, result);
  } catch (error) {
    return responseData(400, error);
  }
}