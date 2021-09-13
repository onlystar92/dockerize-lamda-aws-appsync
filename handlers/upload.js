const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.aws_access_key,
  secretAccessKey: process.env.aws_secret_key,
  signatureVersion: 'v4'
});
const uuidv4 = require("uuid/v4");
const { responseData } = require("../utils");
const contentTypes = ["video/mp4", "video/quicktime"];

module.exports.get_presign_url_handler = async (event, context) => {
  const data = JSON.parse(event.body);
  const ext = (/[.]/.exec(data.filename)) ? /[^.]+$/.exec(data.filename) : "";

  if (!contentTypes.includes(data.contentType)) {
    return responseData(400, {
      "message": `Unsupported extension type "${ext}".`
    });
  }

  const key = uuidv4();
  const params = {
    Bucket: process.env.file_s3_bucket_name,
    Key: `${key}.${ext}`,
    Expires: 36000
  };

  const presigned_url = await getPublicUrl(params);

  return responseData(200, {
    key: `${key}.${ext}`,
    presigned_url: presigned_url
  });
}

const getPublicUrl = params => {
  return new Promise((resolve, reject) => {
      s3.getSignedUrl('putObject', params, (error, url) => {
          if (error) {
              reject(error);
          } else {
              resolve(url);
          }
      });
  });
}
