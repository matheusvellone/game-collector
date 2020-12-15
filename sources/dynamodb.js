import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()

export const getRowsForUser = async (username) => {
  const results = await dynamodb.query({
    TableName: 'game-bot',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': username,
    },
  }).promise()

  return results.Items
}
