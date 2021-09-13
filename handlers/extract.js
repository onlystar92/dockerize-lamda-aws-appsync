const { spawnSync } = require("child_process");
const { readFileSync, readdirSync, writeFileSync, unlinkSync } = require("fs");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const uuidv4 = require("uuid/v4");

module.exports.handler = async (event, context) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  // get the file
  const s3Object = await s3
    .getObject({
      Bucket: bucket,
      Key: key
    })
    .promise();

  // write file to disk
  writeFileSync(`/tmp/${key}`, s3Object.Body);

  spawnSync(
    "/opt/ffmpeg/ffmpeg",
    [
      "-i",
      `/tmp/${key}`,
      "-r",
      " 0.1",
      `/tmp/keyframe_%04d.jpg`
    ],
    { stdio: "inherit" }
  );

  await s3.putObject({
    Key: `${key}/`, // This should create an empty object in which we can store files 
    Bucket: `${process.env.keyframe_s3_bucket_name}`,
    ACL: 'public-read',
  })
    .promise();

  const files = readdirSync("/tmp");
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.startsWith("keyframe_")) {
      // read jpg from disk
      const frameFile = readFileSync(`/tmp/${file}`);
      try {
        // upload jpg to s3
        await s3.putObject({
          Key: `${key}/${file}`,
          Bucket: `${process.env.keyframe_s3_bucket_name}`,
          Body: frameFile,
          ACL: 'public-read',
        })
          .promise();
      } catch (error) {
        console.log("[Error]", error)
      }

      // delete the temp files
      unlinkSync(`/tmp/${file}`);

    }
  }

  unlinkSync(`/tmp/${key}`);

}