import { Handler } from 'aws-lambda'
import onSnsNotifications from './notifications/on-sns-notifications'
import onMediaConvertNotifications from './notifications/on-media-convert-notifications'
 
const RESOURCE_MAP: any = {
}
 
// Common entrypoint to all api gateway Lambda functions
export const handler: Handler = async (event, context, callback) => {
  console.log('[EVENT]', JSON.stringify(event))
  let isProxyRequest = false
  let error
  let response
  context.callbackWaitsForEmptyEventLoop = false

  try {
    if (event.httpMethod && event.resource) {
      isProxyRequest = true
      console.log('[REQUEST]', event.httpMethod, event.resource)
      const resource = RESOURCE_MAP[event.resource]
      const resourceMethod = resource && resource[event.httpMethod]
      if (resourceMethod) {
        response = await resourceMethod(event)
      } else {
        error = new Error('[404] Route Not Found')
      }
    } else if (event.source === 'aws.mediaconvert') {
      // Media Convert Notifications
      response = await onMediaConvertNotifications(event)
    } else if (event.Records && event.Records[0] && event.Records[0].Sns) {
      // SNS Notifications
      response = await onSnsNotifications(event)
    } else {
      console.log('[UNKNOWN]', JSON.stringify(event))
      response = {}
    }
  } catch (err) {
    error = err
  }

  if (isProxyRequest && error) sendProxyError(callback, error)
  else if (isProxyRequest) sendProxySuccess(callback, response)
  else if (error) sendRawError(callback, error)
  else sendRawSuccess(callback, response)
}

function sendProxySuccess(callback: any, responseObj: any) {
  const response = responseObj && responseObj.statusCode ? responseObj : {
    statusCode: 200,
    body: JSON.stringify(responseObj),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  }
  callback(null, response)
}

function sendProxyError(callback: any, err: any) {
  console.log('ERROR:', err.code, err.stack || err)
  let status = 500
  let message = err.message || JSON.stringify(err)
  const m = err.message && err.message.match(/^\[(\d+)\] *(.*)$/)
  if (m) {
    status = m[1]
    message = m[2]
  }
  const code = err.code || undefined
  const response = {
    statusCode: status,
    body: JSON.stringify({ errorMessage: message, errorCode: code, }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  }
  callback(null, response)
}

function sendRawSuccess(callback: any, responseObj: any) {
  callback(null, responseObj)
}

function sendRawError(callback: any, err: any) {
  console.log('ERROR:', err.code, err.stack || err)
  callback(err, null)
}
