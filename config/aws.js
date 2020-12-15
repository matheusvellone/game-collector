import aws from 'aws-sdk'

const {
  AWS_REGION_GAME_COLLECTOR,
  AWS_ACCESS_KEY_ID_GAME_COLLECTOR,
  AWS_SECRET_ACCESS_KEY_GAME_COLLECTOR,
} = process.env

aws.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID_GAME_COLLECTOR,
  secretAccessKey: AWS_SECRET_ACCESS_KEY_GAME_COLLECTOR,
  region: AWS_REGION_GAME_COLLECTOR,
})