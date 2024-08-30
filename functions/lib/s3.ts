import {
    S3Client,
    GetObjectCommand,
    GetObjectCommandInput,
    GetObjectCommandOutput,
    PutObjectCommand,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    HeadObjectCommand,
    HeadObjectCommandInput,
    HeadObjectCommandOutput,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    ListObjectsV2CommandOutput,
    CopyObjectCommandInput,
    CopyObjectCommand,
    CopyObjectCommandOutput
} from "@aws-sdk/client-s3"

const client = new S3Client({})

export async function putObject(item: PutObjectCommandInput) {
    console.log(`s3::putObject Bucket=${item.Bucket} Key=${item.Key}`)
    let command = new PutObjectCommand(item)
    const response: PutObjectCommandOutput = await client.send(command)
    return response
}

export async function getObject(getObjectInput: GetObjectCommandInput) {
    console.log(`s3::getObject Bucket=${getObjectInput.Bucket} Key=${getObjectInput.Key}`)
    const command = new GetObjectCommand(getObjectInput)
    const response: GetObjectCommandOutput = await client.send(command)
    return response
}

export async function headObject(headObjectInput: HeadObjectCommandInput) {
    console.log('s3::headObject', JSON.stringify(headObjectInput))
    const command = new HeadObjectCommand(headObjectInput)
    const response: HeadObjectCommandOutput = await client.send(command)
    return response
}

export async function listObjectsV2(listObjectsV2Input: ListObjectsV2CommandInput) {
    console.log('s3::listObjectsV2', JSON.stringify(listObjectsV2Input))
    const command = new ListObjectsV2Command(listObjectsV2Input)
    const response: ListObjectsV2CommandOutput = await client.send(command)
    return response
}

export async function copyObject(input: CopyObjectCommandInput) {
    console.log('s3::copyObject', JSON.stringify(input))
    const command = new CopyObjectCommand(input)
    const response: CopyObjectCommandOutput = await client.send(command)
    return response
}
