import { Aws, Duration, RemovalPolicy, Stack, StackProps, CfnOutput} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import { LogGroup, RetentionDays, ResourcePolicy } from 'aws-cdk-lib/aws-logs'
import * as path from 'path'

interface SampleVideoOnDemandStackProps extends StackProps {
  stage: string
  prefix: string
  randomString: string
}

export class SampleVideoOnDemandStack extends Stack {
  // public readonly inputBucketName
  constructor(scope: Construct, id: string, props: SampleVideoOnDemandStackProps) {

    super(scope, id, props);

    /**
     * S3 Input Bucket
     * This bucket acts as input to AWS Elemental Media Convert
     */
    const inputBucket = new s3.Bucket(this, `${props.prefix}-transcode-input-${props.stage}-${props.randomString}`, {
      bucketName: `${props.prefix}-transcode-input-${props.stage}-${props.randomString}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        exposedHeaders: ["x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2", "ETag"]
      }],
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    })

    
    new CfnOutput(this, `${inputBucket}`, {
      description: "S3 bucket that acts as input to AWS Elemental Media Convert.",
      value: `${inputBucket}`,      
    })


    /**
     * S3 Output Bucket
     * Bucket where AWS Elemental Media Convert writes encoded output and create a playlist
     */
    const outputBucket = new s3.Bucket(this, `${props.prefix}-transcode-output-${props.stage}-${props.randomString}`, {
      bucketName: `${props.prefix}-transcode-output-${props.stage}-${props.randomString}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        exposedHeaders: ["x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2", "ETag"]
      }],
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    })

    
    new CfnOutput(this, `${outputBucket}`, {
      description: "S3 bucket that acts as output for AWS Elemental Media Convert.",
      value: `${outputBucket}`,      
    })


    /**
     * SNS Topic 
     * This topic gets triggered whenever there is a new file in input S3 bucket
     */
    const snsTopic = new sns.Topic(this, `${props.prefix}-transcode-topic-${props.stage}`, {
      topicName: `${props.prefix}-transcode-topic-${props.stage}`,
      displayName: `${props.prefix}-transcode-topic-${props.stage}`,
    })

    /**
     * Add Bucket Notification
     */
    inputBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(snsTopic), { suffix: '.mp4' })
    inputBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(snsTopic), { suffix: '.h264' })


    /**
     * Common λ Function
     * This λ Function will subscribe to SNS topic which means it will get triggered everytime we have a message on SNS topic
     */
    new LogGroup(this, `${props.prefix}-transcode-req-log-grp-${props.stage}`, {
      logGroupName: `/aws/lambda/${props.prefix}-transcode-request-${props.stage}`,
      retention: RetentionDays.ONE_YEAR,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const snsSubscribeLambdaFn = new NodejsFunction(this, `${props.prefix}-transcode-request-${props.stage}`, {
      functionName: `${props.prefix}-transcode-request-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(29),
      memorySize: 512,
      handler: 'handler',
      environment: {
        STAGE: props.stage
      },
      entry: path.join(__dirname, '/../functions/request.ts'),
    })

    // Lambda Function SNS Subscription
    snsTopic.addSubscription( new subs.LambdaSubscription(snsSubscribeLambdaFn) )


  }
}
