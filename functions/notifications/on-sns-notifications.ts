/**
 * This Lambda function runs when 
 * 1. A new object is created in S3 Bucket.
 */

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
      
      return {}
       
    default:
      // No need to throw error
      console.error(`Unknown event source:: ${message.Records[0].eventSource}.`)
      return {}
  }
  
}