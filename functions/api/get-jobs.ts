import * as ddb from '../lib/aws/ddb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

export default async function (event: any) {
	const response = await ddb.queryItems({
		TableName: process.env.JOBS_TABLE_NAME!,
		KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: marshall({
      ':pk' : `JOBS`,
      ':sk' : `JOB#`
    }),
		Select: "ALL_ATTRIBUTES",
	})
  
	return {
		jobs: response.Items!.map(item => unmarshall(item))
	}
}
  