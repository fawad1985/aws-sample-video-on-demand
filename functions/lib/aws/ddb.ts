import { 
  DynamoDBClient, 
  PutItemCommand, 
  PutItemCommandInput, 
  PutItemCommandOutput,
  QueryCommand, 
  QueryCommandInput,
  QueryCommandOutput, 
  GetItemCommand, 
  GetItemCommandInput, 
  GetItemCommandOutput,
  UpdateItemCommand, 
  UpdateItemCommandInput, 
  UpdateItemCommandOutput, 
  DeleteItemCommandInput, 
  DeleteItemCommand, 
  DeleteItemCommandOutput,
  TransactWriteItemsCommand, 
  TransactWriteItemsCommandInput, 
  TransactWriteItemsCommandOutput,
} from "@aws-sdk/client-dynamodb"

const client = new DynamoDBClient({})

export async function putItem(item: PutItemCommandInput) {
  console.log('ddb::putItem', JSON.stringify(item, null, 2))
  let command = new PutItemCommand(item)
  const response: PutItemCommandOutput = await client.send(command)
  return response
}

export async function queryItems(queryInput: QueryCommandInput) {
  console.log('ddb::queryItems', JSON.stringify(queryInput, null, 2))
  const command = new QueryCommand(queryInput)
  const response: QueryCommandOutput = await client.send(command)
  return response
}

export async function getItem(getItemInput: GetItemCommandInput) {
  console.log('ddb::getItem', JSON.stringify(getItemInput, null, 2))
  const command = new GetItemCommand(getItemInput)
  const response: GetItemCommandOutput = await client.send(command)
  return response
}

export async function updateItem(updateItemInput: UpdateItemCommandInput) {
  console.log('ddb::updateItem', JSON.stringify(updateItemInput, null, 2))
  const command = new UpdateItemCommand(updateItemInput)
  const response: UpdateItemCommandOutput = await client.send(command)
  return response
}

export async function deleteItem(deleteItemInput: DeleteItemCommandInput) {
  console.log('ddb::deleteItem', JSON.stringify(deleteItemInput, null, 2))
  const command = new DeleteItemCommand(deleteItemInput)
  const response: DeleteItemCommandOutput = await client.send(command)
  return response
}

export async function transactWriteItems(input: TransactWriteItemsCommandInput) {
  console.log('ddb::transactWriteItems', JSON.stringify(input, null, 2))
  const command = new TransactWriteItemsCommand(input)
  const response: TransactWriteItemsCommandOutput = await client.send(command)
  return response
}

