import { CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, S3Client, S3ServiceException } from '@aws-sdk/client-s3';
import { env } from '../config/env.config.js';

const client = new S3Client({
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.STORAGE_ACCESS_KEY, secretAccessKey: env.STORAGE_SECRET_KEY },
});

const bucket = env.STORAGE_BUCKET;

const publicReadPolicy = {
    Version: '2012-10-17',
    Statement: [
        {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
        },
    ],
};

const bucketExists = async (): Promise<boolean> => {
    try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        return true;
    } catch (error) {
        if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
            return false;
        }
        throw error;
    }
};

if (await bucketExists()) {
    console.log(`Bucket "${bucket}" já existe.`);
} else {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" criado.`);
}

await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(publicReadPolicy) }));
console.log(`Leitura pública liberada em "${bucket}".`);

client.destroy();
