/**
 * This Lambda function runs when 
 * 1. A new object is created in S3 Bucket.
 */

import {
  MediaConvertClient,
  CreateJobCommand, CreateJobCommandInput, CreateJobCommandOutput,
  GetQueueCommandInput, GetQueueCommand, GetQueueCommandOutput
} from "@aws-sdk/client-mediaconvert"
import { jobSettings } from '../lib/constants'

interface s3Message {
  Records: [{
    eventVersion: string,
    eventSource: string,
    awsRegion: string,
    eventTime: string,
    eventName: string,
    userIdentity: any,
    requestParameters: any,
    responseElements: any,
    s3: {
      s3SchemaVersion: string
      configurationId: string
      bucket: {
        name: string,
        ownerIdentity?: object
        arn: string
      },
      object: {
        key: string
        size?: number
        eTag?: string
        sequencer?: string
      }    
    }
  }]
}


export default async function(event: any) {
  for (let recordIndex in event.Records) {
    const record = event.Records[recordIndex]
    const message = JSON.parse(record.Sns.Message)
    await handleNotification(message)
  }
  return {}
}

async function handleNotification(message: s3Message) {
  console.log('Incoming message::', JSON.stringify(message))
  
  switch (message.Records[0].eventSource) { 
    // AWS:S3    
    case 'aws:s3':
      const addedKey = message.Records[0].s3.object.key.replace(/%3A/g, ':')
      console.log(`Added key: ${addedKey}`)
      const inputBucketName = message.Records[0].s3.bucket.name
      const outputBucketName = process.env.OUTPUT_BUCKET_NAME!
      const mcClient = new MediaConvertClient({})  

      jobSettings.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.Destination = `s3://${outputBucketName}/`
      jobSettings.Inputs[0].FileInput = `s3://${inputBucketName}/${addedKey}`

      const queueParams: GetQueueCommandInput = { Name: 'Default' }
      const getQueueCommand = new GetQueueCommand(queueParams)
      let queueARN = ''
      try {
        const q: GetQueueCommandOutput = await mcClient.send(getQueueCommand)
        queueARN = q.Queue!.Arn!
      } catch (error: any) {
        console.log(error, error.stack)
      }

      // Create media job parameters
      const jobParams: CreateJobCommandInput = {
        JobTemplate: process.env.JOB_TEMPLATE_ARN!,
        Queue: queueARN,
        UserMetadata: {},
        Role: process.env.MEDIA_CONVERT_ROLE_ARN!,
        Settings: jobSettings,
      }
      const createJobCommand = new CreateJobCommand(jobParams)

      try {
        const createJobResponse: CreateJobCommandOutput = await mcClient.send(createJobCommand)
        console.log('Job submitted to AWS Media Convert.', JSON.stringify(createJobResponse))          
      } catch (error: any) {
        console.log(error)
      }

      return {}
       
    default:
      // No need to throw error
      console.error(`Unknown event source:: ${message.Records[0].eventSource}.`)
      return {}
  }
  
}