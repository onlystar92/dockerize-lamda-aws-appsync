const { writeFileSync, unlinkSync, mkdirSync, existsSync, rmdirSync } = require("fs");
const { spawnSync } = require("child_process");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { download } = require("../utils");

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.hostname,
  port: 5432,
  user: process.env.username,
  database: process.env.database,
  password: process.env.password
});

module.exports.handler = async (event, context) => {
  try {
    await download("https://myqueuecounter.s3.amazonaws.com/darknet/yolov3.weights", "/tmp/yolov3.weights");
  } catch (error) {
    console.log(error);
    return;
  }

  let prefix;
  for (let i = 0; i < event.Records.length; i++) {
    const bucket = event.Records[i].s3.bucket.name;
    const key = decodeURIComponent(event.Records[i].s3.object.key.replace(/\+/g, ' '));
    prefix = key.split("/")[0];
    const filename = key.split("/")[1];

    // get the file
    const s3Object = await s3
      .getObject({
        Bucket: bucket,
        Key: key
      })
      .promise();

    if (!existsSync(`/tmp/${prefix}`))
      mkdirSync(`/tmp/${prefix}`, { recursive: true });
    // write file to disk
    writeFileSync(`/tmp/${key}`, s3Object.Body);

    const output = spawnSync(
      "./darknet",
      [
        "detect",
        "./cfg/yolov3.cfg",
        "/tmp/yolov3.weights",
        `/tmp/${key}`
      ],
      { stdio: 'pipe', encoding: 'utf-8' }
    );

    let result = output.stdout.split("\n");
    result.splice(0, 1);

    console.log("[result] ", result);

    const query_res = await pool.query(`SELECT * FROM public."analyze" WHERE key = $1 AND image = $2`, [prefix, filename]);

    if (query_res["rowCount"] == 0) {
      await pool.query(`INSERT INTO public."analyze" (key, image, data) VALUES ($1, $2, $3)`, [prefix, filename, JSON.stringify(result)]);
    }
    else {
      await pool.query(`UPDATE public."analyze" SET data = $3 WHERE key = $1 AND image = $2`, [prefix, filename, JSON.stringify(result)]);
    }

    // delete the temp files
    unlinkSync(`/tmp/${key}`);
  }

  unlinkSync(`/tmp/yolov3.weights`);
  rmdirSync(`/tmp/${prefix}`);

}