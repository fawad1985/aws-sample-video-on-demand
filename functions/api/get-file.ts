import * as ddb from '../lib/aws/ddb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

export default async function (event: any) {
  const filename = (event.pathParameters && event.pathParameters.filename) || ''
	const response = await ddb.queryItems({
		TableName: process.env.JOBS_TABLE_NAME!,
		IndexName: 'lsi',
		KeyConditionExpression: 'pk = :pk AND begins_with(filename, :filename)',
    ExpressionAttributeValues: marshall({
      ':pk' : `JOBS`,
      ':filename' : `FILENAME#${filename}`
    }),
		Select: "ALL_ATTRIBUTES",
	})
  
	return (response.Count) ? unmarshall(response.Items![0]) : {}
}
