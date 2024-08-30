/**
 * This Lambda function runs when Elemental media convert publishes job's satus.
 */

export default async function(event: any) {
    console.log(`${event.detail.status}::`, JSON.stringify(event))
    const update = {
      encodedJobId: event.detail.jobId,
      status: event.detail.status
    }
  
    let jobStatus
    switch (event.detail.status) {
      case 'PROGRESSING':        
        break
      case 'COMPLETE':
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