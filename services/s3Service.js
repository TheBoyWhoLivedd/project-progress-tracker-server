const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const uuid = require("uuid").v4;

exports.s3Uploadv3 = async (files) => {
  const s3client = new S3Client({ region: process.env.AWS_REGION });

  const uploadPromises = files.map(async (file) => {
    const key = `uploads/${uuid()}-${file.originalname}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
    };

    await s3client.send(new PutObjectCommand(params));

    return {
      originalName: file.originalname,
      key: key,
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    };
  });

  return await Promise.all(uploadPromises);
};
