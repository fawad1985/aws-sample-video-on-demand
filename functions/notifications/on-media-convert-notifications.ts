/**
 * This Lambda function runs when Elemental media convert publishes job's satus.
 */

import { marshall } from '@aws-sdk/util-dynamodb'
import * as ddb from '../lib/aws/ddb'

export default async function(event: any) {
  console.log(`${event.detail.status}::`, JSON.stringify(event))
    
  switch (event.detail.status) {
    case 'PROGRESSING':
      await ddb.updateItem({
        TableName: process.env.JOBS_TABLE_NAME!,
        Key: marshall({
          pk: 'JOBS',
          sk: `JOB#${event.detail.jobId}`,
        }),
        UpdateExpression: 'set #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt' : 'updatedAt'
        },
        ExpressionAttributeValues: marshall({
          ':status': event.detail.status,
          ':updatedAt': new Date().toJSON()
        }),
        ConditionExpression: 'attribute_exists(sk)'
      })
      break
    case 'COMPLETE':
      await ddb.updateItem({
        TableName: process.env.JOBS_TABLE_NAME!,
        Key: marshall({
          pk: 'JOBS',
          sk: `JOB#${event.detail.jobId}`,
        }),
        UpdateExpression: 'set #status = :status, #updatedAt = :updatedAt, #outputGroupDetails = :outputGroupDetails',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt' : 'updatedAt',
          '#outputGroupDetails': 'outputGroupDetails'
        },
        ExpressionAttributeValues: marshall({
          ':status': event.detail.status,
          ':updatedAt': new Date().toJSON(),
          ':outputGroupDetails': generateCloudFrontURLs(event.detail.outputGroupDetails)

        }),
        ConditionExpression: 'attribute_exists(sk)'
      })
      break
    case 'CANCELED':
      break
    case 'ERROR':
      break
    default:
      console.error(`Unknown job status: ${event.detail.status}`)
  }

  return {}
}

function generateCloudFrontURLs(outputGroupDetails: any[]) {

  const CloudFrontUrl = (s3url: any) => {
    const cfUrl = `https://${process.env.CLOUDFRONT_DOMAIN}` + s3url.split(process.env.OUTPUT_BUCKET_NAME)[1]
    return cfUrl
  }

  const groupDetails = outputGroupDetails.map(groupDetail => {
    const groupContainer = {}
    groupContainer['type'] = 	groupDetail['type']
    switch (groupDetail['type']) {
      case 'HLS_GROUP':
        groupContainer['playlistFilePaths'] = groupDetail['playlistFilePaths'].map(url => { return CloudFrontUrl(url) })
        groupContainer['outputDetails'] = groupDetail['outputDetails'].map(detail => {
        	const container = {}
          Object.keys(detail).forEach(key => {
            switch (key) {
              case 'outputFilePaths':
              	container[key] = detail[key].map(url => { return CloudFrontUrl(url) })
              	break
              default:
              	container[key] = detail[key]
            }
          })
          return container
        })
        break
      default:
        throw new Error('Unkown output type format')
    }
    return groupContainer
  })
  console.log(`CLOUDFRONT_URLS:: ${JSON.stringify(groupDetails, null, 2)}`)
  return groupDetails
}